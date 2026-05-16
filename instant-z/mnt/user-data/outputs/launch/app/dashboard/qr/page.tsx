'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Node { id: string; label: string; node_type: string; zone: string | null; emergency_priority: number; is_active: boolean }

export default function QRPage() {
  const { session } = useAuth()
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const facilityId = session?.user?.app_metadata?.active_facility_ids?.[0]

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    getSupabaseClient().schema('qr').from('nodes')
      .select('id, label, node_type, zone, emergency_priority, is_active')
      .eq('facility_id', facilityId)
      .order('emergency_priority', { ascending: true })
      .then(({ data }) => { setNodes((data ?? []) as Node[]); setLoading(false) })
  }, [facilityId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>QR Nodes</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{nodes.length} nodes deployed</p>
      </div>
      <div className="placeholder-section">
        <h3>📱 Floor plan view</h3>
        <p>Interactive node placement on floor plan — Phase 3</p>
      </div>
      {loading ? <p style={{ color: 'var(--muted)' }}>Loading…</p>
        : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th>Label</th><th>Type</th><th>Zone</th><th>Priority</th><th>Status</th></tr></thead>
              <tbody>
                {nodes.map(n => (
                  <tr key={n.id}>
                    <td style={{ fontWeight: 500 }}>{n.label}</td>
                    <td style={{ textTransform: 'capitalize' }}>{n.node_type.replace('_', ' ')}</td>
                    <td style={{ color: 'var(--muted)' }}>{n.zone ?? '—'}</td>
                    <td><span className={`badge ${n.emergency_priority <= 2 ? 'badge-red' : n.emergency_priority <= 4 ? 'badge-yellow' : 'badge-gray'}`}>{n.emergency_priority}</span></td>
                    <td><span className={`badge ${n.is_active ? 'badge-green' : 'badge-gray'}`}>{n.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
