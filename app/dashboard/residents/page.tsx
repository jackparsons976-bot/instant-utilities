'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'
import { can } from '@/lib/permissions/can'

interface Member {
  id: string; user_id: string; role: string
  unit_number: string | null; joined_at: string
}

export default function ResidentsPage() {
  const { session, jwtClaims } = useAuth()
  const { toast } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUnit, setEditUnit] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('resident')
  const [inviteUnit, setInviteUnit] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const [pendingInvitations, setPendingInvitations] = useState<{id:string,email:string,role:string,unit_number:string|null,expires_at:string}[]>([])

  const facilityId = jwtClaims?.app_metadata?.active_facility_ids?.[0] ?? jwtClaims?.active_facility_ids?.[0]
  const canManageResidents = can(jwtClaims, 'MANAGE_RESIDENTS')

  async function loadInvitations() {
    if (!facilityId || !canManageResidents) return
    const { data } = await (getSupabaseClient() as any).schema('facility').from('invitations')
      .select('id,email,role,unit_number,expires_at')
      .eq('facility_id', facilityId).is('accepted_at', null).gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    setPendingInvitations(data ?? [])
  }

  async function sendInvite() {
    if (!facilityId || !inviteEmail) return
    setInviting(true); setInviteMsg(null)
    try {
      const sb = getSupabaseClient()
      const { data: inv, error } = await (sb as any).schema('facility').from('invitations').insert({
        facility_id: facilityId, invited_by: session?.user?.id,
        email: inviteEmail, role: inviteRole, unit_number: inviteUnit || null,
      }).select('id').single()
      if (error) throw error
      await sb.functions.invoke('send-invitation', { body: { invitationId: inv.id } })
      setInviteMsg('✅ Invitation sent'); setInviteEmail(''); setInviteUnit(''); setShowInviteForm(false)
      loadInvitations()
    } catch (err: any) { setInviteMsg('Error: ' + (err?.message ?? 'Failed')) }
    finally { setInviting(false) }
  }

  async function revokeInvitation(id: string) {
    await (getSupabaseClient() as any).schema('facility').from('invitations').delete().eq('id', id)
    setPendingInvitations(prev => prev.filter(i => i.id !== id))
  }

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    getSupabaseClient().schema('facility').from('members')
      .select('id, user_id, role, unit_number, joined_at')
      .eq('facility_id', facilityId)
      .is('left_at', null)
      .order('joined_at', { ascending: false })
      .then(({ data }) => { setMembers((data ?? []) as Member[]); setLoading(false); loadInvitations() })
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Search by unit or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '240px' }}
          />
          {canManageResidents && (
            <button className="btn btn-primary" onClick={() => { setShowInviteForm(f => !f); setInviteMsg(null) }}>
              Invite resident
            </button>
          )}
        </div>
      </div>

      {showInviteForm && canManageResidents && (
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Send invitation</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Email</label>
              <input className="input" placeholder="resident@example.com" value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)} style={{ minWidth: '220px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Role</label>
              <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="resident">Resident</option>
                <option value="facility_manager">Facility Manager</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Unit (optional)</label>
              <input className="input" placeholder="Unit #" value={inviteUnit}
                onChange={e => setInviteUnit(e.target.value)} style={{ maxWidth: '120px' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={sendInvite} disabled={inviting || !inviteEmail}>
                {inviting ? 'Sending…' : 'Send invite'}
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowInviteForm(false); setInviteMsg(null) }}>
                Cancel
              </button>
            </div>
          </div>
          {inviteMsg && (
            <p style={{ fontSize: '0.875rem', color: inviteMsg.startsWith('Error') ? 'var(--error, red)' : 'var(--success, green)', margin: 0 }}>
              {inviteMsg}
            </p>
          )}
        </div>
      )}

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
              <tr><th>User</th><th>Role</th><th>Unit</th><th>Joined</th>{canManageResidents && <th></th>}</tr>
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
                  {canManageResidents && (
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

      {canManageResidents && pendingInvitations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Pending invitations</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr><th>Email</th><th>Role</th><th>Unit</th><th>Expires</th><th></th></tr>
              </thead>
              <tbody>
                {pendingInvitations.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td>
                      <span className={`badge ${inv.role === 'facility_manager' ? 'badge-black' : 'badge-gray'}`}>
                        {inv.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ color: inv.unit_number ? 'var(--fg)' : 'var(--muted)' }}>
                      {inv.unit_number ?? '—'}
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--muted)' }}
                        onClick={() => revokeInvitation(inv.id)}>
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
