'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)
  const [done, setDone]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Email is required'); return }
    setBusy(true)
    const sb = getSupabaseClient()
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (error) { setError(error.message); setBusy(false); return }
    setDone(true)
  }

  return (
    <div className="center">
      <div style={{ width: '100%', maxWidth: '380px', padding: '0 1.25rem' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.1rem' }}>Instant Utilities</Link>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>Reset your password</p>
        </div>

        {done ? (
          <div className="alert alert-success">
            If that email is registered, you&rsquo;ll receive a reset link shortly.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" placeholder="you@example.com"
                autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)} disabled={busy} />
            </div>

            {error && <p className="error-msg" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={busy}
              style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
          <Link href="/login" style={{ color: 'var(--muted)' }}>Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
