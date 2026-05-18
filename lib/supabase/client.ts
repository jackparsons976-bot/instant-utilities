import { createClient } from '@supabase/supabase-js'

// Custom storage adapter: persists session in localStorage (client-side)
// and writes just the access_token to a cookie so middleware can read it.
const cookieBridgeStorage = {
  getItem(key: string): string | null {
    return window.localStorage.getItem(key)
  },
  setItem(key: string, value: string): void {
    window.localStorage.setItem(key, value)
    try {
      const parsed = JSON.parse(value)
      const token: string | undefined = parsed?.access_token ?? parsed?.currentSession?.access_token
      if (token) {
        // SameSite=Strict; no Secure flag so it works on localhost too
        document.cookie = `sb-access-token=${token}; path=/; SameSite=Strict; max-age=3600`
      }
    } catch {
      // value wasn't JSON (shouldn't happen for auth storage)
    }
  },
  removeItem(key: string): void {
    window.localStorage.removeItem(key)
    document.cookie = 'sb-access-token=; path=/; max-age=0'
  },
}

let client: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (client) return client
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        storageKey: 'sb-auth-token',
        storage: typeof window !== 'undefined' ? cookieBridgeStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    }
  )
  return client
}
