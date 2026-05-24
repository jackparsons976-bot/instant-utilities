'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'
import { can } from '@/lib/permissions/can'

interface Incident {
  id: string; incident_type: string; status: string; title: string
  severity: number; created_at: string; origin_node_id: string | null
}
interface TimelineEntry {
  id: string; incident_id: string; event_type: string
  summary: string; created_at: string; actor_id: string | null
}
interface HazardMarker {
  id: string; hazard_type: string; floor: string | null
  placed_by: string | null; is_active: boolean; created_at: string
  notes: string | null
}
interface ActiveRoute {
  id: string; from_node_id: string; to_node_id: string
  is_blocked: boolean; block_reason: string | null
}

function nodeLabel(nodeMap: Record<string, string>, id: string): string {
  return nodeMap[id] ?? `${id.slice(0, 8)}…`
}

function elapsed(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 43200) return `${Math.floor(diff / 3600)}h ago`  // 12h
  return '12h+ ago'
}

export default function EmergencyPage() {
  const { session, jwtClaims } = useAuth()
  const { toast } = useToast()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [hazards, setHazards] = useState<HazardMarker[]>([])
  const [routes, setRoutes] = useState<ActiveRoute[]>([])
  const [nodeMap, setNodeMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [sosActive, setSosActive] = useState(false)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [reconnectKey, setReconnectKey] = useState(0)
  const [showHazardForm, setShowHazardForm] = useState(false)
  const [hazardType, setHazardType] = useState('fire')
  const [hazardFloor, setHazardFloor] = useState('')
  const [hazardFloorError, setHazardFloorError] = useState('')
  const [hazardNotes, setHazardNotes] = useState('')
  const channelRef = useRef<any>(null)
  const reconnectAttempts = useRef(0)

  const facilityId = jwtClaims?.app_metadata?.active_facility_ids?.[0] ?? jwtClaims?.active_facility_ids?.[0]
  const canResolveHazards = can(jwtClaims, 'RESOLVE_HAZARD')
  const activeIncidents = incidents.filter(i => i.status === 'active')
  const activeIncidentId = activeIncidents[0]?.id ?? null

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    const sb = getSupabaseClient()

    Promise.all([
      sb.schema('emergency').from('incidents')
        .select('id, incident_type, status, title, severity, created_at, origin_node_id')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false })
        .limit(20),
      sb.schema('emergency').from('hazard_markers')
        .select('id, hazard_type, floor, placed_by, is_active, created_at, notes')
        .eq('facility_id', facilityId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      sb.schema('emergency').from('active_routes')
        .select('id, from_node_id, to_node_id, is_blocked, block_reason')
        .eq('facility_id', facilityId),
      (sb as any).schema('qr').from('nodes')
        .select('id, label')
        .eq('facility_id', facilityId),
    ]).then(([{ data: iData }, { data: hData }, { data: rData }, { data: nData }]) => {
      const incidentList = (iData ?? []) as Incident[]
      setIncidents(incidentList)
      setHazards((hData ?? []) as HazardMarker[])
      setRoutes((rData ?? []) as ActiveRoute[])
      const map: Record<string, string> = {}
      ;(nData ?? []).forEach((n: { id: string; label: string }) => { map[n.id] = n.label })
      setNodeMap(map)

      const activeId = incidentList.find(i => i.status === 'active')?.id
      if (activeId) {
        sb.schema('emergency').from('incident_timeline')
          .select('id, incident_id, event_type, summary, created_at, actor_id')
          .eq('incident_id', activeId)
          .order('created_at', { ascending: true })
          .then(({ data }) => setTimeline((data ?? []) as TimelineEntry[]))
      }
      setLoading(false)
    })

    // Realtime subscriptions
    const channel = sb
      .channel(`emergency:${facilityId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'emergency', table: 'sos_events',
        filter: `facility_id=eq.${facilityId}`,
      }, payload => {
        toast('SOS alert received!', 'error')
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'emergency', table: 'incidents',
        filter: `facility_id=eq.${facilityId}`,
      }, payload => {
        setIncidents(prev => [payload.new as Incident, ...prev])
        toast(`New incident: ${(payload.new as Incident).title}`, 'error')
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'emergency', table: 'incidents',
        filter: `facility_id=eq.${facilityId}`,
      }, payload => {
        setIncidents(prev => prev.map(i => i.id === (payload.new as Incident).id ? payload.new as Incident : i))
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'emergency', table: 'hazard_markers',
        filter: `facility_id=eq.${facilityId}`,
      }, payload => {
        const h = payload.new as HazardMarker
        if (h.is_active) {
          setHazards(prev => [h, ...prev])
          toast(`Hazard reported: ${h.hazard_type}`, 'error')
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'emergency', table: 'hazard_markers',
        filter: `facility_id=eq.${facilityId}`,
      }, payload => {
        const h = payload.new as HazardMarker
        setHazards(prev => h.is_active ? prev.map(x => x.id === h.id ? h : x) : prev.filter(x => x.id !== h.id))
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'emergency', table: 'incident_timeline',
      }, payload => {
        setTimeline(prev => [...prev, payload.new as TimelineEntry])
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true)
          reconnectAttempts.current = 0
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeConnected(false)
          const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000)
          reconnectAttempts.current += 1
          setTimeout(() => setReconnectKey(k => k + 1), delay)
        }
      })

    channelRef.current = channel
    return () => { sb.removeChannel(channel) }
  }, [facilityId, reconnectKey])

  async function triggerSOS() {
    if (!session || !facilityId) return
    setSosActive(true)
    try {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ facility_id: facilityId }),
      })
      if (res.status === 429) {
        toast('Too many SOS alerts — please wait before sending another.', 'error')
        setSosActive(false)
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast('Failed to send SOS: ' + (data.error ?? res.statusText), 'error')
        setSosActive(false)
      } else {
        toast('SOS alert sent — help is on the way.', 'success')
        setTimeout(() => setSosActive(false), 5000)
      }
    } catch {
      toast('Network error — could not send SOS.', 'error')
      setSosActive(false)
    }
  }

  async function addHazard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!hazardFloor.trim()) {
      setHazardFloorError('Floor / location is required')
      return
    }
    setHazardFloorError('')
    if (!session || !facilityId) return
    const sb = getSupabaseClient()
    const { error } = await sb.schema('emergency').from('hazard_markers').insert({
      facility_id: facilityId,
      placed_by: session.user.id,
      hazard_type: hazardType,
      floor: hazardFloor || null,
      notes: hazardNotes || null,
      is_active: true,
    })
    if (error) { toast('Failed to add hazard: ' + error.message, 'error'); return }
    toast('Hazard marker added.', 'success')
    setShowHazardForm(false)
    setHazardType('fire'); setHazardFloor(''); setHazardFloorError(''); setHazardNotes('')
  }

  async function resolveHazard(id: string) {
    const sb = getSupabaseClient()
    const { error } = await sb.schema('emergency').from('hazard_markers')
      .update({ is_active: false, resolved_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast('Failed to resolve: ' + error.message, 'error'); return }
    setHazards(prev => prev.filter(h => h.id !== id))
    toast('Hazard resolved.', 'success')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Emergency</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>SOS, incidents, hazard management</p>
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          fontSize: '0.75rem', color: realtimeConnected ? 'var(--success)' : 'var(--muted)',
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: realtimeConnected ? 'var(--success)' : '#d1d5db',
            display: 'inline-block',
          }} />
          {realtimeConnected ? 'Live' : reconnectAttempts.current > 0 ? 'Reconnecting…' : 'Connecting…'}
        </span>
      </div>

      {activeIncidents.length > 0 && (
        <div className="alert alert-danger">
          ⚠️ <strong>{activeIncidents.length} active incident{activeIncidents.length > 1 ? 's' : ''}</strong> — {activeIncidents[0].title}. Coordinate response immediately.
        </div>
      )}

      {/* SOS */}
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Emergency SOS</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.75rem' }}>
          Press only in a genuine emergency. Alerts all facility managers immediately.
        </p>
        <button className="sos-btn" style={{ margin: '0 auto' }} onClick={triggerSOS} disabled={sosActive}>
          {sosActive ? '✓ SENT' : 'SOS'}
        </button>
        {sosActive && (
          <p className="alert alert-danger" style={{ marginTop: '1.25rem', maxWidth: '320px', margin: '1.25rem auto 0' }}>
            Alert sent — help is on the way.
          </p>
        )}
      </div>

      {/* Active incident timeline */}
      {activeIncidentId && (
        <div>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>
            Active Incident Timeline
            <span className="badge badge-red" style={{ marginLeft: '0.5rem' }}>
              {elapsed(activeIncidents[0].created_at)}
            </span>
          </h2>
          <div className="card">
            {timeline.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No timeline entries yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {timeline.map(entry => (
                  <div key={entry.id} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: 'var(--primary)', flexShrink: 0, marginTop: '0.35rem',
                    }} />
                    <div>
                      <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                        {entry.event_type.replace('_', ' ')}
                      </span>
                      {' — '}{entry.summary}
                      <span style={{ color: 'var(--muted)', fontSize: '0.775rem', marginLeft: '0.5rem' }}>
                        {elapsed(entry.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hazard markers */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>
            Active Hazards
            {hazards.length > 0 && <span className="badge badge-red" style={{ marginLeft: '0.5rem' }}>{hazards.length}</span>}
          </h2>
          <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
            onClick={() => setShowHazardForm(v => !v)}>
            {showHazardForm ? 'Cancel' : '+ Report hazard'}
          </button>
        </div>

        {showHazardForm && (
          <div className="card" style={{ marginBottom: '0.75rem' }}>
            <form onSubmit={addHazard} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label className="label">Hazard type</label>
                  <select className="input" value={hazardType} onChange={e => setHazardType(e.target.value)}>
                    <option value="fire">Fire</option>
                    <option value="smoke">Smoke</option>
                    <option value="flood">Flood</option>
                    <option value="gas_leak">Gas leak</option>
                    <option value="blocked_exit">Blocked exit</option>
                    <option value="structural">Structural damage</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Floor / location *</label>
                  <input
                    className="input"
                    placeholder="e.g. Floor 3, Corridor B"
                    value={hazardFloor}
                    onChange={e => { setHazardFloor(e.target.value); if (e.target.value.trim()) setHazardFloorError('') }}
                  />
                  {hazardFloorError && <p className="error-msg" role="alert">{hazardFloorError}</p>}
                </div>
              </div>
              <div className="field">
                <label className="label">Notes (optional)</label>
                <input className="input" placeholder="Additional details…" value={hazardNotes} onChange={e => setHazardNotes(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-danger" style={{ alignSelf: 'flex-start' }}>Report hazard</button>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '44px', borderRadius: '6px' }} />)}
          </div>
        ) : hazards.length === 0 ? (
          <div className="placeholder-section">
            <h3>All clear</h3>
            <p>No active hazard markers for this facility.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr><th>Type</th><th>Location</th><th>Reported</th><th>Notes</th>{canResolveHazards && <th></th>}</tr>
              </thead>
              <tbody>
                {hazards.map(h => (
                  <tr key={h.id}>
                    <td>
                      <span className="badge badge-red" style={{ textTransform: 'capitalize' }}>
                        {h.hazard_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{h.floor ?? '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{elapsed(h.created_at)}</td>
                    <td style={{ fontSize: '0.85rem' }}>{h.notes ?? '—'}</td>
                    {canResolveHazards && (
                      <td>
                        <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                          onClick={() => resolveHazard(h.id)}>
                          Resolve
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active routes */}
      {routes.length > 0 && (
        <div>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>Evacuation Routes</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th>From</th><th>To</th><th>Status</th><th>Reason</th></tr></thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '0.85rem' }}>{nodeLabel(nodeMap, r.from_node_id)}</td>
                    <td style={{ fontSize: '0.85rem' }}>{nodeLabel(nodeMap, r.to_node_id)}</td>
                    <td>
                      <span className={`badge ${r.is_blocked ? 'badge-red' : 'badge-green'}`}>
                        {r.is_blocked ? 'Blocked' : 'Clear'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{r.block_reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Incidents list */}
      <div>
        <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>
          Incident History
          {activeIncidents.length > 0 && <span className="badge badge-red" style={{ marginLeft: '0.5rem' }}>{activeIncidents.length} active</span>}
        </h2>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '44px', borderRadius: '6px' }} />)}
          </div>
        ) : incidents.length === 0 ? (
          <div className="placeholder-section">
            <h3>All clear — no incidents</h3>
            <p>No incidents have been reported for this facility.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th>Type</th><th>Title</th><th>Severity</th><th>Status</th><th>Time</th></tr></thead>
              <tbody>
                {incidents.map(i => (
                  <tr key={i.id}>
                    <td style={{ textTransform: 'capitalize' }}>{i.incident_type.replace('_', ' ')}</td>
                    <td>{i.title}</td>
                    <td><span className={`badge ${i.severity >= 4 ? 'badge-red' : i.severity >= 3 ? 'badge-yellow' : 'badge-gray'}`}>{i.severity}/5</span></td>
                    <td><span className={`badge ${i.status === 'active' ? 'badge-red' : i.status === 'resolved' ? 'badge-green' : 'badge-gray'}`}>{i.status}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{elapsed(i.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
