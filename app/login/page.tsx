'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)

  useEffect(() => {
    if (!loading && session) router.replace('/dashboard')
  }, [session, loading, router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const sb = getSupabaseClient()
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setBusy(false); return }
    // Navigation handled by the useEffect above once session state commits
  }

  if (loading) return <div className="center"><p style={{ color: 'var(--muted)' }}>Loading…</p></div>

  return (
    <div className="center">
      <div style={{ width: '100%', maxWidth: '380px', padding: '0 1.25rem' }}>

        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.1rem' }}>Instant Utilities</Link>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" placeholder="you@example.com"
              autoComplete="email" required value={email}
              onChange={e => setEmail(e.target.value)} disabled={busy} />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" placeholder="••••••••"
              autoComplete="current-password" required value={password}
              onChange={e => setPassword(e.target.value)} disabled={busy} />
          </div>

          {error && <p className="error-msg" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={busy}
            style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
          Demo: admin@harbourview.dev / SeedPassword123!
        </p>
      </div>
    </div>
  )
}
