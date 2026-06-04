'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase/client'

function decodeJWT(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch { return null }
}

interface AuthContextValue {
  session: Session | null
  jwtClaims: Record<string, any> | null
  loading: boolean
  timedOut: boolean
}

const AuthContext = createContext<AuthContextValue>({ session: null, jwtClaims: null, loading: true, timedOut: false })

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [jwtClaims, setJwtClaims] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const initialized = useRef(false)

  function applySession(s: Session | null) {
    setSession(s)
    setJwtClaims(s?.access_token ? decodeJWT(s.access_token) : null)
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const supabase = getSupabaseClient()

    ;(async () => {
      // Phase 1: getSession() reads from localStorage — it's synchronous in practice
      // but we still guard it with a timeout in case the storage layer hangs (e.g.
      // Safari ITP, corrupted IndexedDB). 8s is generous enough for any real hang.
      let sessionTimedOut = false
      let initialSession: import('@supabase/supabase-js').Session | null = null

      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => { sessionTimedOut = true; reject(new Error('timeout')) }, 8000)
          ),
        ])
        initialSession = (result as any).data?.session ?? null
      } catch {
        // Either a real error or our 8s timeout
      }

      if (sessionTimedOut) {
        // Storage is genuinely hung — clear it and surface the recovery UI
        try { localStorage.clear() } catch {}
        try { sessionStorage.clear() } catch {}
        applySession(null)
        setTimedOut(true)
        setLoading(false)
        return
      }

      if (!initialSession) {
        // No session stored — user is logged out
        applySession(null)
        setLoading(false)
        return
      }

      // Phase 2: We have a session — refresh the JWT so hook claims are current.
      // This is a network call; we do NOT race it against a short timeout because
      // a slow refresh should not log the user out. onAuthStateChange will fire
      // TOKEN_REFRESHED when the SDK auto-refreshes in the background anyway.
      try {
        const { data: refreshed } = await supabase.auth.refreshSession()
        applySession(refreshed.session ?? initialSession)
      } catch {
        // Refresh failed (offline, etc.) — use the stored session as-is
        applySession(initialSession)
      }
      setLoading(false)
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (_event === 'SIGNED_IN' && session) {
          const { data: refreshed } = await supabase.auth.refreshSession()
          applySession(refreshed.session ?? session)
        } else {
          applySession(session)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, jwtClaims, loading, timedOut }}>
      {children}
    </AuthContext.Provider>
  )
}
