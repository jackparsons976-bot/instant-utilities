'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'
import { can } from '@/lib/permissions/can'

interface Job {
  id: string; facility_id: string; vendor_id: string; quote_id: string | null
  status: string; scheduled_at: string | null; completed_at: string | null
  access_instructions: string | null; manager_notes: string | null
  rating: number | null; review_text: string | null
}
interface VendorProfile { id: string; business_name: string; contact_phone: string | null }

export default function JobsPage() {
  const { session, jwtClaims } = useAuth()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [vendors, setVendors] = useState<Record<string, VendorProfile>>({})
  const [loading, setLoading] = useState(true)
  const [myVendorId, setMyVendorId] = useState<string | null>(null)
  const [ratingJob, setRatingJob] = useState<string | null>(null)
  const [ratingVal, setRatingVal] = useState(5)
  const [reviewText, setReviewText] = useState('')

  const facilityId = session?.user?.app_metadata?.active_facility_ids?.[0]
  const isVendor = can(jwtClaims, 'MANAGE_MARKETPLACE') && !can(jwtClaims, 'MANAGE_VENDORS')
  const isManager = can(jwtClaims, 'MANAGE_VENDORS')

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return }
    const sb = getSupabaseClient() as any

    async function load() {
      let vendorId: string | null = null
      if (isVendor) {
        const { data: bp } = await sb.schema('marketplace').from('business_profiles').select('id').eq('user_id', session!.user.id).maybeSingle()
        vendorId = bp?.id ?? null
        setMyVendorId(vendorId)
      }

      const query = sb.schema('marketplace').from('jobs')
        .select('id,facility_id,vendor_id,quote_id,status,scheduled_at,completed_at,access_instructions,manager_notes,rating,review_text')
        .order('scheduled_at', { ascending: true }).limit(50)

      if (isManager && facilityId) query.eq('facility_id', facilityId)
      else if (vendorId) query.eq('vendor_id', vendorId)

      const { data: jobData } = await query
      const jobList: Job[] = jobData ?? []
      setJobs(jobList)

      // load vendor profiles for display
      const vendorIds = [...new Set(jobList.map(j => j.vendor_id))]
      if (vendorIds.length > 0) {
        const { data: vpData } = await sb.schema('marketplace').from('business_profiles')
          .select('id,business_name,contact_phone').in('id', vendorIds)
        const vpMap: Record<string, VendorProfile> = {}
        for (const vp of vpData ?? []) vpMap[vp.id] = vp
        setVendors(vpMap)
      }
      setLoading(false)
    }
    load()
  }, [session?.user?.id, facilityId])

  async function updateStatus(jobId: string, newStatus: string) {
    const sb = getSupabaseClient() as any
    const update: Record<string, string> = { status: newStatus }
    if (newStatus === 'completed') update.completed_at = new Date().toISOString()
    const { error } = await sb.schema('marketplace').from('jobs').update(update).eq('id', jobId)
    if (error) { toast('Failed to update status.', 'error'); return }
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...update } : j))
    toast('Status updated.', 'success')
  }

  async function submitRating(jobId: string) {
    const sb = getSupabaseClient() as any
    const { error } = await sb.schema('marketplace').from('jobs')
      .update({ rating: ratingVal, review_text: reviewText }).eq('id', jobId)
    if (error) { toast('Failed to save review.', 'error'); return }
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, rating: ratingVal, review_text: reviewText } : j))
    setRatingJob(null); setRatingVal(5); setReviewText('')
    toast('Review saved.', 'success')
  }

  function statusBadge(status: string) {
    const cls = status === 'completed' ? 'badge-green' : status === 'in_progress' ? 'badge-yellow' : status === 'cancelled' ? 'badge-red' : 'badge-gray'
    return <span className={`badge ${cls}`} style={{ textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="skeleton" style={{ height: '28px', width: '35%', borderRadius: '6px' }} />
      <div className="skeleton" style={{ height: '100px', borderRadius: '8px' }} />
      <div className="skeleton" style={{ height: '100px', borderRadius: '8px' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Jobs</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          {isManager ? 'Manage scheduled and active contractor jobs.' : 'Your assigned jobs.'}
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="placeholder-section"><h3>No jobs</h3><p>Jobs will appear here once quotes are accepted.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {jobs.map(job => (
            <div key={job.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {statusBadge(job.status)}
                    {job.scheduled_at && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                        Scheduled: {new Date(job.scheduled_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {isManager && vendors[job.vendor_id] && (
                    <p style={{ fontSize: '0.875rem', marginTop: '0.4rem', fontWeight: 500 }}>
                      {vendors[job.vendor_id].business_name}
                      {vendors[job.vendor_id].contact_phone && (
                        <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: '0.5rem' }}>
                          {vendors[job.vendor_id].contact_phone}
                        </span>
                      )}
                    </p>
                  )}
                  {isVendor && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Facility: {job.facility_id.slice(0, 8)}…</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {isManager && job.status === 'scheduled' && (
                    <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => updateStatus(job.id, 'in_progress')}>
                      Start
                    </button>
                  )}
                  {(isManager || isVendor) && job.status === 'in_progress' && (
                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => updateStatus(job.id, 'completed')}>
                      Mark complete
                    </button>
                  )}
                </div>
              </div>

              {job.access_instructions && (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                  Access: {job.access_instructions}
                </p>
              )}
              {job.manager_notes && (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                  Notes: {job.manager_notes}
                </p>
              )}

              {/* Rating section — managers only, after completion */}
              {isManager && job.status === 'completed' && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  {job.rating ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {'★'.repeat(job.rating)}{'☆'.repeat(5 - job.rating)} — {job.review_text ?? ''}
                    </p>
                  ) : ratingJob === job.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.8rem' }}>Rating:</label>
                        <select className="input" style={{ width: 'auto', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                          value={ratingVal} onChange={e => setRatingVal(Number(e.target.value))}>
                          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
                        </select>
                      </div>
                      <textarea className="input" rows={2} placeholder="Leave a review…" value={reviewText}
                        onChange={e => setReviewText(e.target.value)} style={{ resize: 'vertical', fontSize: '0.8rem' }} />
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => submitRating(job.id)}>Submit</button>
                        <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => setRatingJob(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => setRatingJob(job.id)}>
                      Rate vendor
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
