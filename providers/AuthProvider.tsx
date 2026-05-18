'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase/client'

interface AuthContextValue {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true })

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const supabase = getSupabaseClient()

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        // Force a fresh JWT so hook claims are always current
        const { data: refreshed } = await supabase.auth.refreshSession()
        setSession(refreshed.session)
      } else {
        setSession(null)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (_event === 'SIGNED_IN' && session) {
          const { data: refreshed } = await supabase.auth.refreshSession()
          setSession(refreshed.session ?? session)
        } else {
          setSession(session)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
