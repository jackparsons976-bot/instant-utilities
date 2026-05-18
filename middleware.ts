import { NextRequest, NextResponse } from 'next/server'

function decodeJWT(token: string) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'))
  } catch { return null }
}

function getAccessToken(req: NextRequest): string | null {
  // Supabase SSR stores the session in a cookie named sb-<ref>-auth-token
  for (const [name, value] of req.cookies) {
    if (name.includes('-auth-token') && !name.endsWith('.0') && !name.endsWith('.1')) {
      try {
        const parsed = JSON.parse(value)
        if (parsed?.access_token) return parsed.access_token
      } catch { /* chunked cookie */ }
    }
    // chunked cookies: sb-*-auth-token.0 holds the JSON start
    if (name.includes('-auth-token.0')) {
      try {
        const parsed = JSON.parse(value)
        if (parsed?.access_token) return parsed.access_token
      } catch { /* ignore */ }
    }
  }
  return null
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const token = getAccessToken(req)
    const claims = token ? decodeJWT(token) : null
    const role: string =
      claims?.app_metadata?.platform_role ?? claims?.platform_role ?? 'resident'

    if (role !== 'platform_admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
