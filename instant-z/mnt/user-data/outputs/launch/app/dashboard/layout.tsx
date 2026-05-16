'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { AppNav } from '@/components/AppNav'
import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) router.replace('/login')
  }, [session, loading, router])

  if (loading) {
    return (
      <div className="center">
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    )
  }

  if (!session) return null

  const role = (session.user.app_metadata?.platform_role as string) ?? 'resident'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNav />
      <div className="app-layout">
        <Sidebar role={role} />
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
