'use client'

import { useState, FormEvent } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function BusinessRegisterPage() {
  const [businessName, setBusinessName] = useState('')
  const [abn, setAbn] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [description, setDescription] = useState('')
  const [serviceRadiusKm, setServiceRadiusKm] = useState(50)
  const [responseTimeHours, setResponseTimeHours] = useState(24)
  const [isEmergencyProvider, setIsEmergencyProvider] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const sb = getSupabaseClient()
    const { data: authData, error: signUpError } = await sb.auth.signUp({
      email: contactEmail,
      password: crypto.randomUUID(),
    })
    if (signUpError) { setError(signUpError.message); setSubmitting(false); return }
    const userId = authData.user?.id
    if (!userId) { setError('Account creation failed.'); setSubmitting(false); return }
    const { error: insertError } = await (sb as any).schema('marketplace').from('business_profiles').insert({
      business_name: businessName,
      abn,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      description,
      service_radius_km: serviceRadiusKm,
      response_time_hours: responseTimeHours,
      is_emergency_provider: isEmergencyProvider,
      status: 'pending',
      user_id: userId,
    })
    if (insertError) { setError(insertError.message); setSubmitting(false); return }
    setDone(true)
    setSubmitting(false)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '480px', width: '100%', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Application submitted for review.</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          We will review your application and contact you at {contactEmail}.
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' }}>Register your business</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Join the Instant Utilities marketplace as a service provider.</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>Business details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="field">
                <label className="label">Business name *</label>
                <input className="input" required value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Acme Services Pty Ltd" />
              </div>
              <div className="field">
                <label className="label">ABN *</label>
                <input className="input" required value={abn} onChange={e => setAbn(e.target.value)} placeholder="12 345 678 901" />
              </div>
            </div>
            <div className="field">
              <label className="label">Business type *</label>
              <input className="input" required value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="e.g. Plumbing, Electrical, HVAC…" />
            </div>
            <div className="field">
              <label className="label">Service description *</label>
              <textarea className="input" required rows={3} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe your services, specialisations, and experience…" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="field">
                <label className="label">Service radius (km)</label>
                <input className="input" type="number" min={1} max={500} value={serviceRadiusKm} onChange={e => setServiceRadiusKm(Number(e.target.value))} />
              </div>
              <div className="field">
                <label className="label">Response time (hours)</label>
                <input className="input" type="number" min={1} max={168} value={responseTimeHours} onChange={e => setResponseTimeHours(Number(e.target.value))} />
              </div>
            </div>
            <h2 style={{ fontWeight: 600, fontSize: '1rem', marginTop: '0.5rem', marginBottom: '0.25rem' }}>Contact details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="field">
                <label className="label">Contact name *</label>
                <input className="input" required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="field">
                <label className="label">Contact phone *</label>
                <input className="input" required type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+61 4xx xxx xxx" />
              </div>
            </div>
            <div className="field">
              <label className="label">Contact email *</label>
              <input className="input" required type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="contact@yourbusiness.com" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={isEmergencyProvider} onChange={e => setIsEmergencyProvider(e.target.checked)}
                style={{ width: '1rem', height: '1rem' }} />
              Emergency callout available (24/7 response)
            </label>
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '0.5rem' }}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
