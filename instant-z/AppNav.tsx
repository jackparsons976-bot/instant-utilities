'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'

export function AppNav() {
  const { session } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await getSupabaseClient().auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="nav">
      <Link href="/dashboard" className="nav-logo">Instant Utilities</Link>
      <div className="nav-links">
        {session && (
          <>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              {session.user.email}
            </span>
            <button onClick={handleLogout} className="btn btn-outline"
              style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}>
              Log out
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
