'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  title: string
  body: string | null
  action_url: string | null
  read_at: string | null
  created_at: string
}

interface AppNavProps {
  onMenuToggle?: () => void
}

export function AppNav({ onMenuToggle }: AppNavProps) {
  const { session } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read_at).length

  useEffect(() => {
    if (!session?.user) return
    const sb = getSupabaseClient()
    sb.schema('notification').from('notifications')
      .select('id, title, body, action_url, read_at, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications((data ?? []) as Notification[]))

    const channel = sb
      .channel(`user:${session.user.id}:notifications`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'notification',
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`,
      }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [session?.user?.id])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await getSupabaseClient().auth.signOut()
    router.push('/login')
  }

  async function markRead(id: string, actionUrl: string | null) {
    setBellOpen(false)
    getSupabaseClient().schema('notification').from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .then(() => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      })
    if (actionUrl) router.push(actionUrl)
  }

  return (
    <nav className="nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          className="hamburger-btn"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <Link href="/dashboard" className="nav-logo">Instant Utilities</Link>
      </div>

      <div className="nav-links">
        {session && (
          <>
            {/* Notification bell */}
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setBellOpen(v => !v)}
                style={{
                  background: 'none', border: 'none', fontSize: '1.1rem',
                  cursor: 'pointer', position: 'relative', padding: '0.25rem',
                  lineHeight: 1,
                }}
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
              >
                🔔
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-2px', right: '-2px',
                    background: 'var(--danger)', color: '#fff',
                    borderRadius: '999px', fontSize: '0.6rem',
                    minWidth: '16px', height: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, lineHeight: 1, padding: '0 3px',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: '8px', width: '320px', maxHeight: '380px',
                  overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 200,
                }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '0.875rem' }}>
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => markRead(n.id, n.action_url)}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid var(--border)',
                          background: n.read_at ? 'transparent' : '#fafafa',
                          border: 'none', cursor: 'pointer',
                          borderLeft: n.read_at ? 'none' : '3px solid var(--primary)',
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', fontWeight: n.read_at ? 400 : 600 }}>{n.title}</div>
                        {n.body && <div style={{ fontSize: '0.775rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{n.body}</div>}
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'none' }} className="nav-email">
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
