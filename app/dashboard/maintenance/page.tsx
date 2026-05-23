'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'
import { can } from '@/lib/permissions/can'

interface Request {
  id: string; title: string; status: string
  priority: string; category: string | null; created_at: string; description: string | null
}

const STATUS_ORDER = ['open', 'in_progress', 'completed', 'cancelled']
const PRIORITY_ORDER = ['urgent', 'high', 'normal', 'low']

export default function MaintenancePage() {
  const { session, jwtClaims } = useAuth() // jwtClaims used for facilityId + permissions
  const { toast } = useToast()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [submitting, setSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  const facilityId = jwtClaims?.app_metadata?.active_facility_ids?.[0] ?? jwtClaims?.active_facility_ids?.[0]
  const canManageResidents = can(jwtClaims, 'MANAGE_RESIDENTS')

  useEffect(() => {
    if (!facilityId || !session) { setLoading(false); return }
    getSupabaseClient().schema('facility').from('maintenance_requests')
      .select('id, title, status, priority, category, created_at, description')
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setRequests((data ?? []) as Request[]); setLoading(false) })
  }, [facilityId, session?.user?.id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!session || !facilityId) return
    setSubmitting(true)
    const { data, error } = await getSupabaseClient().schema('facility').from('maintenance_requests').insert({
      facility_id: facilityId,
      submitted_by: session.user.id,
      title, description, priority, status: 'open',
    }).select().single()
    if (error) { toast('Failed to submit: ' + error.message, 'error'); setSubmitting(false); return }
    setRequests(prev => [data as Request, ...prev])
    setTitle(''); setDescription(''); setPriority('normal')
    setShowForm(false)
    toast('Maintenance request submitted.', 'success')
    setSubmitting(false)
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await getSupabaseClient().schema('facility').from('maintenance_requests')
      .update({ status: newStatus, ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}) })
      .eq('id', id)
    if (error) { toast('Failed to update: ' + error.message, 'error'); return }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
    toast(`Request marked as ${newStatus.replace('_', ' ')}.`, 'success')
  }

  const counts = STATUS_ORDER.reduce((acc, s) => ({ ...acc, [s]: requests.filter(r => r.status === s).length }), {} as Record<string, number>)

  const filtered = requests.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false
    if (filterPriority !== 'all' && r.priority !== filterPriority) return false
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Maintenance</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Submit and track requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '+ New request'}
        </button>
      </div>

      {/* Status summary row */}
      <div className="stats-grid">
        {STATUS_ORDER.map(s => (
          <div key={s} className="stat-card" style={{ cursor: 'pointer', transition: 'border-color 0.15s',
            borderColor: filterStatus === s ? 'var(--primary)' : 'var(--border)' }}
            onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}>
            <div className="stat-label" style={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</div>
            <div className="stat-value">{counts[s] ?? 0}</div>
          </div>
        ))}
      </div>

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
                placeholder="Describe the issue…" rows={3} style={{ resize: 'vertical' }} />
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

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Filter:</span>
        {['all', ...PRIORITY_ORDER].map(p => (
          <button key={p} className={`btn btn-${filterPriority === p ? 'primary' : 'outline'}`}
            style={{ padding: '0.25rem 0.7rem', fontSize: '0.775rem' }}
            onClick={() => setFilterPriority(p)}>
            {p === 'all' ? 'All priorities' : p}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '44px', borderRadius: '8px' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="placeholder-section">
          <h3>No requests yet</h3>
          <p>{filterStatus !== 'all' || filterPriority !== 'all' ? 'No requests match the current filters.' : 'Submit your first maintenance request using the button above.'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Priority</th><th>Status</th><th>Submitted</th>{canManageResidents && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.title}</div>
                    {r.description && <div style={{ fontSize: '0.775rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{r.description.slice(0, 80)}{r.description.length > 80 ? '…' : ''}</div>}
                  </td>
                  <td><span className={`badge ${r.priority === 'urgent' ? 'badge-red' : r.priority === 'high' ? 'badge-yellow' : 'badge-gray'}`}>{r.priority}</span></td>
                  <td><span className={`badge ${r.status === 'completed' ? 'badge-green' : r.status === 'in_progress' ? 'badge-yellow' : r.status === 'cancelled' ? 'badge-gray' : 'badge-gray'}`}>{r.status.replace('_', ' ')}</span></td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                  {canManageResidents && (
                    <td>
                      <select className="input" value={r.status}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.775rem', width: 'auto' }}
                        onChange={e => updateStatus(r.id, e.target.value)}>
                        {STATUS_ORDER.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
