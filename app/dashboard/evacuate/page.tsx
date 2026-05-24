'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'
import { calculateEvacuationRoute, buildDirectionText, type RouteNode, type HazardPosition } from '@/lib/emergency/routing'
import Link from 'next/link'

interface Floor { id: string; level_label: string | null; name: string }
interface Incident { id: string; title: string; incident_type: string; severity: number }
interface UserLoc { floor_id: string | null; x_percent: number | null; y_percent: number | null }

const SEV_COLOR = ['', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#6b7280']

export default function EvacuatePage() {
  const { session, jwtClaims } = useAuth()
  const userId = session?.user?.id ?? ''
  const facilityIds: string[] = jwtClaims?.app_metadata?.active_facility_ids ?? jwtClaims?.active_facility_ids ?? []
  const facilityId = facilityIds[0] ?? null

  const [incident, setIncident] = useState<Incident | null>(null)
  const [floor, setFloor] = useState<Floor | null>(null)
  const [userLoc, setUserLoc] = useState<UserLoc | null>(null)
  const [route, setRoute] = useState<RouteNode[]>([])
  const [routeMsg, setRouteMsg] = useState<string | null>(null)
  const [directions, setDirections] = useState<string[]>([])
  const [safe, setSafe] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!facilityId || !userId) return
    const sb = getSupabaseClient()

    Promise.all([
      (sb as any).schema('emergency').from('incidents')
        .select('id,title,incident_type,severity').eq('facility_id', facilityId)
        .eq('status', 'active').order('created_at', { ascending: false }).limit(1),
      (sb as any).from('user_locations')
        .select('floor_id,x_percent,y_percent').eq('user_id', userId).single(),
    ]).then(async ([incRes, locRes]) => {
      const inc = incRes.data?.[0] ?? null
      const loc = locRes.data ?? null
      setIncident(inc)
      setUserLoc(loc)

      if (!inc || !loc?.floor_id) { setLoading(false); return }

      const [floorsRes, nodesRes, hazardsRes] = await Promise.all([
        (sb as any).schema('facility').from('floors')
          .select('id,level_label,name').eq('id', loc.floor_id).single(),
        (sb as any).schema('qr').from('nodes')
          .select('id,label,node_type,x_percent,y_percent,coord_x,coord_y')
          .eq('facility_id', facilityId).eq('floor_id', loc.floor_id).eq('is_active', true),
        (sb as any).schema('emergency').from('hazard_markers')
          .select('id,x_percent,y_percent,coord_x,coord_y')
          .eq('facility_id', facilityId).eq('floor_id', loc.floor_id).eq('is_active', true),
      ])

      setFloor(floorsRes.data ?? null)

      const nodes: RouteNode[] = (nodesRes.data ?? []).map((n: any) => ({
        id: n.id, label: n.label, node_type: n.node_type,
        x_percent: n.x_percent ?? 50, y_percent: n.y_percent ?? 50,
      }))
      const hazards: HazardPosition[] = (hazardsRes.data ?? []).map((h: any) => ({
        id: h.id, x_percent: h.x_percent ?? 50, y_percent: h.y_percent ?? 50,
      }))

      const userPos = { x_percent: loc.x_percent ?? 50, y_percent: loc.y_percent ?? 50 }
      const result = calculateEvacuationRoute(userPos, nodes, hazards)
      setRoute(result.waypoints)
      setRouteMsg(result.message)
      setDirections(buildDirectionText(result.waypoints))
      setLoading(false)
    })
  }, [facilityId, userId])

  async function markSafe() {
    if (!incident || !userId) return
    await (getSupabaseClient() as any).schema('emergency').from('incident_timeline').insert({
      incident_id: incident.id, facility_id: facilityId,
      event_type: 'user_safe', actor_id: userId,
      description: 'User marked themselves safe during evacuation',
    })
    setSafe(true)
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="skeleton" style={{ height: '28px', width: '35%', borderRadius: '6px' }} />
      <div className="skeleton" style={{ height: '100px', borderRadius: '8px' }} />
      <div className="skeleton" style={{ height: '100px', borderRadius: '8px' }} />
    </div>
  )

  if (!incident) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>All clear</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>No active incidents on your floor.</p>
          <Link href="/dashboard" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1.5rem' }}>← Back to floor plan</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', color: '#fff', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Emergency header */}
      <div style={{ background: SEV_COLOR[incident.severity] ?? '#dc2626', borderRadius: '12px', padding: '1.25rem 1.5rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.85, marginBottom: '0.4rem' }}>
          EVACUATE NOW
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{incident.title}</div>
        <div style={{ fontSize: '0.875rem', opacity: 0.85, marginTop: '0.25rem', textTransform: 'capitalize' }}>
          {incident.incident_type.replace(/_/g, ' ')} · {floor?.level_label ?? floor?.name ?? 'Your floor'}
        </div>
      </div>

      {/* 000 call button — always visible */}
      <a href="tel:000" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
        background: '#dc2626', color: '#fff', borderRadius: '12px', padding: '1rem',
        fontSize: '1.1rem', fontWeight: 700, textDecoration: 'none',
      }}>
        📞 Call 000 — Police / Fire / Ambulance
      </a>

      {/* Evacuation directions */}
      <div style={{ background: '#262626', borderRadius: '12px', padding: '1.25rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: '#4ade80' }}>
          🚪 Evacuation route
        </div>
        {routeMsg && (
          <div style={{ background: '#7c2d12', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#fed7aa' }}>
            ⚠️ {routeMsg}
          </div>
        )}
        {directions.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Head to the nearest exit immediately. Follow emergency signage.</p>
        ) : (
          <ol style={{ margin: 0, padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {directions.map((d, i) => (
              <li key={i} style={{ color: i === directions.length - 1 ? '#4ade80' : '#e5e7eb', fontSize: '1rem', fontWeight: i === directions.length - 1 ? 700 : 400 }}>
                {d}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Assembly point */}
      <div style={{ background: '#262626', borderRadius: '12px', padding: '1.25rem' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#fbbf24' }}>📍 Assembly point</div>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
          Proceed to the designated assembly area outside the building. Do not re-enter until all-clear is given by emergency services.
        </p>
      </div>

      {/* Mark safe */}
      {!safe ? (
        <button
          onClick={markSafe}
          style={{
            background: '#16a34a', color: '#fff', border: 'none', borderRadius: '12px',
            padding: '1rem', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          ✅ Mark myself safe
        </button>
      ) : (
        <div style={{ background: '#14532d', borderRadius: '12px', padding: '1rem', textAlign: 'center', fontWeight: 700, color: '#4ade80' }}>
          You are marked safe. Stay at assembly point.
        </div>
      )}

      <Link href="/dashboard" style={{ color: '#6b7280', textAlign: 'center', fontSize: '0.875rem', textDecoration: 'none' }}>
        ← Return to floor plan
      </Link>
    </div>
  )
}
