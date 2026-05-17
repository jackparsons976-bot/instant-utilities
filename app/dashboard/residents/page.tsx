'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Member {
  id: string; user_id: string; role: string
  unit_number: string | null; joined_at: string
}

export default function ResidentsPage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUnit, setEditUnit] = useState('')

  const facilityId = session?.user?.app_metadata?.active_facility_ids?.[0]
  const role = (session?.user?.app_metadata?.platform_role as string) ?? 'resident'
  const isManager = role === 'facility_manager' || role === 'platform_admin'

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    getSupabaseClient().schema('facility').from('members')
      .select('id, user_id, role, unit_number, joined_at')
      .eq('facility_id', facilityId)
      .is('left_at', null)
      .order('joined_at', { ascending: false })
      .then(({ data }) => { setMembers((data ?? []) as Member[]); setLoading(false) })
  }, [facilityId])

  async function saveUnit(memberId: string) {
    const { error } = await getSupabaseClient().schema('facility').from('members')
      .update({ unit_number: editUnit || null })
      .eq('id', memberId)
    if (error) { toast('Failed to update unit: ' + error.message, 'error'); return }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, unit_number: editUnit || null } : m))
    setEditingId(null)
    toast('Unit updated.', 'success')
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    return !q || m.user_id.toLowerCase().includes(q) || (m.unit_number ?? '').toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Residents</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{members.length} active members</p>
        </div>
        <input
          className="input"
          placeholder="Search by unit or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '240px' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '44px', borderRadius: '8px' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="placeholder-section">
          <h3>No members found</h3>
          <p>{search ? 'No members match your search.' : 'No active members in this facility.'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Unit</th><th>Joined</th>{isManager && <th></th>}</tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.775rem', color: 'var(--muted)' }}>
                    {m.user_id.slice(0, 8)}…
                  </td>
                  <td>
                    <span className={`badge ${m.role === 'facility_manager' ? 'badge-black' : m.role === 'platform_admin' ? 'badge-black' : 'badge-gray'}`}>
                      {m.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    {editingId === m.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input className="input" value={editUnit} onChange={e => setEditUnit(e.target.value)}
                          style={{ width: '100px', padding: '0.3rem 0.5rem' }}
                          placeholder="Unit #" autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveUnit(m.id); if (e.key === 'Escape') setEditingId(null) }} />
                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => saveUnit(m.id)}>Save</button>
                        <button className="btn btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setEditingId(null)}>✕</button>
                      </div>
                    ) : (
                      <span style={{ color: m.unit_number ? 'var(--fg)' : 'var(--muted)' }}>
                        {m.unit_number ?? '—'}
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                  {isManager && (
                    <td>
                      {editingId !== m.id && (
                        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--muted)' }}
                          onClick={() => { setEditingId(m.id); setEditUnit(m.unit_number ?? '') }}>
                          Edit unit
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
