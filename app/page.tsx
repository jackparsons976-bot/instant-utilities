'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'

export default function HomePage() {
  const { session, loading } = useAuth()
  const router = useRouter()

  // Already logged in — skip landing, go straight to dashboard.
  useEffect(() => {
    if (!loading && session) router.replace('/dashboard')
  }, [session, loading, router])

  if (loading) return null

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Harbourview</h1>
      <Link
        href="/login"
        style={{
          padding: '0.5rem 1.5rem',
          background: '#000',
          color: '#fff',
          borderRadius: '6px',
          textDecoration: 'none',
          fontSize: '0.95rem',
        }}
      >
        Login
      </Link>
    </main>
  )
}
