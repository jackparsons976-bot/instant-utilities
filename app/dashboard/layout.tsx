'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { AppNav } from '@/components/AppNav'
import { Sidebar } from '@/components/Sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, jwtClaims, loading, timedOut } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !session) router.replace('/login?reason=session_expired')
  }, [session, loading, router])

  if (!loading && !session) return null

  if (loading && timedOut) return (
    <div className="center" style={{ flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" />
      <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--muted)' }}>
        Taking too long?{' '}
        <button
          onClick={() => { localStorage.clear(); sessionStorage.clear(); location.reload() }}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}
        >
          Click here to reload
        </button>
      </div>
    </div>
  )

  const role = jwtClaims?.app_metadata?.platform_role ?? jwtClaims?.platform_role ?? 'resident'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNav onMenuToggle={() => setMobileMenuOpen(v => !v)} />
      <div className="app-layout">
        <Sidebar role={role} />
        <main className="main-content">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton" style={{ height: '32px', width: '40%', borderRadius: '6px' }} />
              <div className="skeleton" style={{ height: '120px', borderRadius: '8px' }} />
              <div className="skeleton" style={{ height: '80px', borderRadius: '8px' }} />
              <div className="skeleton" style={{ height: '80px', borderRadius: '8px' }} />
            </div>
          ) : (
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          )}
          <footer style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.25rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
            <Link href="/privacy" style={{ color: 'var(--muted)' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: 'var(--muted)' }}>Terms of Service</Link>
          </footer>
        </main>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <>
          <div className="sidebar-overlay" style={{ display: 'block' }} onClick={() => setMobileMenuOpen(false)} />
          <div className="sidebar-mobile">
            <button className="sidebar-mobile-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
            <Sidebar role={role} onItemClick={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}
