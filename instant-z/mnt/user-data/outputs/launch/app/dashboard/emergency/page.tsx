'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Incident {
  id: string
  incident_type: string
  status: string
  title: string
  severity: number
  created_at: string
  origin_node_id: string | null
}

export default function EmergencyPage() {
  const { session } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading]     = useState(true)
  const [sosActive, setSosActive] = useState(false)
  const facilityId = session?.user?.app_metadata?.active_facility_ids?.[0]

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    const sb = getSupabaseClient()
    sb.schema('emergency').from('incidents')
      .select('id, incident_type, status, title, severity, created_at, origin_node_id')
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setIncidents((data ?? []) as Incident[]); setLoading(false) })
  }, [facilityId])

  async function triggerSOS() {
    if (!session || !facilityId) return
    setSosActive(true)
    const sb = getSupabaseClient()
    await sb.schema('emergency').from('sos_events').insert({
      facility_id: facilityId,
      user_id: session.user.id,
      status: 'pending',
    })
    setTimeout(() => setSosActive(false), 3000)
  }

  const activeIncidents = incidents.filter(i => i.status === 'active')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Emergency</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>SOS, incidents, and hazard management</p>
      </div>

      {/* Active alert banner */}
      {activeIncidents.length > 0 && (
        <div className="alert alert-danger">
          ⚠️ <strong>{activeIncidents.length} active incident{activeIncidents.length > 1 ? 's' : ''}</strong> — review below and coordinate response.
        </div>
      )}

      {/* SOS button */}
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Emergency SOS</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.75rem' }}>
          Press only in a genuine emergency. Alerts all facility managers immediately.
        </p>
        <button className="sos-btn" style={{ margin: '0 auto' }} onClick={triggerSOS} disabled={sosActive}>
          {sosActive ? '✓ SENT' : 'SOS'}
        </button>
        {sosActive && (
          <p className="alert alert-danger" style={{ marginTop: '1.25rem' }}>
            Alert sent — help is on the way.
          </p>
        )}
      </div>

      {/* Incidents list */}
      <div>
        <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>
          Recent incidents {activeIncidents.length > 0 && <span className="badge badge-red" style={{ marginLeft: '0.5rem' }}>{activeIncidents.length} active</span>}
        </h2>
        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Loading…</p>
        ) : incidents.length === 0 ? (
          <div className="placeholder-section">
            <h3>No incidents</h3>
            <p>All clear. No incidents have been reported for this facility.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(i => (
                  <tr key={i.id}>
                    <td style={{ textTransform: 'capitalize' }}>{i.incident_type.replace('_', ' ')}</td>
                    <td>{i.title}</td>
                    <td>
                      <span className={`badge ${i.severity >= 4 ? 'badge-red' : i.severity >= 3 ? 'badge-yellow' : 'badge-gray'}`}>
                        {i.severity}/5
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${i.status === 'active' ? 'badge-red' : i.status === 'resolved' ? 'badge-green' : 'badge-gray'}`}>
                        {i.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                      {new Date(i.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hazard map placeholder */}
      <div>
        <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>Floor plan &amp; hazards</h2>
        <div className="placeholder-section">
          <h3>🗺️ Floor map</h3>
          <p>Interactive floor plan with live hazard markers and evacuation routes — Phase 3</p>
        </div>
      </div>
    </div>
  )
}
