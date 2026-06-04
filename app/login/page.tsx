'use client'

import { useState, FormEvent, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'

function LoginPageInner() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    if (!loading && session) router.replace('/dashboard')
  }, [session, loading, router])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('pwa-prompt-dismissed')) return
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismissInstall() {
    localStorage.setItem('pwa-prompt-dismissed', '1')
    setShowInstallBanner(false)
  }

  async function triggerInstall() {
    if (!installPrompt) return
    ;(installPrompt as any).prompt()
    const { outcome } = await (installPrompt as any).userChoice
    if (outcome === 'accepted') localStorage.setItem('pwa-prompt-dismissed', '1')
    setShowInstallBanner(false)
    setInstallPrompt(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Email is required'); return }
    if (!password) { setError('Password is required'); return }
    setBusy(true)
    const sb = getSupabaseClient()
    try {
      const result = await Promise.race([
        sb.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10000)
        ),
      ])
      if (result.error) {
        setError(result.error.message)
        setBusy(false)
      }
      // On success: navigation handled by the useEffect above once session commits
    } catch (err: any) {
      setError(
        err?.message === 'timeout'
          ? 'Sign in failed — please try again.'
          : (err?.message ?? 'Sign in failed — please try again.')
      )
      setBusy(false)
    }
  }

  if (loading) return <div className="center"><p style={{ color: 'var(--muted)' }}>Loading…</p></div>

  return (
    <div className="center">
      <div style={{ width: '100%', maxWidth: '380px', padding: '0 1.25rem' }}>

        {reason === 'session_expired' && (
          <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
            Your session expired — please sign in again.
          </div>
        )}

        {/* PWA install prompt — shown once on mobile */}
        {showInstallBanner && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px',
            padding: '0.875rem 1rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <img src="/icon-192.png" alt="" style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#166534' }}>Add to Home Screen</div>
              <div style={{ fontSize: '0.775rem', color: '#6b7280', marginTop: '0.1rem' }}>Get quick access to emergency features</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={triggerInstall}
                style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Install
              </button>
              <button
                onClick={dismissInstall}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0.25rem' }}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.1rem' }}>Instant Utilities</Link>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" placeholder="you@example.com"
              autoComplete="email" value={email}
              onChange={e => setEmail(e.target.value)} disabled={busy} />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" placeholder="••••••••"
              autoComplete="current-password" value={password}
              onChange={e => setPassword(e.target.value)} disabled={busy} />
          </div>

          {error && <p className="error-msg" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={busy}
            style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            <Link href="/forgot-password" style={{ color: 'var(--muted)' }}>Forgot password?</Link>
            <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: 500 }}>Create account</Link>
          </div>
        </form>

        {process.env.NEXT_PUBLIC_SHOW_DEMO_HINT === 'true' && (
          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
            Demo: admin@harbourview.dev / SeedPassword123!
          </p>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1.25rem', fontSize: '0.75rem' }}>
          <Link href="/privacy" style={{ color: 'var(--muted)' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: 'var(--muted)' }}>Terms of Service</Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
