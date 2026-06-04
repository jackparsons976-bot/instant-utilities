'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'

export default function HomePage() {
  const { session, loading, timedOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && session) router.replace('/dashboard')
  }, [session, loading, router])

  if (loading) return (
    <div className="center" style={{ flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" />
      {timedOut && (
        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--muted)' }}>
          Taking too long?{' '}
          <button
            onClick={() => { localStorage.clear(); sessionStorage.clear(); location.reload() }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}
          >
            Click here to reload
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav className="nav">
        <span className="nav-logo">Instant Utilities</span>
        <div className="nav-links">
          <Link href="/signup" className="btn btn-outline" style={{ padding: '0.4rem 0.9rem' }}>
            Create account
          </Link>
          <Link href="/login" className="btn btn-primary" style={{ padding: '0.4rem 0.9rem' }}>
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <span className="badge badge-black" style={{ marginBottom: '1.5rem' }}>
          Building Intelligence Platform
        </span>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', maxWidth: '700px', marginBottom: '1.25rem' }}>
          Emergency coordination for modern buildings
        </h1>

        <p style={{ fontSize: '1.1rem', color: 'var(--muted)', maxWidth: '520px', marginBottom: '2.5rem', lineHeight: 1.7 }}>
          Real-time SOS response, QR-based indoor navigation, hazard mapping, and facility operations — all in one platform.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontSize: '1rem' }}>
            Get started free
          </Link>
          <Link href="#features" className="btn btn-outline" style={{ padding: '0.65rem 1.5rem', fontSize: '1rem' }}>
            Learn more
          </Link>
          <Link href="/login" className="btn btn-outline" style={{ padding: '0.65rem 1.5rem', fontSize: '1rem' }}>
            Sign in
          </Link>
        </div>
      </main>

      {/* Features */}
      <section id="features" style={{ padding: '4rem 1.5rem', borderTop: '1px solid var(--border)', background: '#fafafa' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, marginBottom: '3rem' }}>
            Everything your building needs
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="card"
                style={{ transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
              >
                <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                <h3 style={{ fontWeight: 600, marginBottom: '0.4rem' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
        <div style={{ marginBottom: '0.4rem' }}>
          © {new Date().getFullYear()} Instant Utilities. All rights reserved.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ color: 'var(--muted)' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: 'var(--muted)' }}>Terms of Service</Link>
          <a href="mailto:support@instant-utilities.com" style={{ color: 'var(--muted)' }}>Contact Support</a>
        </div>
      </footer>
    </div>
  )
}

const FEATURES = [
  { icon: '🆘', title: 'SOS Response', desc: 'One-tap emergency alerts with QR-linked indoor location and responder routing.' },
  { icon: '🔥', title: 'Hazard Mapping', desc: 'Residents place live fire, smoke, and blocked exit markers during incidents.' },
  { icon: '🗺️', title: 'QR Navigation', desc: 'Indoor positioning via QR nodes with pre-computed evacuation routes.' },
  { icon: '🏢', title: 'Facility Ops', desc: 'Manage residents, maintenance requests, announcements, and vendors.' },
  { icon: '🛒', title: 'Marketplace', desc: 'Connect facilities with trusted local service providers and contractors.' },
  { icon: '📡', title: 'Real-time', desc: 'Live emergency updates, hazard changes, and evacuation route recalculation.' },
]
