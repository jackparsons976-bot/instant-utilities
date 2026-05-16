'use client'
// app/dashboard/residents/page.tsx

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Member { id: string; user_id: string; role: string; unit_number: string | null; joined_at: string }

export default function ResidentsPage() {
  const { session } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const facilityId = session?.user?.app_metadata?.active_facility_ids?.[0]

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    getSupabaseClient().schema('facility').from('members')
      .select('id, user_id, role, unit_number, joined_at')
      .eq('facility_id', facilityId)
      .is('left_at', null)
      .order('joined_at', { ascending: false })
      .then(({ data }) => { setMembers((data ?? []) as Member[]); setLoading(false) })
  }, [facilityId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Residents</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{members.length} active members</p>
      </div>
      {loading ? <p style={{ color: 'var(--muted)' }}>Loading…</p>
        : members.length === 0 ? <div className="placeholder-section"><h3>No members</h3></div>
        : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th>User ID</th><th>Role</th><th>Unit</th><th>Joined</th></tr></thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{m.user_id.slice(0, 8)}…</td>
                    <td><span className={`badge ${m.role === 'facility_manager' ? 'badge-black' : 'badge-gray'}`}>{m.role.replace('_', ' ')}</span></td>
                    <td>{m.unit_number ?? '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{new Date(m.joined_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
