'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Announcement {
  id: string; title: string; body: string
  published_at: string | null; author_id: string; expires_at: string | null
}

function expiryBadge(expiresAt: string | null) {
  if (!expiresAt) return null
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff < 0) return <span className="badge badge-gray" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Expired</span>
  if (diff < 48 * 60 * 60 * 1000) {
    const hours = Math.ceil(diff / (60 * 60 * 1000))
    return <span className="badge badge-yellow" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Expires in {hours}h</span>
  }
  return null
}

export default function AnnouncementsPage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [aTitle, setATitle] = useState('')
  const [aBody, setABody]   = useState('')
  const [aExpiry, setAExpiry] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const facilityId = session?.user?.app_metadata?.active_facility_ids?.[0]
  const role = (session?.user?.app_metadata?.platform_role as string) ?? 'resident'
  const isManager = role === 'facility_manager' || role === 'platform_admin'

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    getSupabaseClient().schema('facility').from('announcements')
      .select('id, title, body, published_at, author_id, expires_at')
      .eq('facility_id', facilityId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(30)
      .then(({ data }) => { setItems((data ?? []) as Announcement[]); setLoading(false) })
  }, [facilityId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!session || !facilityId) return
    setSubmitting(true)
    const { data, error } = await getSupabaseClient().schema('facility').from('announcements').insert({
      facility_id: facilityId,
      author_id: session.user.id,
      title: aTitle,
      body: aBody,
      published_at: new Date().toISOString(),
      expires_at: aExpiry || null,
    }).select().single()
    if (error) { toast('Failed to post: ' + error.message, 'error'); setSubmitting(false); return }
    setItems(prev => [data as Announcement, ...prev])
    setATitle(''); setABody(''); setAExpiry('')
    setShowForm(false)
    toast('Announcement posted.', 'success')
    setSubmitting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Announcements</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Building notices and updates</p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
            {showForm ? 'Cancel' : '+ New announcement'}
          </button>
        )}
      </div>

      {isManager && showForm && (
        <div className="card">
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Post announcement</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="field">
              <label className="label">Title *</label>
              <input className="input" required value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="Announcement title…" />
            </div>
            <div className="field">
              <label className="label">Body *</label>
              <textarea className="input" required value={aBody} onChange={e => setABody(e.target.value)}
                placeholder="Write your announcement…" rows={4} style={{ resize: 'vertical' }} />
            </div>
            <div className="field">
              <label className="label">Expires at (optional)</label>
              <input className="input" type="datetime-local" value={aExpiry} onChange={e => setAExpiry(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
              {submitting ? 'Posting…' : 'Post announcement'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '8px' }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="placeholder-section">
          <h3>No announcements yet</h3>
          <p>{isManager ? 'Post your first announcement using the button above.' : 'Nothing posted yet. Check back later.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map(a => (
            <div key={a.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {a.title}{expiryBadge(a.expires_at)}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', flexShrink: 0 }}>
                  {a.published_at ? new Date(a.published_at).toLocaleDateString() : ''}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6 }}>{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
