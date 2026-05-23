'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Thread {
  id: string; subject: string | null; thread_type: string; created_at: string; updated_at: string
}
interface Message {
  id: string; thread_id: string; sender_id: string; body: string; created_at: string
}

function elapsed(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

const THREAD_TYPE_COLOR: Record<string, string> = {
  direct: 'badge-gray', maintenance: 'badge-yellow',
  emergency: 'badge-red', announcement: 'badge-black',
}

export default function MessagesPage() {
  const { session, jwtClaims } = useAuth()
  const { toast } = useToast()
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [showNewThread, setShowNewThread] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [creatingThread, setCreatingThread] = useState(false)
  const [reconnectKey, setReconnectKey] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)
  const reconnectAttempts = useRef(0)

  const facilityId = jwtClaims?.app_metadata?.active_facility_ids?.[0] ?? jwtClaims?.active_facility_ids?.[0]

  useEffect(() => {
    if (!facilityId || !session) { setLoading(false); return }
    const sb = getSupabaseClient()
    // Get thread IDs where user is a participant
    sb.schema('messaging').from('thread_participants')
      .select('thread_id')
      .eq('user_id', session.user.id)
      .then(({ data: participantData }) => {
        const threadIds = (participantData ?? []).map((p: { thread_id: string }) => p.thread_id)
        if (threadIds.length === 0) { setLoading(false); return }
        sb.schema('messaging').from('threads')
          .select('id, subject, thread_type, created_at, updated_at')
          .eq('facility_id', facilityId)
          .in('id', threadIds)
          .order('updated_at', { ascending: false })
          .limit(30)
          .then(({ data }) => {
            setThreads((data ?? []) as Thread[])
            setLoading(false)
          })
      })
  }, [facilityId, session?.user?.id])

  useEffect(() => {
    if (!activeThread || !session) return
    setMsgLoading(true)
    const sb = getSupabaseClient()

    sb.schema('messaging').from('messages')
      .select('id, thread_id, sender_id, body, created_at')
      .eq('thread_id', activeThread.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data ?? []) as Message[])
        setMsgLoading(false)
      })

    if (channelRef.current) sb.removeChannel(channelRef.current)
    const channel = sb
      .channel(`thread:${activeThread.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'messaging', table: 'messages',
        filter: `thread_id=eq.${activeThread.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true)
          reconnectAttempts.current = 0
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeConnected(false)
          const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000)
          reconnectAttempts.current += 1
          setTimeout(() => setReconnectKey(k => k + 1), delay)
        }
      })
    channelRef.current = channel

    return () => { if (channelRef.current) sb.removeChannel(channelRef.current) }
  }, [activeThread?.id, session?.user?.id, reconnectKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function createThread(e: FormEvent) {
    e.preventDefault()
    if (!newSubject.trim() || !session || !facilityId) return
    setCreatingThread(true)
    const sb = getSupabaseClient()
    const { data: thread, error } = await sb.schema('messaging').from('threads').insert({
      facility_id: facilityId,
      subject: newSubject.trim(),
      thread_type: 'direct',
      created_by: session.user.id,
    }).select('id, subject, thread_type, created_at, updated_at').single()
    if (error) { toast('Failed to create thread: ' + error.message, 'error'); setCreatingThread(false); return }
    await sb.schema('messaging').from('thread_participants').insert({
      thread_id: thread.id, user_id: session.user.id,
    })
    setThreads(prev => [thread as Thread, ...prev])
    setActiveThread(thread as Thread)
    setNewSubject('')
    setShowNewThread(false)
    setCreatingThread(false)
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    if (!body.trim() || !session || !activeThread) return
    setSending(true)
    const { error } = await getSupabaseClient().schema('messaging').from('messages').insert({
      thread_id: activeThread.id,
      sender_id: session.user.id,
      body: body.trim(),
    })
    if (error) { toast('Failed to send: ' + error.message, 'error') }
    else setBody('')
    setSending(false)
  }

  const myId = session?.user?.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Messages</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Direct messages and threads</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {activeThread && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.75rem', color: realtimeConnected ? 'var(--success)' : 'var(--muted)',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: realtimeConnected ? 'var(--success)' : '#d1d5db',
              display: 'inline-block',
            }} />
            {realtimeConnected ? 'Live' : reconnectAttempts.current > 0 ? 'Reconnecting…' : 'Connecting…'}
          </span>
        )}
          <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}
            onClick={() => setShowNewThread(v => !v)}>
            {showNewThread ? 'Cancel' : '+ New thread'}
          </button>
        </div>
      </div>

      {showNewThread && (
        <form onSubmit={createThread} className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: '200px' }}>
            <label className="label">Thread subject</label>
            <input className="input" placeholder="e.g. Maintenance query, General question…"
              value={newSubject} onChange={e => setNewSubject(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creatingThread || !newSubject.trim()}>
            {creatingThread ? 'Creating…' : 'Create thread'}
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: activeThread ? '280px 1fr' : '1fr', gap: '1rem', minHeight: '480px' }}>
        {/* Thread list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '0.875rem' }}>
            Threads {threads.length > 0 && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({threads.length})</span>}
          </div>
          {loading ? (
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '56px', borderRadius: '6px' }} />)}
            </div>
          ) : threads.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
              No threads yet
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {threads.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveThread(t)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    background: activeThread?.id === t.id ? '#f3f4f6' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    borderLeft: activeThread?.id === t.id ? '3px solid var(--primary)' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{t.subject ?? 'Untitled thread'}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{elapsed(t.updated_at)}</span>
                  </div>
                  <span className={`badge ${THREAD_TYPE_COLOR[t.thread_type] ?? 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                    {t.thread_type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages pane */}
        {activeThread && (
          <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{activeThread.subject ?? 'Untitled thread'}</span>
                <span className={`badge ${THREAD_TYPE_COLOR[activeThread.thread_type] ?? 'badge-gray'}`} style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                  {activeThread.thread_type}
                </span>
              </div>
              <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', color: 'var(--muted)' }}
                onClick={() => setActiveThread(null)}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '320px' }}>
              {msgLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>Loading…</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem', margin: 'auto' }}>No messages yet. Say hello!</div>
              ) : (
                messages.map(m => {
                  const isMine = m.sender_id === myId
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        padding: '0.6rem 0.9rem',
                        borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isMine ? 'var(--primary)' : '#f3f4f6',
                        color: isMine ? '#fff' : 'var(--fg)',
                        fontSize: '0.875rem', maxWidth: '80%',
                      }}>
                        {m.body}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                        {elapsed(m.created_at)}
                      </span>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={sendMessage} style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
              <input
                className="input"
                placeholder="Type a message…"
                value={body}
                onChange={e => setBody(e.target.value)}
                disabled={sending}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={sending || !body.trim()}>
                {sending ? '…' : 'Send'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
