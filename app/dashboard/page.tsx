'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'
import { startLocationTracking, type Floor, type LiveLocation } from '@/lib/location/tracker'
import { LocationPermission } from '@/components/LocationPermission'
import { can } from '@/lib/permissions/can'
import { calculateEvacuationRoute, buildDirectionText, type RouteNode, type HazardPosition } from '@/lib/emergency/routing'
import { dispatchResponder, updateIncidentStatus, getAvailableResponders } from '@/lib/emergency/dispatch'
import { cacheFloorPlan } from '@/lib/offline/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserLocationRow {
  user_id: string
  floor_id: string | null
  x_percent: number | null
  y_percent: number | null
  source: string | null
  accuracy_meters: number | null
  updated_at: string
}

interface Incident {
  id: string
  title: string
  incident_type: string
  status: string
  severity: number
  created_at: string
}

interface SOSEvent {
  id: string
  user_id: string
  status: string
}

interface HazardMarker {
  id: string
  floor_id: string
  coord_x: number | null
  coord_y: number | null
  hazard_type: string
  is_active: boolean
  x_percent: number | null
  y_percent: number | null
  marker_type: string | null
  confirmed_by: string[] | null
  resolved_at: string | null
  created_at: string | null
  created_by: string | null
}

interface QRNode {
  id: string
  floor_id: string | null
  node_type: string
  x_percent: number | null
  y_percent: number | null
  coord_x: number | null
  coord_y: number | null
  emergency_priority: number
  label: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOT_COLORS: Record<string, string> = {
  self: '#16a34a',
  facility_manager: '#ea580c',
  platform_admin: '#ea580c',
  resident: '#2563eb',
  sos: '#dc2626',
}

function severityLabel(s: number) {
  return ['', 'Critical', 'High', 'Medium', 'Low', 'Info'][s] ?? 'Unknown'
}

function hazardIcon(type: string) {
  const map: Record<string, string> = {
    fire: '🔥', flood: '💧', gas_leak: '☁️', structural: '⚠️',
    medical: '🏥', chemical: '☢️', electrical: '⚡',
    smoke: '💨', blocked_exit: '🚫', threat: '🚨', other: '⚠️',
  }
  return map[type] ?? '⚠️'
}

function hazardColor(type: string | null): string {
  const map: Record<string, string> = {
    fire: '#dc2626',
    smoke: '#ea580c',
    blocked_exit: '#2563eb',
    threat: '#7c3aed',
    other: '#6b7280',
  }
  return map[type ?? ''] ?? '#6b7280'
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Component ────────────────────────────────────────────────────────────────

const PULSE_STYLE = `
  @keyframes loc-pulse {
    0%   { transform: scale(1); opacity: 0.6; }
    70%  { transform: scale(2.8); opacity: 0; }
    100% { transform: scale(2.8); opacity: 0; }
  }
  .user-dot-self::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: #16a34a;
    animation: loc-pulse 2s ease-out infinite;
    z-index: -1;
  }
  @keyframes sos-ring-pulse {
    0%   { transform: scale(1); opacity: 0.9; }
    70%  { transform: scale(1.7); opacity: 0; }
    100% { transform: scale(1.7); opacity: 0; }
  }
  .floor-plan-root { margin: -2rem; display: flex; min-height: calc(100vh - 56px); }
  @media (max-width: 768px) { .floor-plan-root { margin: -1.25rem; flex-direction: column; } }
  .floor-plan-left { flex: 0 0 70%; min-width: 0; display: flex; flex-direction: column; border-right: 1px solid var(--border); }
  @media (max-width: 768px) { .floor-plan-left { flex: none; min-height: 55vh; border-right: none; border-bottom: 1px solid var(--border); } }
  .floor-plan-right { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
  @media (max-width: 768px) { .floor-plan-right { padding: 1rem; } }
`

export default function DashboardPage() {
  const { session, jwtClaims } = useAuth()

  const userId  = session?.user?.id ?? ''
  const role    = jwtClaims?.app_metadata?.platform_role ?? jwtClaims?.platform_role ?? 'resident'
  const isManager = role === 'facility_manager' || role === 'platform_admin'
  const facilityIds: string[] = jwtClaims?.app_metadata?.active_facility_ids ?? jwtClaims?.active_facility_ids ?? []
  const facilityId = facilityIds[0] ?? null

  // ── State ──
  const [floors, setFloors] = useState<Floor[]>([])
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null)
  const [userLocations, setUserLocations] = useState<UserLocationRow[]>([])
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({})
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [sosEvents, setSosEvents] = useState<SOSEvent[]>([])
  const [hazards, setHazards] = useState<HazardMarker[]>([])
  const [exitNodes, setExitNodes] = useState<QRNode[]>([])
  const [evacuationRoute, setEvacuationRoute] = useState<import('@/lib/emergency/routing').EvacuationRoute | null>(null)
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null)
  const [gpsCalibrated, setGpsCalibrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [placingMarker, setPlacingMarker] = useState(false)
  const [pendingMarkerPos, setPendingMarkerPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedMarkerType, setSelectedMarkerType] = useState<string>('other')
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [responders, setResponders] = useState<{user_id: string, role: string, unit_number: string | null}[]>([])
  const [selectedSOS, setSelectedSOS] = useState<string | null>(null)
  const [dispatchError, setDispatchError] = useState<string | null>(null)
  const [dispatching, setDispatching] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)
  const [copyingBrief, setCopyingBrief] = useState(false)
  const [briefCopied, setBriefCopied] = useState(false)
  const [briefError, setBriefError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [cachedAt, setCachedAt] = useState<number | null>(null)

  const cleanupRef = useRef<(() => void) | null>(null)
  const mapAreaRef = useRef<HTMLDivElement>(null)

  // ── Auto-fade timer — re-render every 60s so isOld threshold triggers ──
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Online / offline tracking ──
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    setIsOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // ── Initial data load ──
  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    const sb = getSupabaseClient()

    Promise.all([
      sb.schema('facility').from('floors')
        .select('id,facility_id,level,name,floor_plan_url,image_url,floor_plan_width,floor_plan_height,geo_lat_min,geo_lat_max,geo_lng_min,geo_lng_max,building_name,level_number,level_label')
        .eq('facility_id', facilityId).order('level', { ascending: true }),
      (sb as any).from('user_locations').select('user_id,floor_id,x_percent,y_percent,source,accuracy_meters,updated_at')
        .eq('facility_id', facilityId),
      sb.schema('facility').from('members')
        .select('user_id,role').eq('facility_id', facilityId),
      sb.schema('emergency').from('incidents')
        .select('id,title,incident_type,status,severity,created_at')
        .eq('facility_id', facilityId).eq('status', 'active'),
      sb.schema('emergency').from('sos_events')
        .select('id,user_id,status').eq('facility_id', facilityId)
        .in('status', ['pending', 'acknowledged']),
      sb.schema('emergency').from('hazard_markers')
        .select('id,floor_id,coord_x,coord_y,hazard_type,is_active,x_percent,y_percent,marker_type,confirmed_by,resolved_at,created_at,created_by')
        .eq('facility_id', facilityId).eq('is_active', true),
      sb.schema('qr').from('nodes')
        .select('id,floor_id,node_type,x_percent,y_percent,coord_x,coord_y,emergency_priority,label')
        .eq('facility_id', facilityId).eq('is_active', true),
    ]).then(([floorsRes, locsRes, membersRes, incidentsRes, sosRes, hazardsRes, exitRes]) => {
      const floorsData = (floorsRes.data ?? []) as Floor[]
      setFloors(floorsData)
      if (floorsData.length > 0) setActiveFloorId(floorsData[0].id)
      setUserLocations((locsRes.data ?? []) as UserLocationRow[])
      const roles: Record<string, string> = {}
      for (const m of (membersRes.data ?? [])) roles[(m as any).user_id] = (m as any).role
      setMemberRoles(roles)
      setIncidents((incidentsRes.data ?? []) as Incident[])
      setSosEvents((sosRes.data ?? []) as SOSEvent[])
      setHazards((hazardsRes.data ?? []) as HazardMarker[])
      setExitNodes((exitRes.data ?? []) as QRNode[])
      setLoading(false)
      if (isManager && facilityId) {
        getAvailableResponders(facilityId).then(({ data }) => setResponders(data ?? []))
      }
      // ── Cache floor plan data for offline fallback ──
      if (facilityId) {
        const now = Date.now()
        floorsData.forEach(f => {
          if (f.image_url || f.floor_plan_url) {
            cacheFloorPlan({
              floorId: f.id,
              facilityId,
              imageUrl: f.image_url ?? f.floor_plan_url ?? null,
              nodes: exitRes.data ?? [],
              hazardMarkers: hazardsRes.data ?? [],
              cachedAt: now,
            })
          }
        })
        setCachedAt(now)
      }
    })
  }, [facilityId])

  // ── Switch to floor that matches GPS when floors load ──
  useEffect(() => {
    if (!liveLocation?.floor || floors.length === 0) return
    setActiveFloorId(liveLocation.floor.id)
  }, [liveLocation?.floor?.id])

  // ── Location tracking ──
  const startTracking = useCallback(() => {
    if (!facilityId || !userId || floors.length === 0) return
    cleanupRef.current?.()
    cleanupRef.current = startLocationTracking(
      facilityId, userId, floors,
      (loc) => {
        setLiveLocation(loc)
        setGpsCalibrated(
          loc.floor !== null && loc.x_percent !== null && loc.y_percent !== null
        )
      }
    )
  }, [facilityId, userId, floors])

  useEffect(() => {
    if (floors.length > 0) startTracking()
    return () => { cleanupRef.current?.() }
  }, [startTracking])

  // ── Realtime subscriptions ──
  useEffect(() => {
    if (!facilityId) return
    const sb = getSupabaseClient()

    const channel = sb.channel(`floor-plan-${facilityId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_locations',
        filter: `facility_id=eq.${facilityId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setUserLocations(prev => prev.filter(l => l.user_id !== (payload.old as any).user_id))
        } else {
          const row = payload.new as UserLocationRow
          setUserLocations(prev => {
            const idx = prev.findIndex(l => l.user_id === row.user_id)
            if (idx === -1) return [...prev, row]
            const next = [...prev]; next[idx] = row; return next
          })
        }
      })
      .on('postgres_changes', {
        event: '*', schema: 'emergency', table: 'hazard_markers',
        filter: `facility_id=eq.${facilityId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setHazards(prev => prev.filter(h => h.id !== (payload.old as any).id))
        } else {
          const row = payload.new as HazardMarker
          setHazards(prev => {
            const idx = prev.findIndex(h => h.id === row.id)
            if (idx === -1) return row.is_active ? [...prev, row] : prev
            if (!row.is_active) return prev.filter(h => h.id !== row.id)
            const next = [...prev]; next[idx] = row; return next
          })
        }
      })
      .on('postgres_changes', {
        event: '*', schema: 'emergency', table: 'incidents',
        filter: `facility_id=eq.${facilityId}`,
      }, (payload) => {
        const row = payload.new as Incident
        setIncidents(prev => {
          if (payload.eventType === 'DELETE' || row.status !== 'active') {
            return prev.filter(i => i.id !== row.id)
          }
          const idx = prev.findIndex(i => i.id === row.id)
          if (idx === -1) return [...prev, row]
          const next = [...prev]; next[idx] = row; return next
        })
      })
      .on('postgres_changes', {
        event: '*', schema: 'emergency', table: 'sos_events',
        filter: `facility_id=eq.${facilityId}`,
      }, (payload) => {
        const row = payload.new as SOSEvent
        setSosEvents(prev => {
          const active = ['pending', 'acknowledged']
          if (payload.eventType === 'DELETE' || !active.includes(row.status)) {
            return prev.filter(s => s.id !== row.id)
          }
          const idx = prev.findIndex(s => s.id === row.id)
          if (idx === -1) return [...prev, row]
          const next = [...prev]; next[idx] = row; return next
        })
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [facilityId])

  // ── Derived state ──
  const activeFloor = floors.find(f => f.id === activeFloorId) ?? null
  const activeIncident = incidents[0] ?? null
  const sosUserIds = new Set(sosEvents.map(s => s.user_id))

  const usersOnFloor = (isManager
    ? userLocations.filter(l => l.floor_id === activeFloorId)
    : userLocations.filter(l => l.user_id === userId && l.floor_id === activeFloorId)
  ).filter(l => l.x_percent !== null && l.y_percent !== null)

  const hazardsOnFloor = hazards.filter(h => h.floor_id === activeFloorId)

  const selfLoc = userLocations.find(l => l.user_id === userId)

  const peopleOnFloor = usersOnFloor.length

  // ── Evacuation route calculation ──
  const recalculateRoute = useCallback(() => {
    if (!activeIncident || !selfLoc?.x_percent || !selfLoc?.y_percent || !activeFloorId) {
      setEvacuationRoute(null)
      return
    }
    const userPosition = { x_percent: selfLoc.x_percent, y_percent: selfLoc.y_percent }
    const nodesOnFloor: RouteNode[] = exitNodes
      .filter(n => n.floor_id === activeFloorId && n.x_percent != null && n.y_percent != null)
      .map(n => ({ id: n.id, label: n.label, node_type: n.node_type, x_percent: n.x_percent!, y_percent: n.y_percent! }))
    const hazardPositions: HazardPosition[] = hazards
      .filter(h => h.floor_id === activeFloorId && h.x_percent != null && h.y_percent != null)
      .map(h => ({ id: h.id, x_percent: h.x_percent!, y_percent: h.y_percent! }))
    setEvacuationRoute(calculateEvacuationRoute(userPosition, nodesOnFloor, hazardPositions))
  }, [activeIncident, selfLoc, activeFloorId, exitNodes, hazards, setEvacuationRoute])

  useEffect(() => { recalculateRoute() }, [recalculateRoute])

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!placingMarker) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100 * 10) / 10
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100 * 10) / 10
    setPendingMarkerPos({ x, y })
    setPlacingMarker(false)
  }

  const VALID_MARKER_TYPES = ['fire', 'smoke', 'blocked_exit', 'threat', 'other'] as const

  async function submitHazardMarker() {
    if (!pendingMarkerPos || !facilityId || !activeFloorId || !userId) return
    if (!VALID_MARKER_TYPES.includes(selectedMarkerType as any)) return
    if (submitting) return
    setSubmitting(true)
    const sb = getSupabaseClient()
    try {
      await sb.schema('emergency').from('hazard_markers').insert({
        facility_id: facilityId,
        floor_id: activeFloorId,
        marker_type: selectedMarkerType,
        hazard_type: selectedMarkerType,
        x_percent: pendingMarkerPos.x,
        y_percent: pendingMarkerPos.y,
        created_by: userId,
        placed_by: userId,
        user_id: userId,
        is_active: true,
      })
      setPendingMarkerPos(null)
      setSelectedMarkerType('other')
    } finally {
      setSubmitting(false)
    }
  }

  async function dismissHazard(hazardId: string) {
    const sb = getSupabaseClient()
    try {
      await sb.schema('emergency').from('hazard_markers')
        .update({ is_active: false, resolved_at: new Date().toISOString() })
        .eq('id', hazardId)
    } catch (err) {
      console.error('Failed to dismiss hazard:', err)
    }
  }

  async function handleDispatch(responderId: string) {
    if (!selectedSOS || !facilityId) return
    if (!activeIncident) return
    const incident = activeIncident
    setDispatching(true)
    setDispatchError(null)
    const { error } = await dispatchResponder(incident.id, responderId, facilityId)
    setDispatching(false)
    if (error) { setDispatchError(error as string); return }
    setSelectedSOS(null)
  }

  async function handleCopyBrief() {
    if (!activeIncident || !facilityId) return
    setCopyingBrief(true)
    setBriefError(null)
    setBriefCopied(false)
    try {
      const sb = getSupabaseClient()
      const { data, error } = await (sb as any).functions.invoke('notify-emergency', {
        body: { incidentId: activeIncident.id, facilityId },
      })
      if (error) throw error
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.brief)
      } else {
        const el = document.createElement('textarea')
        el.value = data.brief
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setBriefCopied(true)
      setTimeout(() => setBriefCopied(false), 3000)
    } catch (err: any) {
      setBriefError(err?.message ?? 'Failed to generate brief')
    } finally {
      setCopyingBrief(false)
    }
  }

  async function handleStatusChange(incidentId: string, status: 'investigating' | 'contained' | 'resolved') {
    setStatusUpdating(incidentId)
    try {
      await updateIncidentStatus(incidentId, status)
    } catch (err) {
      console.error('Failed to update incident status:', err)
    } finally {
      setStatusUpdating(null)
    }
  }

  async function confirmHazard(hazardId: string) {
    if (!userId) return
    const sb = getSupabaseClient()
    try {
      const { data: current } = await (sb as any).schema('emergency').from('hazard_markers')
        .select('confirmed_by').eq('id', hazardId).single()
      const existing: string[] = current?.confirmed_by ?? []
      if (existing.includes(userId)) return // already confirmed
      await (sb as any).schema('emergency').from('hazard_markers')
        .update({ confirmed_by: [...existing, userId] })
        .eq('id', hazardId)
    } catch (err) {
      console.error('Failed to confirm hazard:', err)
    }
  }

  // ── No facility state ──
  if (!loading && !facilityId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Floor Plan</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No facility enrolled</p>
        </div>
        <div className="placeholder-section">
          <h3>No facility assigned</h3>
          <p>You are not enrolled in any facility. Contact your building manager to be added.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="center"><div className="spinner" /></div>
  }

  const floorImageUrl = activeFloor?.image_url ?? activeFloor?.floor_plan_url ?? null

  return (
    <>
      <style>{PULSE_STYLE}</style>
      <LocationPermission onGranted={startTracking} />

      <div className="floor-plan-root">

        {/* ── LEFT: Floor plan ── */}
        <div className="floor-plan-left">

          {/* Floor tabs */}
          {floors.length > 1 && (
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
              {floors.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFloorId(f.id)}
                  style={{
                    padding: '0.6rem 1rem', border: 'none', borderBottom: '2px solid',
                    borderBottomColor: f.id === activeFloorId ? 'var(--primary)' : 'transparent',
                    background: 'none', cursor: 'pointer',
                    fontWeight: f.id === activeFloorId ? 600 : 400,
                    fontSize: '0.875rem', color: 'var(--fg)', whiteSpace: 'nowrap',
                  }}
                >
                  {f.level_label ?? f.name}
                </button>
              ))}
            </div>
          )}

          {/* Offline banner */}
          {!isOnline && (
            <div style={{
              background: '#fef3c7', borderBottom: '1px solid #f59e0b',
              padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#92400e',
              display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0,
            }}>
              ⚠️ Offline — showing last known floor plan
              {cachedAt && ` (cached ${Math.round((Date.now() - cachedAt) / 60000)}m ago)`}
            </div>
          )}

          {/* Map area */}
          <div
            ref={mapAreaRef}
            onClick={handleMapClick}
            style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#f3f4f6', cursor: placingMarker ? 'crosshair' : undefined }}
          >

            {/* Floor plan image or grid placeholder */}
            {floorImageUrl ? (
              <img
                src={floorImageUrl}
                alt={`${activeFloor?.name ?? 'Floor'} plan`}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
                backgroundSize: '48px 48px',
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                  textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
                  <div>No floor plan uploaded</div>
                  {isManager && (
                    <a href="/admin/floorplan" style={{ color: 'var(--primary)', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>
                      Upload floor plan →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* SVG overlay for routes and hazard icons */}
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Evacuation route — dashed polyline via calculated waypoints */}
              {activeIncident && evacuationRoute && selfLoc?.x_percent != null && selfLoc?.y_percent != null && (() => {
                const points = [
                  { x: selfLoc.x_percent!, y: selfLoc.y_percent! },
                  ...evacuationRoute.waypoints.map(w => ({ x: w.x_percent, y: w.y_percent }))
                ]
                const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ')
                return (
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke={evacuationRoute.blocked ? '#f59e0b' : '#16a34a'}
                    strokeWidth="0.8"
                    strokeDasharray="3 2"
                    strokeLinecap="round"
                  />
                )
              })()}
            </svg>

            {/* User dots — positioned by percentage */}
            {usersOnFloor.map(loc => {
              const isSelf = loc.user_id === userId
              const hasSOS = sosUserIds.has(loc.user_id)
              const memberRole = memberRoles[loc.user_id] ?? 'resident'
              const color = isSelf ? DOT_COLORS.self : hasSOS ? DOT_COLORS.sos : DOT_COLORS[memberRole] ?? DOT_COLORS.resident
              const sosForUser = sosEvents.find(s => s.user_id === loc.user_id)
              const isClickable = isManager && !!sosForUser
              return (
                <div
                  key={loc.user_id}
                  title={isSelf ? 'You' : memberRole.replaceAll('_', ' ')}
                  onClick={isClickable ? () => setSelectedSOS(sosForUser!.id) : undefined}
                  style={{
                    position: 'absolute',
                    left: `${loc.x_percent}%`,
                    top: `${loc.y_percent}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isSelf ? 20 : hasSOS ? 15 : 10,
                    cursor: isClickable ? 'pointer' : 'default',
                  }}
                >
                  {/* Pulsing ring for SOS users (manager view) */}
                  {isManager && hasSOS && (
                    <div style={{
                      position: 'absolute',
                      inset: '-8px',
                      borderRadius: '50%',
                      border: '2px solid #dc2626',
                      animation: 'sos-ring-pulse 1.4s ease-out infinite',
                      pointerEvents: 'none',
                    }} />
                  )}
                  <div
                    className={isSelf ? 'user-dot-self' : undefined}
                    style={{
                      width: isSelf ? '14px' : '11px',
                      height: isSelf ? '14px' : '11px',
                      borderRadius: '50%',
                      background: color,
                      border: '2px solid #fff',
                      boxShadow: hasSOS ? `0 0 0 3px ${color}40` : '0 1px 3px rgba(0,0,0,0.3)',
                      position: 'relative',
                    }}
                  />
                  {/* Name label for manager SOS view */}
                  {isManager && hasSOS && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: '3px',
                      background: 'rgba(220,38,38,0.9)',
                      color: '#fff',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      borderRadius: '3px',
                      padding: '1px 4px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                    }}>
                      {loc.user_id.slice(0, 8)}
                    </div>
                  )}
                </div>
              )
            })}

            {/* GPS not calibrated indicator for self */}
            {selfLoc && (selfLoc.x_percent == null || selfLoc.y_percent == null) && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                zIndex: 15,
              }}>
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: '#9ca3af', border: '2px solid #fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} title="GPS not calibrated" />
              </div>
            )}

            {/* Hazard markers */}
            {hazardsOnFloor.map(h => {
              const px = h.x_percent ?? (h.coord_x && activeFloor?.floor_plan_width ? (h.coord_x / activeFloor.floor_plan_width) * 100 : null)
              const py = h.y_percent ?? (h.coord_y && activeFloor?.floor_plan_height ? (h.coord_y / activeFloor.floor_plan_height) * 100 : null)
              if (px == null || py == null) return null
              const mtype = h.marker_type ?? h.hazard_type
              const color = hazardColor(mtype)
              const confirmedCount = (h.confirmed_by ?? []).length
              const isConfirmed = confirmedCount >= 2
              const isOld = h.created_at ? (now - new Date(h.created_at).getTime()) > 2 * 60 * 60 * 1000 : false
              const opacity = isOld && !isConfirmed ? 0.4 : 1
              const isOwnMarker = h.created_by === userId
              const canConfirm = !isManager && !isOwnMarker && !(h.confirmed_by ?? []).includes(userId)
              return (
                <div
                  key={h.id}
                  style={{
                    position: 'absolute', left: `${px}%`, top: `${py}%`,
                    transform: 'translate(-50%,-50%)', fontSize: '1.2rem',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))', zIndex: 12,
                    opacity, fontWeight: isConfirmed ? 700 : 400,
                  }}
                  title={mtype}
                >
                  <span style={{ color }}>{hazardIcon(mtype)}</span>
                  {can(jwtClaims, 'RESOLVE_HAZARD') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); dismissHazard(h.id) }}
                      style={{
                        position: 'absolute', top: '-6px', right: '-10px',
                        background: '#dc2626', color: '#fff', border: 'none',
                        borderRadius: '50%', width: '14px', height: '14px',
                        fontSize: '9px', cursor: 'pointer', lineHeight: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0,
                      }}
                      title="Resolve hazard"
                    >×</button>
                  )}
                  {canConfirm && (
                    <button
                      onClick={(e) => { e.stopPropagation(); confirmHazard(h.id) }}
                      style={{
                        position: 'absolute', bottom: '-14px', left: '50%', transform: 'translateX(-50%)',
                        background: '#2563eb', color: '#fff', border: 'none',
                        borderRadius: '8px', padding: '1px 5px',
                        fontSize: '9px', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                      title="Confirm this hazard"
                    >Confirm</button>
                  )}
                </div>
              )
            })}

            {/* Placement mode banner */}
            {placingMarker && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
                background: 'rgba(37,99,235,0.92)', color: '#fff',
                padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>Click on the floor plan to place marker</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setPlacingMarker(false) }}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
                >✕</button>
              </div>
            )}

            {/* Add Marker button — top right of map */}
            {can(jwtClaims, 'ADD_HAZARD_MARKER') && !placingMarker && (
              <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 20 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setPlacingMarker(true); setPendingMarkerPos(null) }}
                  style={{
                    background: 'rgba(0,0,0,0.72)', color: '#fff', border: 'none',
                    borderRadius: '20px', padding: '0.3rem 0.85rem', fontSize: '0.8rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}
                >＋ Add Marker</button>
              </div>
            )}

            {/* Status badges — top of map */}
            <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: '20px',
                padding: '0.25rem 0.7rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}>
                <span style={{ color: '#4ade80', fontSize: '0.6rem' }}>●</span>
                Live · {peopleOnFloor} {peopleOnFloor === 1 ? 'person' : 'people'} on this floor
              </span>
              {!gpsCalibrated && (
                <span style={{
                  background: 'rgba(217,119,6,0.85)', color: '#fff', borderRadius: '20px',
                  padding: '0.25rem 0.7rem', fontSize: '0.75rem',
                }}>
                  GPS not calibrated
                </span>
              )}
            </div>

            {/* Emergency banner */}
            {activeIncident && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(220,38,38,0.92)', color: '#fff',
                padding: '0.6rem 1rem', fontSize: '0.875rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <span>🆘</span>
                <span>{activeIncident.title}</span>
                <span style={{ fontWeight: 400, opacity: 0.85, marginLeft: '0.5rem' }}>
                  — {severityLabel(activeIncident.severity)} severity
                  {evacuationRoute ? ` · ${evacuationRoute.message ?? 'Follow green route to exit'}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{
            padding: '0.6rem 1rem', borderTop: '1px solid var(--border)',
            display: 'flex', gap: '1.25rem', fontSize: '0.75rem', color: 'var(--muted)',
            flexShrink: 0, flexWrap: 'wrap',
          }}>
            {[
              { label: 'You', color: DOT_COLORS.self },
              { label: 'Resident', color: DOT_COLORS.resident },
              { label: 'Manager', color: DOT_COLORS.facility_manager },
              { label: 'SOS', color: DOT_COLORS.sos },
            ].map(l => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Incident feed + people list ── */}
        <div className="floor-plan-right">

          {/* Inline add-marker panel */}
          {pendingMarkerPos && (
            <div style={{
              border: '1px solid var(--border)', borderRadius: '8px',
              padding: '1rem', background: 'var(--card-bg, #fff)',
              display: 'flex', flexDirection: 'column', gap: '0.75rem',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Place Hazard Marker</div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {([
                  { label: 'Fire', value: 'fire' },
                  { label: 'Smoke', value: 'smoke' },
                  { label: 'Blocked Exit', value: 'blocked_exit' },
                  { label: 'Threat', value: 'threat' },
                  { label: 'Other', value: 'other' },
                ] as { label: string; value: string }[]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedMarkerType(opt.value)}
                    style={{
                      padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem',
                      border: `2px solid ${hazardColor(opt.value)}`,
                      background: selectedMarkerType === opt.value ? hazardColor(opt.value) : 'transparent',
                      color: selectedMarkerType === opt.value ? '#fff' : hazardColor(opt.value),
                      cursor: 'pointer', fontWeight: selectedMarkerType === opt.value ? 600 : 400,
                    }}
                  >{opt.label}</button>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                Placing at {pendingMarkerPos.x}%, {pendingMarkerPos.y}%
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={submitHazardMarker}
                  disabled={submitting}
                  style={{
                    flex: 1, padding: '0.45rem', borderRadius: '6px', border: 'none',
                    background: 'var(--primary)', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem', fontWeight: 600, opacity: submitting ? 0.6 : 1,
                  }}
                >{submitting ? 'Submitting…' : 'Submit'}</button>
                <button
                  onClick={() => { setPendingMarkerPos(null); setSelectedMarkerType('other') }}
                  style={{
                    padding: '0.45rem 0.9rem', borderRadius: '6px',
                    border: '1px solid var(--border)', background: 'none',
                    cursor: 'pointer', fontSize: '0.8rem',
                  }}
                >Cancel</button>
              </div>
            </div>
          )}

          {/* Dispatch panel — shown when manager clicks an SOS dot */}
          {can(jwtClaims, 'VIEW_RESPONDER_PANEL') && selectedSOS && (() => {
            const sos = sosEvents.find(s => s.id === selectedSOS)
            return (
              <div style={{
                border: '1px solid #dc2626', borderRadius: '8px',
                padding: '0.75rem 1rem', background: 'rgba(220,38,38,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#dc2626' }}>Dispatch Responder</span>
                  <button
                    onClick={() => setSelectedSOS(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)', lineHeight: 1 }}
                  >×</button>
                </div>
                {sos && (
                  <div style={{ fontSize: '0.8rem', marginBottom: '0.6rem' }}>
                    <div>SOS from user <span style={{ fontFamily: 'monospace' }}>{sos.user_id.slice(0, 8)}</span></div>
                    <div style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>Status: {sos.status}</div>
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Available responders
                </div>
                {responders.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No responders available</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {responders.map(r => (
                      <div key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>{r.user_id.slice(0, 8)}</span>
                        <span style={{ flex: 1, textTransform: 'capitalize', color: 'var(--muted)' }}>
                          {r.role.replaceAll('_', ' ')}{r.unit_number ? ` · ${r.unit_number}` : ''}
                        </span>
                        <button
                          disabled={dispatching}
                          onClick={() => handleDispatch(r.user_id)}
                          style={{
                            padding: '0.2rem 0.6rem', borderRadius: '4px',
                            border: '1px solid #2563eb', background: 'none',
                            color: '#2563eb', cursor: dispatching ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem', opacity: dispatching ? 0.6 : 1,
                          }}
                        >Assign</button>
                      </div>
                    ))}
                  </div>
                )}
                {dispatchError && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#dc2626' }}>{dispatchError}</div>
                )}
              </div>
            )
          })()}

          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Feed
          </div>

          {/* SOS alerts */}
          {sosEvents.length > 0 && (
            <div>
              {sosEvents.map(s => (
                <div key={s.id} className="alert alert-danger" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🆘</span>
                  <span>SOS active — user needs help</span>
                </div>
              ))}
            </div>
          )}

          {/* Active incidents */}
          {incidents.length === 0 ? (
            <div style={{
              padding: '1.5rem', textAlign: 'center', color: 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.875rem',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✅</div>
              All clear — no active incidents
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {incidents.map(inc => (
                <div key={inc.id} className="card" style={{ borderLeft: '4px solid var(--danger)', padding: '0.75rem 1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{inc.title}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>{severityLabel(inc.severity)}</span>
                    <span className="badge badge-gray" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>{inc.incident_type.replaceAll('_', ' ')}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                    {new Date(inc.created_at).toLocaleTimeString()}
                  </div>
                  {can(jwtClaims, 'UPDATE_INCIDENT_STATUS') && (
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                      {(['investigating', 'contained', 'resolved'] as const).map(s => (
                        <button
                          key={s}
                          disabled={statusUpdating === inc.id}
                          onClick={() => handleStatusChange(inc.id, s)}
                          style={{
                            padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem',
                            border: `1px solid ${inc.status === s ? '#2563eb' : 'var(--border)'}`,
                            background: inc.status === s ? '#2563eb' : 'none',
                            color: inc.status === s ? '#fff' : 'var(--muted)',
                            cursor: (inc.status === s || statusUpdating === inc.id) ? 'default' : 'pointer',
                            textTransform: 'capitalize',
                            opacity: statusUpdating === inc.id ? 0.6 : 1,
                          }}
                        >{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 000 Emergency Services */}
          {activeIncident && can(jwtClaims, 'UPDATE_INCIDENT_STATUS') && (
            <div style={{ padding: '0.75rem 1rem', border: '2px solid #dc2626', borderRadius: '8px', background: '#fef2f2' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#dc2626', marginBottom: '0.6rem' }}>
                🚨 Emergency Services
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* One-tap 000 call */}
                <a
                  href="tel:000"
                  style={{
                    display: 'block', padding: '0.6rem 1rem', background: '#dc2626',
                    color: '#fff', borderRadius: '6px', textAlign: 'center',
                    fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                  }}
                >
                  📞 Call 000 Now
                </a>
                {/* Copy incident brief */}
                <button
                  onClick={() => handleCopyBrief()}
                  disabled={copyingBrief}
                  style={{
                    padding: '0.5rem 1rem', background: copyingBrief ? '#f3f4f6' : '#fff',
                    border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600,
                  }}
                >
                  {copyingBrief ? 'Generating brief…' : briefCopied ? '✅ Brief copied!' : '📋 Copy incident brief'}
                </button>
                {briefError && <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>{briefError}</div>}
              </div>
            </div>
          )}

          {/* Active Hazards section */}
          {hazardsOnFloor.length > 0 && (
            <>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>
                Active Hazards ({hazardsOnFloor.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {hazardsOnFloor.map(h => {
                  const mtype = h.marker_type ?? h.hazard_type
                  const color = hazardColor(mtype)
                  const confirmedCount = (h.confirmed_by ?? []).length
                  const isConfirmed = confirmedCount >= 2
                  const isOld = h.created_at ? (now - new Date(h.created_at).getTime()) > 2 * 60 * 60 * 1000 : false
                  const dimmed = isOld && !isConfirmed
                  const floorName = floors.find(f => f.id === h.floor_id)?.level_label ?? 'Unknown floor'
                  const canConfirmSidebar = !isManager && h.created_by !== userId && !(h.confirmed_by ?? []).includes(userId)
                  return (
                    <div key={h.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.45rem 0.6rem', borderRadius: '6px',
                      border: `1px solid ${color}40`,
                      background: `${color}08`,
                      opacity: dimmed ? 0.4 : 1,
                      fontSize: '0.8rem',
                    }}>
                      <span style={{ color, fontSize: '1rem', flexShrink: 0 }}>{hazardIcon(mtype)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: isConfirmed ? 700 : 400, textTransform: 'capitalize' }}>
                          {mtype.replaceAll('_', ' ')}
                        </div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                          {floorName} · {relativeTime(h.created_at)}
                          {isConfirmed && ' · Confirmed'}
                        </div>
                      </div>
                      {canConfirmSidebar && (
                        <button
                          onClick={() => confirmHazard(h.id)}
                          style={{
                            padding: '0.2rem 0.5rem', borderRadius: '4px', border: `1px solid ${color}`,
                            background: 'none', color, cursor: 'pointer', fontSize: '0.7rem', flexShrink: 0,
                          }}
                        >Confirm</button>
                      )}
                      {can(jwtClaims, 'RESOLVE_HAZARD') && (
                        <button
                          onClick={() => dismissHazard(h.id)}
                          style={{
                            padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #dc2626',
                            background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.7rem', flexShrink: 0,
                          }}
                        >Resolve</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* People on this floor */}
          {isManager && usersOnFloor.length > 0 && (
            <>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>
                On This Floor ({usersOnFloor.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {usersOnFloor.map(loc => {
                  const isSelf = loc.user_id === userId
                  const hasSOS = sosUserIds.has(loc.user_id)
                  const memberRole = memberRoles[loc.user_id] ?? 'resident'
                  const color = isSelf ? DOT_COLORS.self : hasSOS ? DOT_COLORS.sos : DOT_COLORS[memberRole] ?? DOT_COLORS.resident
                  return (
                    <div key={loc.user_id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.4rem 0', fontSize: '0.8rem',
                    }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                        {isSelf ? 'You' : loc.user_id.slice(0, 8) + '…'}
                      </span>
                      {hasSOS && <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>SOS</span>}
                      <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '0.7rem' }}>
                        {loc.source ?? ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Your location status */}
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>Your location</div>
            {liveLocation ? (
              <div style={{ fontSize: '0.8rem' }}>
                <div>{gpsCalibrated ? '✅ GPS active' : '⚠️ GPS not calibrated for this floor'}</div>
                {liveLocation.accuracy && (
                  <div style={{ color: 'var(--muted)', marginTop: '0.2rem' }}>
                    ±{Math.round(liveLocation.accuracy)}m accuracy · {liveLocation.floor?.level_label ?? 'Unknown floor'}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Acquiring GPS…</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
