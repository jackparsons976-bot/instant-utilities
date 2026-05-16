'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Request {
  id: string
  title: string
  status: string
  priority: string
  category: string | null
  created_at: string
}

export default function MaintenancePage() {
  const { session } = useAuth()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState(false)

  const facilityId = session?.user?.app_metadata?.active_facility_ids?.[0]

  useEffect(() => {
    if (!facilityId || !session) { setLoading(false); return }
    const sb = getSupabaseClient()
    sb.schema('facility').from('maintenance_requests')
      .select('id, title, status, priority, category, created_at')
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => { setRequests((data ?? []) as Request[]); setLoading(false) })
  }, [facilityId, session])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!session || !facilityId) return
    setSubmitting(true)
    const sb = getSupabaseClient()
    const { data } = await sb.schema('facility').from('maintenance_requests').insert({
      facility_id: facilityId,
      submitted_by: session.user.id,
      title,
      description,
      priority,
      status: 'open',
    }).select().single()
    if (data) {
      setRequests(prev => [data as Request, ...prev])
      setTitle(''); setDescription(''); setPriority('normal')
      setShowForm(false); setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSubmitting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Maintenance</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Submit and track maintenance requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ New request'}
        </button>
      </div>

      {success && <div className="alert alert-success">✓ Request submitted successfully.</div>}

      {showForm && (
        <div className="card">
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>New maintenance request</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="field">
              <label className="label">Title *</label>
              <input className="input" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Leaking tap in unit 4B" />
            </div>
            <div className="field">
              <label className="label">Description</label>
              <textarea className="input" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the issue in detail…" rows={3} style={{ resize: 'vertical' }} />
            </div>
            <div className="field">
              <label className="label">Priority</label>
              <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Loading…</p>
      ) : requests.length === 0 ? (
        <div className="placeholder-section">
          <h3>No requests yet</h3>
          <p>Submit your first maintenance request using the button above.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Priority</th><th>Status</th><th>Submitted</th></tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>
                    <span className={`badge ${r.priority === 'urgent' ? 'badge-red' : r.priority === 'high' ? 'badge-yellow' : 'badge-gray'}`}>
                      {r.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'completed' ? 'badge-green' : r.status === 'in_progress' ? 'badge-yellow' : 'badge-gray'}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
