'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Vendor { id: string; name: string; description: string | null; business_type: string; contact_email: string | null; contact_phone: string | null }

export default function MarketplacePage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSupabaseClient().schema('marketplace').from('business_profiles')
      .select('id, name, description, business_type, contact_email, contact_phone')
      .eq('is_approved', true).eq('is_active', true)
      .then(({ data }) => { setVendors((data ?? []) as Vendor[]); setLoading(false) })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Marketplace</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Approved local vendors and service providers</p>
      </div>
      {loading ? <p style={{ color: 'var(--muted)' }}>Loading…</p>
        : vendors.length === 0 ? <div className="placeholder-section"><h3>No vendors yet</h3><p>Approved vendors will appear here.</p></div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {vendors.map(v => (
              <div key={v.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{v.name}</h3>
                  <span className="badge badge-gray" style={{ textTransform: 'capitalize', flexShrink: 0, marginLeft: '0.5rem' }}>{v.business_type}</span>
                </div>
                {v.description && <p style={{ fontSize: '0.825rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '0.75rem' }}>{v.description}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {v.contact_email && <span>✉️ {v.contact_email}</span>}
                  {v.contact_phone && <span>📞 {v.contact_phone}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      <div className="placeholder-section">
        <h3>🛒 Quote requests</h3>
        <p>Request quotes from approved vendors — Phase 4</p>
      </div>
    </div>
  )
}
