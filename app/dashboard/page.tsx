'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'
import { startLocationTracking, type Floor, type LiveLocation } from '@/lib/location/tracker'
import { LocationPermission } from '@/components/LocationPermission'

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
  }
  return map[type] ?? '⚠️'
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
  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null)
  const [gpsCalibrated, setGpsCalibrated] = useState(false)
  const [loading, setLoading] = useState(true)

  const cleanupRef = useRef<(() => void) | null>(null)

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
        .select('id,floor_id,coord_x,coord_y,hazard_type,is_active')
        .eq('facility_id', facilityId).eq('is_active', true),
      sb.schema('qr').from('nodes')
        .select('id,floor_id,node_type,x_percent,y_percent,coord_x,coord_y,emergency_priority,label')
        .eq('facility_id', facilityId).lte('emergency_priority', 2).eq('is_active', true),
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

  // Nearest exit node for evacuation route
  const selfLoc = userLocations.find(l => l.user_id === userId)
  const exitNodesOnFloor = exitNodes.filter(n => n.floor_id === activeFloorId)
  let nearestExit: QRNode | null = null
  if (activeIncident && selfLoc?.x_percent != null && selfLoc?.y_percent != null) {
    let minDist = Infinity
    for (const n of exitNodesOnFloor) {
      const nx = n.x_percent ?? (n.coord_x && activeFloor?.floor_plan_width ? (n.coord_x / activeFloor.floor_plan_width) * 100 : null)
      const ny = n.y_percent ?? (n.coord_y && activeFloor?.floor_plan_height ? (n.coord_y / activeFloor.floor_plan_height) * 100 : null)
      if (nx == null || ny == null) continue
      const dx = nx - selfLoc.x_percent!
      const dy = ny - selfLoc.y_percent!
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < minDist) { minDist = d; nearestExit = n }
    }
  }

  const peopleOnFloor = usersOnFloor.length

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

          {/* Map area */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#f3f4f6' }}>

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
              {/* Evacuation route — dashed green line to nearest exit */}
              {activeIncident && nearestExit && selfLoc?.x_percent != null && selfLoc?.y_percent != null && (() => {
                const ex = nearestExit.x_percent ?? (nearestExit.coord_x && activeFloor?.floor_plan_width ? (nearestExit.coord_x / activeFloor.floor_plan_width) * 100 : null)
                const ey = nearestExit.y_percent ?? (nearestExit.coord_y && activeFloor?.floor_plan_height ? (nearestExit.coord_y / activeFloor.floor_plan_height) * 100 : null)
                if (ex == null || ey == null) return null
                return (
                  <line
                    x1={selfLoc.x_percent} y1={selfLoc.y_percent}
                    x2={ex} y2={ey}
                    stroke="#16a34a" strokeWidth="0.8" strokeDasharray="3 2"
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
              return (
                <div
                  key={loc.user_id}
                  title={isSelf ? 'You' : memberRole.replace('_', ' ')}
                  style={{
                    position: 'absolute',
                    left: `${loc.x_percent}%`,
                    top: `${loc.y_percent}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isSelf ? 20 : 10,
                  }}
                >
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
              const px = h.coord_x && activeFloor?.floor_plan_width ? (h.coord_x / activeFloor.floor_plan_width) * 100 : null
              const py = h.coord_y && activeFloor?.floor_plan_height ? (h.coord_y / activeFloor.floor_plan_height) * 100 : null
              if (px == null || py == null) return null
              return (
                <div
                  key={h.id}
                  style={{
                    position: 'absolute', left: `${px}%`, top: `${py}%`,
                    transform: 'translate(-50%,-50%)', fontSize: '1.2rem',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))', zIndex: 12,
                  }}
                  title={h.hazard_type}
                >
                  {hazardIcon(h.hazard_type)}
                </div>
              )
            })}

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
                  {nearestExit ? ' · Follow green route to exit' : ''}
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
                    <span className="badge badge-gray" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>{inc.incident_type.replace('_', ' ')}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                    {new Date(inc.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
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
