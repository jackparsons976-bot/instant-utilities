'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/util/supabase/client'

export default function DashboardPage() {
  const { session, loading } = useAuth()
  const router = useRouter()

  // Client-side protection: no session → back to login.
  useEffect(() => {
    if (!loading && !session) router.replace('/login')
  }, [session, loading, router])

  async function handleLogout() {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    // onAuthStateChange fires SIGNED_OUT → AuthProvider sets session to null
    // → the useEffect above redirects to /login.
  }

  if (loading || !session) {
    return (
      <main style={centerStyle}>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Loading…</p>
      </main>
    )
  }

  const { user } = session

  return (
    <main style={{ padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Dashboard</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.4rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Log out
        </button>
      </div>

      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.5rem 1rem', fontSize: '0.9rem' }}>
        <dt style={{ color: '#666' }}>User ID</dt>
        <dd style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
          {user.id}
        </dd>

        <dt style={{ color: '#666' }}>Email</dt>
        <dd>{user.email}</dd>

        <dt style={{ color: '#666' }}>Last sign in</dt>
        <dd>{new Date(user.last_sign_in_at ?? '').toLocaleString()}</dd>

        <dt style={{ color: '#666' }}>Session expires</dt>
        <dd>{new Date(session.expires_at! * 1000).toLocaleString()}</dd>
      </dl>
    </main>
  )
}

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
}
