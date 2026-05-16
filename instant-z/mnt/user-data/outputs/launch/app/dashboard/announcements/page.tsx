'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Announcement {
  id: string
  title: string
  body: string
  published_at: string | null
  author_id: string
}

export default function AnnouncementsPage() {
  const { session } = useAuth()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const facilityId = session?.user?.app_metadata?.active_facility_ids?.[0]

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    getSupabaseClient()
      .schema('facility').from('announcements')
      .select('id, title, body, published_at, author_id')
      .eq('facility_id', facilityId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setItems((data ?? []) as Announcement[]); setLoading(false) })
  }, [facilityId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Announcements</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Building notices and updates</p>
      </div>
      {loading ? <p style={{ color: 'var(--muted)' }}>Loading…</p>
        : items.length === 0 ? (
          <div className="placeholder-section"><h3>No announcements</h3><p>Nothing posted yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map(a => (
              <div key={a.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{a.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
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
