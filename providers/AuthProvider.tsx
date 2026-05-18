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
}

const AuthContext = createContext<AuthContextValue>({ session: null, jwtClaims: null, loading: true })

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [jwtClaims, setJwtClaims] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  function applySession(s: Session | null) {
    setSession(s)
    setJwtClaims(s?.access_token ? decodeJWT(s.access_token) : null)
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const supabase = getSupabaseClient()

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // Force a fresh JWT so hook claims are always current
        const { data: refreshed } = await supabase.auth.refreshSession()
        applySession(refreshed.session)
      } else {
        applySession(null)
      }
      setLoading(false)
    })

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
    <AuthContext.Provider value={{ session, jwtClaims, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
