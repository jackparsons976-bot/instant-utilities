'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { AppNav } from '@/components/AppNav'
import { Sidebar } from '@/components/Sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, jwtClaims, loading } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !session) router.replace('/login')
  }, [session, loading, router])

  if (loading) {
    return (
      <div className="center">
        <div className="spinner" />
      </div>
    )
  }

  if (!session) return null

  const role = jwtClaims?.app_metadata?.platform_role ?? jwtClaims?.platform_role ?? 'resident'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNav onMenuToggle={() => setMobileMenuOpen(v => !v)} />
      <div className="app-layout">
        <Sidebar role={role} />
        <main className="main-content">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
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
