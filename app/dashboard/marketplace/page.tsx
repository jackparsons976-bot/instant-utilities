'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'
import { can } from '@/lib/permissions/can'
import { respondToQuote, acceptQuote, rejectQuote } from '@/lib/marketplace/quotes'

interface Vendor {
  id: string; name: string; description: string | null
  business_type: string; contact_email: string | null; contact_phone: string | null
}
interface FacilityVendor { vendor_id: string; trust_level: string | null }
interface Quote {
  id: string; title: string; status: string; created_at: string; vendor_id: string
  description: string | null; service_type: string | null
  vendor_response: string | null; vendor_price: number | null; vendor_available_from: string | null
}
interface Job {
  id: string; title: string; status: string; scheduled_at: string | null
  is_emergency_dispatch: boolean; vendor_id: string
}
interface IncomingQuote {
  id: string; title: string; description: string | null; service_type: string | null
  facility_id: string; status: string; created_at: string
}

const SERVICES = ['Plumbing', 'Electrical', 'HVAC', 'Cleaning', 'Security', 'Landscaping', 'Painting', 'General maintenance']

export default function MarketplacePage() {
  const { session, jwtClaims } = useAuth()
  const { toast } = useToast()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [facilityVendors, setFacilityVendors] = useState<FacilityVendor[]>([])
  const [facilityVendorIds, setFacilityVendorIds] = useState<Set<string>>(new Set())
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [incomingQuotes, setIncomingQuotes] = useState<IncomingQuote[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [qVendorId, setQVendorId] = useState('')
  const [qService, setQService] = useState(SERVICES[0])
  const [qTitle, setQTitle] = useState('')
  const [qDesc, setQDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // vendor respond form state
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [rPrice, setRPrice] = useState('')
  const [rMessage, setRMessage] = useState('')
  const [rAvailFrom, setRAvailFrom] = useState('')
  const [rSubmitting, setRSubmitting] = useState(false)

  const facilityId = session?.user?.app_metadata?.active_facility_ids?.[0]
  const canManageVendors = can(jwtClaims, 'MANAGE_VENDORS')
  const canManageMarketplace = can(jwtClaims, 'MANAGE_MARKETPLACE')
  const isVendorRole = canManageMarketplace && !canManageVendors

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return }
    if (!facilityId && !isVendorRole) { setLoading(false); return }
    const sb = getSupabaseClient() as any

    async function load() {
      try {
      const promises: Promise<any>[] = [
        sb.schema('marketplace').from('business_profiles')
          .select('id, name, description, business_type, contact_email, contact_phone')
          .eq('is_approved', true).eq('is_active', true),
        facilityId
          ? sb.schema('marketplace').from('facility_vendors')
              .select('vendor_id, trust_level').eq('facility_id', facilityId)
          : Promise.resolve({ data: [] }),
        facilityId
          ? sb.schema('marketplace').from('quotes')
              .select('id, title, status, created_at, vendor_id, description, service_type, vendor_response, vendor_price, vendor_available_from')
              .eq('facility_id', facilityId)
              .order('created_at', { ascending: false }).limit(20)
          : Promise.resolve({ data: [] }),
        canManageVendors && facilityId
          ? sb.schema('marketplace').from('jobs')
              .select('id, title, status, scheduled_at, is_emergency_dispatch, vendor_id')
              .eq('facility_id', facilityId)
              .order('scheduled_at', { ascending: true }).limit(20)
          : Promise.resolve({ data: [] }),
      ]

      // if vendor role, also fetch incoming quote requests for their vendor profile
      let myVendorId: string | null = null
      if (isVendorRole) {
        const { data: bp } = await sb.schema('marketplace').from('business_profiles')
          .select('id').eq('user_id', session!.user.id).maybeSingle()
        myVendorId = bp?.id ?? null
      }

      const [{ data: vData }, { data: fvData }, { data: qData }, { data: jData }] = await Promise.all(promises)

      if (myVendorId) {
        const { data: iqData } = await sb.schema('marketplace').from('quotes')
          .select('id, title, description, service_type, facility_id, status, created_at')
          .eq('vendor_id', myVendorId).eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(20)
        setIncomingQuotes((iqData ?? []) as IncomingQuote[])
      }

      setVendors((vData ?? []) as Vendor[])
      const fvList = (fvData ?? []) as FacilityVendor[]
      setFacilityVendors(fvList)
      setFacilityVendorIds(new Set(fvList.map((fv) => fv.vendor_id)))
      setQuotes((qData ?? []) as Quote[])
      setJobs((jData ?? []) as Job[])
      setLoading(false)
      } catch (err) {
        console.error('Marketplace load error:', err)
        setLoading(false)
      }
    }
    load()
  }, [facilityId, session?.user?.id, canManageVendors, isVendorRole])

  const approvedVendors = vendors.filter(v => facilityVendorIds.has(v.id))
  const businessTypes = ['all', ...Array.from(new Set(vendors.map(v => v.business_type)))]
  const filtered = (filterType === 'all' ? vendors : vendors.filter(v => v.business_type === filterType))

  async function submitQuote(e: FormEvent) {
    e.preventDefault()
    if (!session || !facilityId || !qVendorId) return
    setSubmitting(true)
    const { data, error } = await getSupabaseClient().schema('marketplace').from('quotes').insert({
      facility_id: facilityId,
      vendor_id: qVendorId,
      requested_by: session.user.id,
      title: qTitle,
      description: qDesc,
      service_type: qService,
      status: 'pending',
    }).select().single()
    if (error) { toast('Failed to submit quote: ' + error.message, 'error'); setSubmitting(false); return }
    setQuotes(prev => [data as Quote, ...prev])
    setShowQuoteForm(false)
    setQVendorId(''); setQTitle(''); setQDesc(''); setQService(SERVICES[0])
    toast('Quote request submitted.', 'success')
    setSubmitting(false)
  }

  function vendorName(id: string) {
    return vendors.find(v => v.id === id)?.name ?? id.slice(0, 8) + '…'
  }

  function trustBadge(vendorId: string) {
    const fv = facilityVendors.find(f => f.vendor_id === vendorId)
    if (!fv?.trust_level) return null
    if (fv.trust_level === 'emergency') return <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>🚨 Emergency</span>
    if (fv.trust_level === 'preferred') return <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>⭐ Preferred</span>
    if (fv.trust_level === 'standard') return <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>✓ Approved</span>
    return null
  }

  async function handleRespond(quoteId: string) {
    setRSubmitting(true)
    const { error } = await respondToQuote(quoteId, '', Number(rPrice), rMessage, rAvailFrom) as any
    if (error) { toast('Failed to respond: ' + (error.message ?? error), 'error'); setRSubmitting(false); return }
    setIncomingQuotes(prev => prev.filter(q => q.id !== quoteId))
    setRespondingTo(null); setRPrice(''); setRMessage(''); setRAvailFrom('')
    toast('Response sent.', 'success')
    setRSubmitting(false)
  }

  async function handleAccept(quoteId: string) {
    const result = await acceptQuote(quoteId, facilityId ?? '')
    if (!result.ok) { toast('Failed to accept quote.', 'error'); return }
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'accepted' } : q))
    toast('Quote accepted — job scheduled.', 'success')
  }

  async function handleReject(quoteId: string) {
    await rejectQuote(quoteId)
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'rejected' } : q))
    toast('Quote rejected.', 'success')
  }

  function quoteBadgeClass(status: string) {
    if (status === 'accepted') return 'badge-green'
    if (status === 'rejected') return 'badge-red'
    if (status === 'quoted') return 'badge-yellow'
    return 'badge-gray'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Marketplace</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Approved vendors and service requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowQuoteForm(v => !v)}>
          {showQuoteForm ? 'Cancel' : '+ Request quote'}
        </button>
      </div>

      {/* Quote form */}
      {showQuoteForm && (
        <div className="card">
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Request a quote</h2>
          <form onSubmit={submitQuote} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="field">
                <label className="label">Vendor *</label>
                <select className="input" required value={qVendorId} onChange={e => setQVendorId(e.target.value)}>
                  <option value="">Select vendor…</option>
                  {approvedVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Service *</label>
                <select className="input" value={qService} onChange={e => setQService(e.target.value)}>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="label">Title *</label>
              <input className="input" required value={qTitle} onChange={e => setQTitle(e.target.value)} placeholder="Brief description of work needed" />
            </div>
            <div className="field">
              <label className="label">Details</label>
              <textarea className="input" value={qDesc} onChange={e => setQDesc(e.target.value)}
                placeholder="Provide any additional details…" rows={3} style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        </div>
      )}

      {/* Incoming quote requests — vendor view */}
      {isVendorRole && incomingQuotes.length > 0 && (
        <div>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>
            Incoming Quote Requests
            <span className="badge badge-yellow" style={{ marginLeft: '0.5rem' }}>{incomingQuotes.length}</span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {incomingQuotes.map(iq => (
              <div key={iq.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{iq.title}</p>
                    {iq.service_type && <span className="badge badge-gray" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>{iq.service_type}</span>}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{new Date(iq.created_at).toLocaleDateString()}</span>
                </div>
                {iq.description && <p style={{ fontSize: '0.825rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>{iq.description}</p>}
                {respondingTo === iq.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="field">
                        <label className="label">Price ($) *</label>
                        <input className="input" type="number" min={0} required value={rPrice} onChange={e => setRPrice(e.target.value)} placeholder="0.00" />
                      </div>
                      <div className="field">
                        <label className="label">Available from *</label>
                        <input className="input" type="date" required value={rAvailFrom} onChange={e => setRAvailFrom(e.target.value)} />
                      </div>
                    </div>
                    <div className="field">
                      <label className="label">Message</label>
                      <textarea className="input" rows={2} value={rMessage} onChange={e => setRMessage(e.target.value)}
                        placeholder="Add any details or conditions…" style={{ resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                        disabled={rSubmitting || !rPrice || !rAvailFrom} onClick={() => handleRespond(iq.id)}>
                        {rSubmitting ? 'Sending…' : 'Send response'}
                      </button>
                      <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                        onClick={() => setRespondingTo(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                    onClick={() => setRespondingTo(iq.id)}>Respond</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My quotes */}
      {quotes.length > 0 && (
        <div>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>Quote Requests</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {quotes.map(q => (
              <div key={q.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{q.title}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{vendorName(q.vendor_id)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge ${quoteBadgeClass(q.status)}`} style={{ textTransform: 'capitalize' }}>{q.status}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{new Date(q.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {/* Vendor response details */}
                {q.status === 'quoted' && q.vendor_response && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <p style={{ fontSize: '0.825rem', marginBottom: '0.25rem' }}>
                      <strong>Response:</strong> {q.vendor_response}
                    </p>
                    {q.vendor_price != null && (
                      <p style={{ fontSize: '0.825rem', marginBottom: '0.25rem' }}>
                        <strong>Price:</strong> ${q.vendor_price}
                      </p>
                    )}
                    {q.vendor_available_from && (
                      <p style={{ fontSize: '0.825rem', marginBottom: '0.75rem' }}>
                        <strong>Available from:</strong> {new Date(q.vendor_available_from).toLocaleDateString()}
                      </p>
                    )}
                    {canManageVendors && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => handleAccept(q.id)}>Accept</button>
                        <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => handleReject(q.id)}>Reject</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jobs (managers only) */}
      {canManageVendors && jobs.length > 0 && (
        <div>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem' }}>Scheduled Jobs</h2>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead><tr><th>Title</th><th>Vendor</th><th>Status</th><th>Scheduled</th></tr></thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td>
                      {j.is_emergency_dispatch && <span className="badge badge-red" style={{ marginRight: '0.5rem', fontSize: '0.7rem' }}>Emergency</span>}
                      {j.title}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{vendorName(j.vendor_id)}</td>
                    <td><span className={`badge ${j.status === 'completed' ? 'badge-green' : j.status === 'in_progress' ? 'badge-yellow' : 'badge-gray'}`}>{j.status.replace('_', ' ')}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{j.scheduled_at ? new Date(j.scheduled_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vendor directory */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>Vendor Directory</h2>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {businessTypes.map(t => (
              <button key={t} className={`btn btn-${filterType === t ? 'primary' : 'outline'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.775rem', textTransform: 'capitalize' }}
                onClick={() => setFilterType(t)}>
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '8px' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="placeholder-section"><h3>No vendors yet</h3><p>Approved vendors will appear here.</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filtered.map(v => (
              <div key={v.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{v.name}</h3>
                  <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0, marginLeft: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-gray" style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>{v.business_type}</span>
                    {facilityVendorIds.has(v.id) && !facilityVendors.find(f => f.vendor_id === v.id)?.trust_level && (
                      <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>✓ Approved</span>
                    )}
                    {trustBadge(v.id)}
                  </div>
                </div>
                {v.description && <p style={{ fontSize: '0.825rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>{v.description}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {v.contact_email && <span>✉ {v.contact_email}</span>}
                  {v.contact_phone && <span>☎ {v.contact_phone}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
