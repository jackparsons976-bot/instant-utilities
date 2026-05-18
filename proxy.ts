import { NextRequest, NextResponse } from 'next/server'

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // base64url → base64 → decode
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('sb-access-token')?.value ?? null

  const payload = token ? decodeJwtPayload(token) : null
  const isAuthenticated = payload !== null && typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()

  // Protect all /dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect /admin — requires platform_admin role
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
    const appMeta = payload?.app_metadata as Record<string, unknown> | undefined
    const platformRole = (appMeta?.platform_role ?? payload?.platform_role) as string | undefined
    if (platformRole !== 'platform_admin') {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  // /monitoring is the Sentry tunnel route — excluded by not matching it here
  matcher: ['/dashboard/:path*', '/admin/:path*', '/admin'],
}
