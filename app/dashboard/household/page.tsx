'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/AppNav'

interface HouseholdMember {
  id: string
  display_name: string
  relationship: string
  can_trigger_sos: boolean
  notify_on_emergency: boolean
}

interface UnitCount {
  user_id: string
  count: number
}

const RELATIONSHIPS = ['partner', 'child', 'parent', 'other'] as const

export default function HouseholdPage() {
  const { session, jwtClaims, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const userId = session?.user?.id ?? ''
  const facilityId =
    jwtClaims?.app_metadata?.active_facility_ids?.[0] ??
    jwtClaims?.active_facility_ids?.[0] ?? ''
  const role =
    jwtClaims?.app_metadata?.platform_role ??
    jwtClaims?.platform_role ??
    'resident'
  const isManager = role === 'platform_admin' || role === 'facility_manager'

  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [unitCounts, setUnitCounts] = useState<UnitCount[]>([])
  const [loading, setLoading] = useState(true)

  // Add form state
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formRelationship, setFormRelationship] = useState<string>('partner')
  const [formCanSos, setFormCanSos] = useState(true)
  const [formNotifyEmergency, setFormNotifyEmergency] = useState(true)
  const [adding, setAdding] = useState(false)

  const sb = getSupabaseClient() as any

  useEffect(() => {
    if (authLoading || !userId || !facilityId) return
    loadMembers()
    if (isManager) loadUnitCounts()
  }, [authLoading, userId, facilityId])

  async function loadMembers() {
    setLoading(true)
    const { data, error } = await sb
      .schema('facility')
      .from('household_members')
      .select('id,display_name,relationship,can_trigger_sos,notify_on_emergency')
      .eq('user_id', userId)
      .eq('facility_id', facilityId)
    if (error) toast('Failed to load members: ' + error.message, 'error')
    else setMembers((data ?? []) as HouseholdMember[])
    setLoading(false)
  }

  async function loadUnitCounts() {
    const { data, error } = await sb
      .schema('facility')
      .from('household_members')
      .select('user_id')
      .eq('facility_id', facilityId)
    if (error) return
    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      counts[row.user_id] = (counts[row.user_id] ?? 0) + 1
    }
    setUnitCounts(Object.entries(counts).map(([user_id, count]) => ({ user_id, count })))
  }

  async function addMember() {
    if (!formName.trim()) { toast('Display name is required.', 'error'); return }
    setAdding(true)
    const { error } = await sb
      .schema('facility')
      .from('household_members')
      .insert({
        user_id: userId,
        facility_id: facilityId,
        display_name: formName.trim(),
        relationship: formRelationship,
        can_trigger_sos: formCanSos,
        notify_on_emergency: formNotifyEmergency,
      })
    if (error) {
      toast('Failed to add member: ' + error.message, 'error')
    } else {
      toast('Member added.', 'success')
      setFormName('')
      setFormRelationship('partner')
      setFormCanSos(true)
      setFormNotifyEmergency(true)
      setShowForm(false)
      loadMembers()
    }
    setAdding(false)
  }

  async function toggleField(id: string, field: 'can_trigger_sos' | 'notify_on_emergency', current: boolean) {
    const { error } = await sb
      .schema('facility')
      .from('household_members')
      .update({ [field]: !current })
      .eq('id', id)
    if (error) { toast('Update failed: ' + error.message, 'error'); return }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: !current } : m))
  }

  async function deleteMember(id: string) {
    const { error } = await sb
      .schema('facility')
      .from('household_members')
      .delete()
      .eq('id', id)
    if (error) { toast('Delete failed: ' + error.message, 'error'); return }
    setMembers(prev => prev.filter(m => m.id !== id))
    toast('Member removed.', 'success')
  }

  if (authLoading || loading) return <div className="center"><div className="spinner" /></div>

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNav />
      <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Household Members</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>People in your household who may need emergency notifications or access.</p>
        </div>

        {/* Member list */}
        {members.length === 0 ? (
          <div className="placeholder-section">
            <h3>No household members</h3>
            <p>Add family members or housemates to manage their emergency access.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {members.map(m => (
              <div key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.display_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'capitalize', marginTop: '0.15rem' }}>{m.relationship}</div>
                  </div>
                  <button
                    onClick={() => deleteMember(m.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                  >
                    Remove
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={m.can_trigger_sos}
                      onChange={() => toggleField(m.id, 'can_trigger_sos', m.can_trigger_sos)}
                    />
                    Can trigger SOS
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={m.notify_on_emergency}
                      onChange={() => toggleField(m.id, 'notify_on_emergency', m.notify_on_emergency)}
                    />
                    Notify on emergency
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add member */}
        {!showForm ? (
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setShowForm(true)}>
            + Add member
          </button>
        ) : (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Add household member</div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>Display name *</label>
              <input
                type="text"
                placeholder="e.g. Jane Smith"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: '#fff', color: 'var(--fg)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>Relationship</label>
              <select
                value={formRelationship}
                onChange={e => setFormRelationship(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: '#fff', color: 'var(--fg)' }}
              >
                {RELATIONSHIPS.map(r => (
                  <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={formCanSos} onChange={e => setFormCanSos(e.target.checked)} />
                Can trigger SOS
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={formNotifyEmergency} onChange={e => setFormNotifyEmergency(e.target.checked)} />
                Notify on emergency
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={addMember} disabled={adding}>
                {adding ? 'Adding…' : 'Add member'}
              </button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)} disabled={adding}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Manager: household counts by unit */}
        {isManager && unitCounts.length > 0 && (
          <div>
            <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>Household counts by unit</h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Unit (user_id)</th>
                    <th>Members</th>
                  </tr>
                </thead>
                <tbody>
                  {unitCounts.sort((a, b) => b.count - a.count).map(u => (
                    <tr key={u.user_id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--muted)' }}>{u.user_id}</td>
                      <td style={{ fontWeight: 600 }}>{u.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
