'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/AppNav'

interface Facility { id: string; name: string; status: string; created_at: string }
interface FacilityEnriched extends Facility { resident_count: number; active_incidents: number }
interface PendingVendor { id: string; name: string; business_type: string; contact_email: string | null; created_at: string }

export default function AdminPage() {
  const { session, jwtClaims, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [facilities, setFacilities] = useState<FacilityEnriched[]>([])
  const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([])
  const [stats, setStats] = useState({ facilities: 0, users: 0, incidents: 0 })
  const [loading, setLoading] = useState(true)
  const [addingFacility, setAddingFacility] = useState(false)

  const role = jwtClaims?.app_metadata?.platform_role ?? 'resident'

  useEffect(() => {
    if (!authLoading && (!session || role !== 'platform_admin')) {
      router.replace('/dashboard')
    }
  }, [session, authLoading, role, router])

  async function loadFacilities() {
    const sb = getSupabaseClient() as any
    const { data: fData } = await sb.schema('facility').from('facilities').select('id, name, status, created_at').order('created_at', { ascending: false })
    const facilityList: Facility[] = fData ?? []

    const enriched: FacilityEnriched[] = await Promise.all(facilityList.map(async (f) => {
      const [{ count: rCount }, { count: iCount }] = await Promise.all([
        sb.schema('facility').from('members').select('id', { count: 'exact', head: true }).eq('facility_id', f.id),
        sb.schema('emergency').from('incidents').select('id', { count: 'exact', head: true }).eq('facility_id', f.id).eq('status', 'active'),
      ])
      return { ...f, resident_count: rCount ?? 0, active_incidents: iCount ?? 0 }
    }))
    setFacilities(enriched)
    return enriched
  }

  useEffect(() => {
    if (!session || role !== 'platform_admin') return
    const sb = getSupabaseClient() as any

    Promise.all([
      loadFacilities(),
      sb.schema('marketplace').from('business_profiles')
        .select('id, name, business_type, contact_email, created_at')
        .eq('is_approved', false).eq('is_active', true),
      sb.schema('emergency').from('incidents').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]).then(([enriched, { data: vData }, { count: incCount }]) => {
      setPendingVendors((vData ?? []) as PendingVendor[])
      setStats({ facilities: enriched.length, users: 0, incidents: incCount ?? 0 })
      setLoading(false)
    })
  }, [session?.user?.id, role])

  async function addFacility() {
    setAddingFacility(true)
    const sb = getSupabaseClient() as any
    const { error } = await sb.schema('facility').from('facilities').insert({ name: 'New Facility', created_at: new Date().toISOString() })
    if (error) { toast('Failed to add facility: ' + error.message, 'error'); setAddingFacility(false); return }
    await loadFacilities()
    setAddingFacility(false)
    toast('Facility added.', 'success')
  }

  async function approveVendor(id: string) {
    const { error } = await getSupabaseClient().schema('marketplace').from('business_profiles')
      .update({ is_approved: true })
      .eq('id', id)
    if (error) { toast('Failed to approve: ' + error.message, 'error'); return }
    setPendingVendors(prev => prev.filter(v => v.id !== id))
    toast('Vendor approved.', 'success')
  }

  if (authLoading || loading) return (
    <div className="center"><div className="spinner" /></div>
  )

  if (role !== 'platform_admin') return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNav />
      <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Platform Admin</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Platform-wide management</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Facilities</div><div className="stat-value">{stats.facilities}</div></div>
          <div className="stat-card"><div className="stat-label">Active Incidents</div><div className="stat-value" style={{ color: stats.incidents > 0 ? 'var(--danger)' : 'var(--fg)' }}>{stats.incidents}</div></div>
          <div className="stat-card"><div className="stat-label">Pending Approvals</div><div className="stat-value" style={{ color: pendingVendors.length > 0 ? 'var(--warning)' : 'var(--fg)' }}>{pendingVendors.length}</div></div>
        </div>

        {/* Pending vendor approvals */}
        {pendingVendors.length > 0 && (
          <div>
            <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>
              Pending Vendor Approvals
              <span className="badge badge-yellow" style={{ marginLeft: '0.5rem' }}>{pendingVendors.length}</span>
            </h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Submitted</th><th></th></tr></thead>
                <tbody>
                  {pendingVendors.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 500 }}>{v.name}</td>
                      <td><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{v.business_type}</span></td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{v.contact_email ?? '—'}</td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{new Date(v.created_at).toLocaleDateString()}</td>
                      <td><button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }} onClick={() => approveVendor(v.id)}>Approve</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Facility list */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>All Facilities</h2>
            <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }} onClick={addFacility} disabled={addingFacility}>
              {addingFacility ? 'Adding…' : '+ Add facility'}
            </button>
          </div>
          {facilities.length === 0 ? (
            <div className="placeholder-section"><h3>No facilities</h3><p>No facilities registered on the platform.</p></div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead><tr><th>Name</th><th>Residents</th><th>Active Incidents</th><th>Status</th><th>Created</th><th></th></tr></thead>
                <tbody>
                  {facilities.map(f => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500 }}>{f.name}</td>
                      <td style={{ color: 'var(--muted)' }}>{f.resident_count}</td>
                      <td>
                        {f.active_incidents > 0
                          ? <span className="badge badge-red">{f.active_incidents}</span>
                          : <span style={{ color: 'var(--muted)' }}>0</span>}
                      </td>
                      <td><span className={`badge ${f.status === 'active' ? 'badge-green' : 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{f.status}</span></td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                      <td><Link href={`/admin/facility/${f.id}`} style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Manage →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
