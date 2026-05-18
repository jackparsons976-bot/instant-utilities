'use client'

import { useAuth } from '@/providers/AuthProvider'

export default function DashboardPage() {
  const { session, jwtClaims } = useAuth()
  const role: string = jwtClaims?.app_metadata?.platform_role ?? jwtClaims?.platform_role ?? 'resident'
  const email = session?.user?.email ?? ''
  const facilityIds: string[] = jwtClaims?.app_metadata?.active_facility_ids ?? jwtClaims?.active_facility_ids ?? []
  const caps: string[] = jwtClaims?.app_metadata?.caps ?? jwtClaims?.caps ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Welcome back
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{email}</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Role</div>
          <div style={{ marginTop: '0.4rem' }}>
            <span className={`badge ${role === 'platform_admin' ? 'badge-black' : role === 'facility_manager' ? 'badge-green' : 'badge-gray'}`}>
              {role.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Facilities</div>
          <div className="stat-value">{facilityIds.length}</div>
          <div className="stat-sub">enrolled</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Capabilities</div>
          <div className="stat-value">{caps.length}</div>
          <div className="stat-sub">from JWT</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Session</div>
          <div style={{ marginTop: '0.4rem' }}>
            <span className="badge badge-green">Active</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>Quick actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {QUICK_ACTIONS.map(a => (
            <a key={a.label} href={a.href} className="card" style={{ display: 'block', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{a.icon}</div>
              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{a.label}</div>
              <div style={{ fontSize: '0.775rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{a.desc}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Capabilities debug — only shows if JWT hook is active */}
      {caps.length > 0 && (
        <div>
          <h2 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '1rem' }}>Active capabilities</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {caps.map(c => (
              <span key={c} className="badge badge-gray" style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {caps.length === 0 && (
        <div className="alert alert-warning">
          <strong>JWT hook not active.</strong> Capabilities are empty. Go to Supabase → Authentication → Hooks → activate <code>public.custom_access_token_hook</code>, then sign out and back in.
        </div>
      )}
    </div>
  )
}

const QUICK_ACTIONS = [
  { label: 'Emergency',     href: '/dashboard/emergency',    icon: '🆘', desc: 'View active incidents' },
  { label: 'Maintenance',   href: '/dashboard/maintenance',  icon: '🔧', desc: 'Submit or manage requests' },
  { label: 'Announcements', href: '/dashboard/announcements',icon: '📢', desc: 'Building notices' },
  { label: 'Marketplace',   href: '/dashboard/marketplace',  icon: '🛒', desc: 'Find local vendors' },
]
