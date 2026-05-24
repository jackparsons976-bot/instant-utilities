'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [done, setDone]     = useState(false)
  const [ready, setReady]   = useState(false)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) { setInvalid(true); return }
    const sb = getSupabaseClient()
    sb.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) { setInvalid(true) } else { setReady(true) }
    })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!newPassword) { setError('Password is required'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setBusy(true)
    const sb = getSupabaseClient()
    const { error } = await sb.auth.updateUser({ password: newPassword })
    if (error) { setError(error.message); setBusy(false); return }
    setDone(true)
  }

  return (
    <div className="center">
      <div style={{ width: '100%', maxWidth: '380px', padding: '0 1.25rem' }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.1rem' }}>Instant Utilities</Link>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>Set a new password</p>
        </div>

        {invalid && (
          <div className="alert alert-danger">
            Invalid or expired reset link.{' '}
            <Link href="/login" style={{ color: 'inherit', textDecoration: 'underline' }}>Back to sign in</Link>
          </div>
        )}

        {done && (
          <div className="alert alert-success">
            Password updated!{' '}
            <Link href="/login" style={{ color: 'inherit', textDecoration: 'underline' }}>Sign in</Link>
          </div>
        )}

        {ready && !done && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="new-password">New password</label>
              <input id="new-password" type="password" className="input" placeholder="Min. 8 characters"
                autoComplete="new-password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} disabled={busy} />
            </div>

            <div className="field">
              <label className="label" htmlFor="confirm-password">Confirm password</label>
              <input id="confirm-password" type="password" className="input" placeholder="Repeat password"
                autoComplete="new-password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} disabled={busy} />
            </div>

            {error && <p className="error-msg" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={busy}
              style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        {!invalid && !done && (
          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
            <Link href="/login" style={{ color: 'var(--muted)' }}>Back to sign in</Link>
          </p>
        )}
      </div>
    </div>
  )
}
