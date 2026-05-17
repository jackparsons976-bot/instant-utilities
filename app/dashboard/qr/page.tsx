'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'

interface QRNode {
  id: string; label: string; node_type: string; zone: string | null
  emergency_priority: number; is_active: boolean
  qr_payload: string | null; coord_x: number | null; coord_y: number | null
}

function priorityColor(p: number) {
  if (p <= 2) return '#dc2626'
  if (p <= 4) return '#d97706'
  return '#16a34a'
}

function QRCanvas({ payload, size = 160 }: { payload: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!payload || !canvasRef.current) return
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current!, payload, { width: size, margin: 1 }, (err) => {
        if (err) console.error('QR generation error', err)
      })
    })
  }, [payload, size])

  return <canvas ref={canvasRef} width={size} height={size} style={{ display: 'block', borderRadius: '4px' }} />
}

function FloorPlan({ nodes }: { nodes: QRNode[] }) {
  const W = 600, H = 400
  const placed = nodes.filter(n => n.coord_x !== null && n.coord_y !== null)

  // Normalize coords to canvas
  const xs = placed.map(n => n.coord_x!)
  const ys = placed.map(n => n.coord_y!)
  const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 1200)
  const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 800)

  function toSvg(x: number, y: number) {
    const px = 32 + ((x - minX) / (maxX - minX)) * (W - 64)
    const py = 32 + ((y - minY) / (maxY - minY)) * (H - 64)
    return { x: px, y: py }
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.95rem' }}>Floor Plan View</div>
      <div style={{ overflowX: 'auto' }}>
        <svg width={W} height={H} style={{ border: '1px solid var(--border)', borderRadius: '8px', background: '#fafafa', display: 'block', minWidth: W }}>
          {/* Grid lines */}
          {[1,2,3].map(i => (
            <line key={`h${i}`} x1={0} y1={(H / 4) * i} x2={W} y2={(H / 4) * i} stroke="#e5e7eb" strokeWidth={1} />
          ))}
          {[1,2,3].map(i => (
            <line key={`v${i}`} x1={(W / 4) * i} y1={0} x2={(W / 4) * i} y2={H} stroke="#e5e7eb" strokeWidth={1} />
          ))}
          {placed.map(n => {
            const { x, y } = toSvg(n.coord_x!, n.coord_y!)
            const color = priorityColor(n.emergency_priority)
            return (
              <g key={n.id}>
                <circle cx={x} cy={y} r={10} fill={color} opacity={n.is_active ? 1 : 0.35} stroke="#fff" strokeWidth={2} />
                <text x={x} y={y + 22} textAnchor="middle" fontSize={9} fill="#666" fontFamily="sans-serif">
                  {n.label.length > 12 ? n.label.slice(0, 12) + '…' : n.label}
                </text>
              </g>
            )
          })}
          {placed.length === 0 && (
            <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={13} fill="#9ca3af" fontFamily="sans-serif">
              No nodes with coordinates
            </text>
          )}
        </svg>
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.775rem', color: 'var(--muted)' }}>
        {[{ label: 'Priority 1–2', color: '#dc2626' }, { label: 'Priority 3–4', color: '#d97706' }, { label: 'Priority 5+', color: '#16a34a' }].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color, display: 'inline-block' }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function QRPage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const [nodes, setNodes] = useState<QRNode[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const facilityId = session?.user?.app_metadata?.active_facility_ids?.[0]
  const role = (session?.user?.app_metadata?.platform_role as string) ?? 'resident'
  const isManager = role === 'facility_manager' || role === 'platform_admin'

  useEffect(() => {
    if (!facilityId) { setLoading(false); return }
    getSupabaseClient().schema('qr').from('nodes')
      .select('id, label, node_type, zone, emergency_priority, is_active, qr_payload, coord_x, coord_y')
      .eq('facility_id', facilityId)
      .order('emergency_priority', { ascending: true })
      .then(({ data }) => { setNodes((data ?? []) as QRNode[]); setLoading(false) })
  }, [facilityId])

  async function toggleActive(id: string, current: boolean) {
    const { error } = await getSupabaseClient().schema('qr').from('nodes')
      .update({ is_active: !current })
      .eq('id', id)
    if (error) { toast('Failed to update node: ' + error.message, 'error'); return }
    setNodes(prev => prev.map(n => n.id === id ? { ...n, is_active: !current } : n))
    toast(`Node ${!current ? 'activated' : 'deactivated'}.`, 'success')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>QR Nodes</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{nodes.length} nodes deployed</p>
      </div>

      {!loading && nodes.length > 0 && <FloorPlan nodes={nodes} />}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '44px', borderRadius: '8px' }} />)}
        </div>
      ) : nodes.length === 0 ? (
        <div className="placeholder-section"><h3>No QR nodes</h3><p>No nodes deployed for this facility.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr><th>Label</th><th>Type</th><th>Zone</th><th>Priority</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {nodes.map(n => (
                <>
                  <tr key={n.id} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>
                      <button
                        onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                        style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: 500 }}
                      >
                        {expandedId === n.id ? '▾' : '▸'} {n.label}
                      </button>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{n.node_type.replace('_', ' ')}</td>
                    <td style={{ color: 'var(--muted)' }}>{n.zone ?? '—'}</td>
                    <td>
                      <span className="badge" style={{ background: priorityColor(n.emergency_priority) + '20', color: priorityColor(n.emergency_priority), borderColor: priorityColor(n.emergency_priority) + '40' }}>
                        {n.emergency_priority}
                      </span>
                    </td>
                    <td><span className={`badge ${n.is_active ? 'badge-green' : 'badge-gray'}`}>{n.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      {isManager && (
                        <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                          onClick={() => toggleActive(n.id, n.is_active)}>
                          {n.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === n.id && n.qr_payload && (
                    <tr key={n.id + '-qr'}>
                      <td colSpan={6} style={{ padding: '1rem 0.75rem', background: '#fafafa' }}>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <QRCanvas payload={n.qr_payload} size={160} />
                          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: '320px' }}>
                            <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--fg)', fontFamily: 'inherit' }}>QR Payload</div>
                            {n.qr_payload}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
