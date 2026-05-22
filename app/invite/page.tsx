'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'

interface InvitationData {
  id: string
  email: string
  role: string
  unit_number: string | null
  facility_id: string
  expires_at: string
  accepted_at: string | null
  facility_name: string
}

function InvitePageInner() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'accepted' | 'invalid' | 'joining' | 'done' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Load invitation on mount
  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    const sb = getSupabaseClient()
    ;(sb as any).schema('facility').from('invitations')
      .select('id, email, role, unit_number, facility_id, expires_at, accepted_at, facilities(name)')
      .eq('token', token).single()
      .then(({ data, error }: any) => {
        if (error || !data) { setStatus('invalid'); return }
        if (data.accepted_at) { setStatus('accepted'); return }
        if (new Date(data.expires_at) < new Date()) { setStatus('expired'); return }
        setInvitation({
          id: data.id,
          email: data.email,
          role: data.role,
          unit_number: data.unit_number,
          facility_id: data.facility_id,
          expires_at: data.expires_at,
          accepted_at: data.accepted_at,
          facility_name: data.facilities?.name ?? 'your facility',
        })
        setStatus('valid')
      })
  }, [token])

  // Check if user is already logged in and can join
  async function handleJoin() {
    if (!invitation) return
    setStatus('joining')
    const sb = getSupabaseClient()
    const { data: { user } } = await sb.auth.getUser()

    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite?token=${token}`)
      return
    }

    // Insert into facility.members
    const { error: memberErr } = await (sb as any).schema('facility').from('members').upsert({
      user_id: user.id,
      facility_id: invitation.facility_id,
      role: invitation.role,
      unit_number: invitation.unit_number,
      joined_at: new Date().toISOString(),
    }, { onConflict: 'user_id,facility_id' })

    if (memberErr) { setStatus('error'); setErrorMsg(memberErr.message); return }

    // Mark invitation accepted
    await (sb as any).schema('facility').from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    setStatus('done')
    setTimeout(() => router.replace('/dashboard'), 2000)
  }

  // Render based on status
  if (status === 'loading') return <div className="center"><div className="spinner" /></div>

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', margin: '1rem', padding: '2rem', textAlign: 'center' }}>
        {status === 'invalid' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚫</div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Invalid invitation</h2>
            <p style={{ color: 'var(--muted)' }}>This invitation link is not valid.</p>
          </>
        )}
        {status === 'expired' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏰</div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Invitation expired</h2>
            <p style={{ color: 'var(--muted)' }}>This invitation has expired. Contact your building manager for a new one.</p>
          </>
        )}
        {status === 'accepted' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Already accepted</h2>
            <p style={{ color: 'var(--muted)' }}>This invitation has already been used.</p>
            <a href="/dashboard" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>Go to dashboard</a>
          </>
        )}
        {status === 'valid' && invitation && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏢</div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>You're invited!</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
              Join <strong>{invitation.facility_name}</strong> as a{' '}
              <strong>{invitation.role === 'facility_manager' ? 'Facility Manager' : 'Resident'}</strong>
              {invitation.unit_number ? ` (Unit ${invitation.unit_number})` : ''}.
            </p>
            <button onClick={handleJoin} className="btn btn-primary" style={{ width: '100%' }}>
              Accept invitation
            </button>
          </>
        )}
        {status === 'joining' && (
          <>
            <div className="spinner" style={{ margin: '1rem auto' }} />
            <p style={{ color: 'var(--muted)' }}>Setting up your account…</p>
          </>
        )}
        {status === 'done' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Welcome aboard!</h2>
            <p style={{ color: 'var(--muted)' }}>Redirecting to your dashboard…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Something went wrong</h2>
            <p style={{ color: 'var(--muted)' }}>{errorMsg ?? 'Please try again.'}</p>
            <button onClick={handleJoin} className="btn btn-primary" style={{ marginTop: '1rem' }}>Retry</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="center"><div className="spinner" /></div>}>
      <InvitePageInner />
    </Suspense>
  )
}
