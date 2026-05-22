'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'
import { can } from '@/lib/permissions/can'
import { AppNav } from '@/components/AppNav'

interface FacilityDetail { id: string; name: string; address: string | null; emergency_contacts: string[] | null }
interface Member { id: string; user_id: string; role: string; display_name: string | null; email: string | null }
interface Floor { id: string; name: string; order: number | null }

export default function FacilityDetailPage() {
  const params = useParams()
  const facilityId = params.id as string
  const router = useRouter()
  const { session, jwtClaims, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [facility, setFacility] = useState<FacilityDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)

  // form state
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [emergencyContacts, setEmergencyContacts] = useState('')
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)

  // member search
  const [memberSearch, setMemberSearch] = useState('')
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])

  useEffect(() => {
    if (!authLoading && (!session || !can(jwtClaims, 'ACCESS_ADMIN'))) {
      router.replace('/dashboard')
    }
  }, [session, authLoading, jwtClaims, router])

  useEffect(() => {
    if (!session || !can(jwtClaims, 'ACCESS_ADMIN') || !facilityId) return
    const sb = getSupabaseClient() as any

    Promise.all([
      sb.schema('facility').from('facilities').select('id, name, address, emergency_contacts').eq('id', facilityId).single(),
      sb.schema('facility').from('members').select('id, user_id, role, display_name, email').eq('facility_id', facilityId),
      sb.schema('facility').from('floors').select('id, name, order').eq('facility_id', facilityId).order('order', { ascending: true }),
    ]).then(([{ data: fData }, { data: mData }, { data: flData }]: any[]) => {
      if (fData) {
        setFacility(fData)
        setName(fData.name ?? '')
        setAddress(fData.address ?? '')
        setEmergencyContacts(Array.isArray(fData.emergency_contacts) ? fData.emergency_contacts.join('\n') : '')
      }
      setMembers((mData ?? []) as Member[])
      setFilteredMembers((mData ?? []) as Member[])
      setFloors((flData ?? []) as Floor[])
      setLoading(false)
    })
  }, [session?.user?.id, facilityId, jwtClaims])

  useEffect(() => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) { setFilteredMembers(members); return }
    setFilteredMembers(members.filter(m =>
      (m.display_name ?? '').toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q)
    ))
  }, [memberSearch, members])

  async function saveChanges() {
    setSaving(true)
    const contacts = emergencyContacts.split('\n').map(s => s.trim()).filter(Boolean)
    const sb = getSupabaseClient() as any
    const { error } = await sb.schema('facility').from('facilities')
      .update({ name, address, emergency_contacts: contacts })
      .eq('id', facilityId)
    setSaving(false)
    if (error) { toast('Failed to save: ' + error.message, 'error'); return }
    toast('Changes saved.', 'success')
  }

  async function makeManager(memberId: string) {
    const sb = getSupabaseClient() as any
    const { error } = await sb.schema('facility').from('members')
      .update({ role: 'facility_manager' })
      .eq('id', memberId)
    if (error) { toast('Failed to update role: ' + error.message, 'error'); return }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: 'facility_manager' } : m))
    toast('Role updated.', 'success')
  }

  async function archiveFacility() {
    if (!window.confirm('Archive this facility?')) return
    setArchiving(true)
    const sb = getSupabaseClient() as any
    const { error } = await sb.schema('facility').from('facilities')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', facilityId)
    setArchiving(false)
    if (error) { toast('Failed to archive: ' + error.message, 'error'); return }
    router.push('/admin')
  }

  if (authLoading || loading) return <div className="center"><div className="spinner" /></div>
  if (!can(jwtClaims, 'ACCESS_ADMIN')) return <div style={{ padding: '2rem' }}>Access denied.</div>
  if (!facility) return <div style={{ padding: '2rem' }}>Facility not found.</div>

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNav />
      <div style={{ padding: '2rem', maxWidth: '860px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Back link */}
        <div>
          <Link href="/admin" style={{ color: 'var(--muted)', fontSize: '0.875rem', textDecoration: 'none' }}>← All Facilities</Link>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.5rem' }}>{facility.name}</h1>
        </div>

        {/* Details form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Facility Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Facility name" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Address</label>
            <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Emergency Contacts (one phone per line)</label>
            <textarea className="input" rows={3} value={emergencyContacts} onChange={e => setEmergencyContacts(e.target.value)} placeholder="+61 400 000 000" style={{ resize: 'vertical' }} />
          </div>
          <div>
            <button className="btn btn-primary" onClick={saveChanges} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Assign managers */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Members</h2>
          <input
            className="input"
            placeholder="Search members…"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
          />
          {filteredMembers.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No members found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredMembers.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{m.display_name ?? m.email ?? m.user_id}</div>
                      {m.email && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{m.email}</div>}
                    </div>
                    <span className={`badge ${m.role === 'facility_manager' ? 'badge-blue' : 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>
                      {m.role.replace('_', ' ')}
                    </span>
                  </div>
                  {m.role !== 'facility_manager' && (
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }} onClick={() => makeManager(m.id)}>
                      Make manager
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floors list */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Floors</h2>
          {floors.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No floors configured.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {floors.map(f => (
                <Link
                  key={f.id}
                  href={`/admin/floorplan?facility_id=${facilityId}&floor_id=${f.id}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', textDecoration: 'none', color: 'var(--fg)' }}
                >
                  <span style={{ fontWeight: 500 }}>{f.name}</span>
                  <span style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>Edit floor plan →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>Danger Zone</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Archiving a facility hides it from the platform. This action can be reversed by a developer.
          </p>
          <button className="btn btn-danger" onClick={archiveFacility} disabled={archiving}>
            {archiving ? 'Archiving…' : 'Archive facility'}
          </button>
        </div>

      </div>
    </div>
  )
}
