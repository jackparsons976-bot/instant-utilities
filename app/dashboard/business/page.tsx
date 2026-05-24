'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'

interface BusinessProfile {
  id: string; business_name: string; abn: string; business_type: string
  contact_name: string; contact_phone: string; contact_email: string
  description: string; service_radius_km: number; response_time_hours: number
  is_emergency_provider: boolean; status: string; user_id: string
}

export default function BusinessProfilePage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<BusinessProfile>>({})

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return }
    const sb = getSupabaseClient() as any
    sb.schema('marketplace').from('business_profiles')
      .select('*').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }: { data: BusinessProfile | null }) => {
        setProfile(data)
        if (data) setForm(data)
        setLoading(false)
      })
  }, [session?.user?.id])

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    const sb = getSupabaseClient() as any
    const { error } = await sb.schema('marketplace').from('business_profiles')
      .update({
        business_name: form.business_name,
        abn: form.abn,
        business_type: form.business_type,
        contact_name: form.contact_name,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        description: form.description,
        service_radius_km: form.service_radius_km,
        response_time_hours: form.response_time_hours,
        is_emergency_provider: form.is_emergency_provider,
      })
      .eq('id', profile.id)
    if (error) { toast('Failed to save: ' + error.message, 'error'); setSaving(false); return }
    setProfile({ ...profile, ...form } as BusinessProfile)
    setEditing(false)
    setSaving(false)
    toast('Profile updated.', 'success')
  }

  async function toggleAvailability() {
    if (!profile) return
    const newStatus = profile.status === 'active' ? 'inactive' : 'active'
    const sb = getSupabaseClient() as any
    const { error } = await sb.schema('marketplace').from('business_profiles')
      .update({ status: newStatus }).eq('id', profile.id)
    if (error) { toast('Failed to update availability.', 'error'); return }
    setProfile({ ...profile, status: newStatus })
    toast(`Now ${newStatus === 'active' ? 'available' : 'unavailable'}.`, 'success')
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="skeleton" style={{ height: '28px', width: '35%', borderRadius: '6px' }} />
      <div className="skeleton" style={{ height: '100px', borderRadius: '8px' }} />
      <div className="skeleton" style={{ height: '100px', borderRadius: '8px' }} />
    </div>
  )
  if (!profile) return (
    <div className="placeholder-section">
      <h3>No business profile</h3>
      <p>You don't have a business profile yet.</p>
      <a href="/business/register" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Register your business</a>
    </div>
  )

  function field(label: string, key: keyof BusinessProfile, type = 'text') {
    return (
      <div className="field">
        <label className="label">{label}</label>
        {editing
          ? <input className="input" type={type} value={String(form[key] ?? '')} onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))} />
          : <p style={{ fontSize: '0.875rem', padding: '0.4rem 0', color: 'var(--fg)' }}>{String(profile[key] ?? '—')}</p>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Business Profile</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Manage your marketplace listing</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`badge ${profile.status === 'active' ? 'badge-green' : profile.status === 'pending' ? 'badge-yellow' : 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{profile.status}</span>
          {profile.status !== 'pending' && (
            <button className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={toggleAvailability}>
              {profile.status === 'active' ? 'Set unavailable' : 'Set available'}
            </button>
          )}
          {!editing && <button className="btn btn-primary" style={{ fontSize: '0.85rem' }} onClick={() => setEditing(true)}>Edit</button>}
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1rem' }}>Business details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {field('Business name', 'business_name')}
          {field('ABN', 'abn')}
          {field('Business type', 'business_type')}
          {field('Service radius (km)', 'service_radius_km', 'number')}
          {field('Response time (hours)', 'response_time_hours', 'number')}
        </div>
        <div className="field" style={{ marginTop: '0.75rem' }}>
          <label className="label">Description</label>
          {editing
            ? <textarea className="input" rows={3} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
            : <p style={{ fontSize: '0.875rem', padding: '0.4rem 0', color: 'var(--fg)' }}>{profile.description || '—'}</p>}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: editing ? 'pointer' : 'default', fontSize: '0.875rem', marginTop: '0.75rem' }}>
          <input type="checkbox" disabled={!editing} checked={editing ? !!form.is_emergency_provider : profile.is_emergency_provider}
            onChange={e => setForm(f => ({ ...f, is_emergency_provider: e.target.checked }))} style={{ width: '1rem', height: '1rem' }} />
          Emergency callout available
        </label>
      </div>

      <div className="card">
        <h2 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1rem' }}>Contact details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {field('Contact name', 'contact_name')}
          {field('Contact phone', 'contact_phone')}
          {field('Contact email', 'contact_email')}
        </div>
      </div>

      {editing && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          <button className="btn btn-outline" onClick={() => { setEditing(false); setForm(profile) }}>Cancel</button>
        </div>
      )}
    </div>
  )
}
