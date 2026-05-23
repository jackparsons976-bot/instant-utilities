'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface AccessData {
  facility_id: string
  display_name: string
  relationship: string
  incident: {
    id: string
    title: string
    incident_type: string
    severity: number
  } | null
}

const SEV_COLOR = ['', '#dc2626', '#ea580c', '#d97706', '#16a34a', '#6b7280']

function HouseholdAccessInner() {
  const params = useSearchParams()
  const token = params.get('token')

  const [data, setData] = useState<AccessData | null>(null)
  const [status, setStatus] = useState<'loading' | 'invalid' | 'ready'>('loading')

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    const sb = getSupabaseClient() as any
    sb.rpc('get_household_access_data', { p_token: token }, { schema: 'facility' })
      .then(({ data: result, error }: { data: AccessData | null; error: unknown }) => {
        if (error || !result) { setStatus('invalid'); return }
        setData(result)
        setStatus('ready')
      })
  }, [token])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Invalid or expired link</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            This access link is not valid. Ask your household member to generate a new one from their Household page.
          </p>
        </div>
      </div>
    )
  }

  const incident = data!.incident

  return (
    <div style={{ minHeight: '100vh', background: incident ? '#1a1a1a' : '#f9fafb', color: incident ? '#fff' : 'var(--fg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', color: incident ? '#9ca3af' : 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          Household access
        </div>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
          {data!.display_name}
        </h1>
        <div style={{ fontSize: '0.85rem', color: incident ? '#9ca3af' : 'var(--muted)', textTransform: 'capitalize', marginTop: '0.1rem' }}>
          {data!.relationship}
        </div>
      </div>

      {/* Active incident */}
      {incident ? (
        <>
          <div style={{ background: SEV_COLOR[incident.severity] ?? '#dc2626', borderRadius: '12px', padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.85, marginBottom: '0.4rem' }}>
              ACTIVE EMERGENCY
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{incident.title}</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.85, marginTop: '0.25rem', textTransform: 'capitalize' }}>
              {incident.incident_type.replaceAll('_', ' ')}
            </div>
          </div>

          <a href="tel:000" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            background: '#dc2626', color: '#fff', borderRadius: '12px', padding: '1rem',
            fontSize: '1.1rem', fontWeight: 700, textDecoration: 'none',
          }}>
            Call 000 — Police / Fire / Ambulance
          </a>

          <div style={{ background: '#262626', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: '0.75rem' }}>Emergency guidance</div>
            <ol style={{ margin: 0, padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', color: '#e5e7eb', fontSize: '0.9rem' }}>
              <li>Stay calm and move away from the hazard area.</li>
              <li>Follow emergency exit signs to the nearest exit.</li>
              <li>Do not use lifts — use stairs only.</li>
              <li>Proceed to the designated assembly point outside.</li>
              <li>Do not re-enter the building until all-clear is given.</li>
            </ol>
          </div>

          <div style={{ background: '#262626', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: '#4ade80', marginBottom: '0.5rem' }}>Assembly point</div>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
              Proceed to the designated assembly area outside the building and wait for emergency services.
            </p>
          </div>
        </>
      ) : (
        <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <div style={{ fontWeight: 700, color: '#166534', fontSize: '1.1rem' }}>All clear</div>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.4rem', marginBottom: 0 }}>
            No active incidents at this facility. This page will show emergency guidance if an incident occurs.
          </p>
        </div>
      )}

      <p style={{ fontSize: '0.75rem', color: incident ? '#6b7280' : 'var(--muted)', textAlign: 'center', marginTop: 'auto' }}>
        Read-only emergency access for household member.
      </p>
    </div>
  )
}

export default function HouseholdAccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}>
      <HouseholdAccessInner />
    </Suspense>
  )
}
