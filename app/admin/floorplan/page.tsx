'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/AppNav'

interface Facility { id: string; name: string }
interface Floor {
  id: string; facility_id: string; level: number; name: string
  image_url: string | null; floor_plan_url: string | null
  geo_lat_min: number | null; geo_lat_max: number | null
  geo_lng_min: number | null; geo_lng_max: number | null
  building_name: string | null; level_label: string | null
}

export default function FloorPlanAdminPage() {
  const { session, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selectedFacilityId, setSelectedFacilityId] = useState('')
  const [floors, setFloors] = useState<Floor[]>([])
  const [selectedFloorId, setSelectedFloorId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  const [nodes, setNodes] = useState<{id?:string,label:string,node_type:string,zone:string|null,x_percent:number,y_percent:number,dirty:boolean}[]>([])
  const [savingNodes, setSavingNodes] = useState(false)
  const [draggingIdx, setDraggingIdx] = useState<number|null>(null)
  const [addingNode, setAddingNode] = useState<{x:number,y:number}|null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState('room')

  const [geoBounds, setGeoBounds] = useState({
    lat_min: '', lat_max: '', lng_min: '', lng_max: '',
    building_name: '', level_label: '',
  })

  const role = session?.user?.app_metadata?.platform_role as string

  useEffect(() => {
    if (!authLoading && (!session || role !== 'platform_admin')) {
      router.replace('/dashboard')
    }
  }, [session, authLoading, role, router])

  // Load facilities
  useEffect(() => {
    if (!session || role !== 'platform_admin') return
    getSupabaseClient().schema('facility').from('facilities')
      .select('id, name').order('name')
      .then(({ data }) => {
        const list = (data ?? []) as Facility[]
        setFacilities(list)
        if (list.length > 0) setSelectedFacilityId(list[0].id)
        setLoading(false)
      })
  }, [session?.user?.id, role])

  // Load floors when facility changes
  useEffect(() => {
    if (!selectedFacilityId) { setFloors([]); setSelectedFloorId(''); return }
    getSupabaseClient().schema('facility').from('floors')
      .select('id,facility_id,level,name,image_url,floor_plan_url,geo_lat_min,geo_lat_max,geo_lng_min,geo_lng_max,building_name,level_label')
      .eq('facility_id', selectedFacilityId)
      .order('level')
      .then(({ data }) => {
        const list = (data ?? []) as Floor[]
        setFloors(list)
        if (list.length > 0) setSelectedFloorId(list[0].id)
      })
  }, [selectedFacilityId])

  // Pre-fill bounds when floor changes
  useEffect(() => {
    const floor = floors.find(f => f.id === selectedFloorId)
    if (!floor) return
    setGeoBounds({
      lat_min: floor.geo_lat_min?.toString() ?? '',
      lat_max: floor.geo_lat_max?.toString() ?? '',
      lng_min: floor.geo_lng_min?.toString() ?? '',
      lng_max: floor.geo_lng_max?.toString() ?? '',
      building_name: floor.building_name ?? '',
      level_label: floor.level_label ?? '',
    })
  }, [selectedFloorId, floors])

  // Load QR nodes when floor changes
  useEffect(() => {
    if (!selectedFloorId || !selectedFacilityId) return
    ;(getSupabaseClient() as any).schema('qr').from('nodes')
      .select('id,label,node_type,zone,x_percent,y_percent')
      .eq('floor_id', selectedFloorId).eq('facility_id', selectedFacilityId).eq('is_active', true)
      .then(({ data }: any) => setNodes((data ?? []).map((n: any) => ({...n, dirty: false}))))
  }, [selectedFloorId, selectedFacilityId])

  async function uploadFloorPlan() {
    if (!fileRef.current?.files?.[0] || !selectedFloorId || !selectedFacilityId) {
      toast('Select a facility, floor, and image file.', 'error'); return
    }
    const file = fileRef.current.files[0]
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    if (!['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) {
      toast('Only PNG, JPG, SVG or WebP files are supported.', 'error'); return
    }

    setUploading(true)
    const sb = getSupabaseClient()
    const path = `${selectedFacilityId}/${selectedFloorId}/plan.${ext}`

    const { error: uploadErr } = await sb.storage
      .from('floor-plans')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadErr) {
      toast('Upload failed: ' + uploadErr.message, 'error')
      setUploading(false); return
    }

    const { data: { publicUrl } } = sb.storage.from('floor-plans').getPublicUrl(path)

    const { error: updateErr } = await sb.schema('facility').from('floors')
      .update({ image_url: publicUrl })
      .eq('id', selectedFloorId)

    if (updateErr) {
      toast('DB update failed: ' + updateErr.message, 'error')
    } else {
      toast('Floor plan uploaded successfully.', 'success')
      setFloors(prev => prev.map(f => f.id === selectedFloorId ? { ...f, image_url: publicUrl } : f))
      if (fileRef.current) fileRef.current.value = ''
    }
    setUploading(false)
  }

  async function saveGeoBounds() {
    if (!selectedFloorId) return
    const parsed = {
      geo_lat_min: parseFloat(geoBounds.lat_min) || null,
      geo_lat_max: parseFloat(geoBounds.lat_max) || null,
      geo_lng_min: parseFloat(geoBounds.lng_min) || null,
      geo_lng_max: parseFloat(geoBounds.lng_max) || null,
      building_name: geoBounds.building_name || null,
      level_label: geoBounds.level_label || null,
    }
    setSaving(true)
    const { error } = await getSupabaseClient().schema('facility').from('floors')
      .update(parsed).eq('id', selectedFloorId)
    if (error) toast('Save failed: ' + error.message, 'error')
    else {
      toast('Geo bounds saved.', 'success')
      setFloors(prev => prev.map(f => f.id === selectedFloorId ? { ...f, ...parsed } : f))
    }
    setSaving(false)
  }

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (draggingIdx !== null) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setAddingNode({ x, y })
    setNewLabel(''); setNewType('room')
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (draggingIdx === null) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    setNodes(prev => prev.map((n,i) => i===draggingIdx ? {...n,x_percent:x,y_percent:y,dirty:true} : n))
  }

  function handleMouseUp() { setDraggingIdx(null) }

  function confirmAddNode() {
    if (!addingNode || !newLabel) return
    setNodes(prev => [...prev, {label:newLabel,node_type:newType,zone:null,x_percent:addingNode.x,y_percent:addingNode.y,dirty:true}])
    setAddingNode(null); setNewLabel(''); setNewType('room')
  }

  async function saveNodes() {
    if (!selectedFloorId || !selectedFacilityId) return
    setSavingNodes(true)
    const sb = getSupabaseClient()
    for (const n of nodes) {
      if (!n.dirty && n.id) continue
      if (n.id) {
        await (sb as any).schema('qr').from('nodes').update({x_percent:n.x_percent,y_percent:n.y_percent}).eq('id',n.id)
      } else {
        await (sb as any).schema('qr').from('nodes').insert({facility_id:selectedFacilityId,floor_id:selectedFloorId,label:n.label,node_type:n.node_type,zone:n.zone,x_percent:n.x_percent,y_percent:n.y_percent,is_active:true})
      }
    }
    setNodes(prev => prev.map(n => ({...n,dirty:false})))
    setSavingNodes(false)
  }

  if (authLoading || loading) return <div className="center"><div className="spinner" /></div>
  if (role !== 'platform_admin') return null

  const activeFloor = floors.find(f => f.id === selectedFloorId)
  const currentImageUrl = activeFloor?.image_url ?? activeFloor?.floor_plan_url ?? null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNav />
      <div style={{ padding: '2rem', maxWidth: '820px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <div style={{ marginBottom: '0.5rem' }}>
            <a href="/admin" style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>← Admin</a>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Floor Plan Manager</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Upload floor plan images and configure GPS geo-bounds per floor.</p>
        </div>

        {/* Selectors */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Select building & floor</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Building</label>
              <select
                className="btn btn-outline"
                value={selectedFacilityId}
                onChange={e => setSelectedFacilityId(e.target.value)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>Floor</label>
              <select
                className="btn btn-outline"
                value={selectedFloorId}
                onChange={e => setSelectedFloorId(e.target.value)}
                style={{ width: '100%', textAlign: 'left' }}
                disabled={floors.length === 0}
              >
                {floors.map(f => <option key={f.id} value={f.id}>{f.level_label ?? f.name} (Level {f.level})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Floor plan upload */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Floor plan image</div>
          {currentImageUrl && (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Current image</div>
              <img src={currentImageUrl} alt="Current floor plan" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: '6px' }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>
              Upload new image (PNG, JPG, SVG — no PDF)
            </label>
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.svg,.webp,image/*" style={{ fontSize: '0.875rem', marginBottom: '0.75rem', display: 'block' }} />
            <button className="btn btn-primary" onClick={uploadFloorPlan} disabled={uploading || !selectedFloorId}>
              {uploading ? 'Uploading…' : 'Upload floor plan'}
            </button>
          </div>
        </div>

        {/* Geo bounds */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>GPS geo-bounds</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Enter the GPS coordinates of the four corners of this floor. Use{' '}
              <strong>Google Maps</strong> to find them — right-click any point and copy the coordinates.
              These bounds must match the physical building location for GPS-to-image mapping to be accurate.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { key: 'lat_min', label: 'Latitude min (south edge)' },
              { key: 'lat_max', label: 'Latitude max (north edge)' },
              { key: 'lng_min', label: 'Longitude min (west edge)' },
              { key: 'lng_max', label: 'Longitude max (east edge)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>{label}</label>
                <input
                  type="number" step="0.0000001" placeholder="e.g. -33.8700"
                  value={geoBounds[key as keyof typeof geoBounds]}
                  onChange={e => setGeoBounds(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: '#fff', color: 'var(--fg)' }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>Building name</label>
              <input
                type="text" placeholder="e.g. Harbourview"
                value={geoBounds.building_name}
                onChange={e => setGeoBounds(prev => ({ ...prev, building_name: e.target.value }))}
                style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: '#fff', color: 'var(--fg)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>Floor label</label>
              <input
                type="text" placeholder="e.g. Level 4"
                value={geoBounds.level_label}
                onChange={e => setGeoBounds(prev => ({ ...prev, level_label: e.target.value }))}
                style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem', background: '#fff', color: 'var(--fg)' }}
              />
            </div>
          </div>
          <div>
            <button className="btn btn-primary" onClick={saveGeoBounds} disabled={saving || !selectedFloorId}>
              {saving ? 'Saving…' : 'Save geo-bounds'}
            </button>
          </div>
        </div>

        {/* Step 3: Place QR nodes */}
        {selectedFloorId && (activeFloor?.image_url || activeFloor?.floor_plan_url) && (
          <div className="card" style={{padding:'1.25rem'}}>
            <h3 style={{fontWeight:600,marginBottom:'0.75rem'}}>Step 3 — Place QR Nodes</h3>
            <p style={{fontSize:'0.8rem',color:'var(--muted)',marginBottom:'0.75rem'}}>Click on the floor plan to add a node. Drag nodes to reposition.</p>

            {/* Floor plan with node overlay */}
            <div
              ref={mapRef}
              style={{position:'relative',display:'inline-block',cursor:'crosshair',userSelect:'none',maxWidth:'100%'}}
              onClick={handleMapClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <img
                src={activeFloor?.image_url || activeFloor?.floor_plan_url || ''}
                alt="Floor plan"
                style={{display:'block',maxWidth:'100%',maxHeight:'500px',objectFit:'contain'}}
                draggable={false}
              />
              {nodes.map((n, i) => (
                <div
                  key={i}
                  onMouseDown={(e) => { e.stopPropagation(); setDraggingIdx(i) }}
                  style={{
                    position:'absolute', left:`${n.x_percent}%`, top:`${n.y_percent}%`,
                    transform:'translate(-50%,-50%)', width:'14px', height:'14px',
                    borderRadius:'50%', background:'#2563eb', border:'2px solid #fff',
                    boxShadow:'0 1px 3px rgba(0,0,0,0.4)', cursor:'grab', zIndex:10,
                  }}
                  title={`${n.label} (${n.node_type})`}
                />
              ))}
            </div>

            {/* Add node form */}
            {addingNode && (
              <div style={{marginTop:'0.75rem',padding:'0.75rem',background:'#f9fafb',borderRadius:'6px',display:'flex',gap:'0.5rem',flexWrap:'wrap',alignItems:'center'}}>
                <input className="input" placeholder="Label" value={newLabel} onChange={e=>setNewLabel(e.target.value)} style={{width:'140px'}} />
                <select className="input" value={newType} onChange={e=>setNewType(e.target.value)} style={{width:'160px'}}>
                  {['room','corridor','exit','emergency_exit','stairwell','lift','assembly_point','other'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
                <button className="btn btn-primary" onClick={confirmAddNode} disabled={!newLabel}>Add</button>
                <button className="btn btn-secondary" onClick={()=>setAddingNode(null)}>Cancel</button>
              </div>
            )}

            {/* Node list */}
            {nodes.length > 0 && (
              <div style={{marginTop:'0.75rem'}}>
                <div style={{fontSize:'0.8rem',color:'var(--muted)',marginBottom:'0.4rem'}}>{nodes.length} node{nodes.length!==1?'s':''}</div>
                {nodes.map((n,i)=>(
                  <div key={i} style={{display:'flex',gap:'0.5rem',alignItems:'center',padding:'0.25rem 0',fontSize:'0.8rem'}}>
                    <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#2563eb',display:'inline-block'}}/>
                    <span style={{flex:1}}>{n.label}</span>
                    <span style={{color:'var(--muted)'}}>{n.node_type.replace('_',' ')}</span>
                    <span style={{color:'var(--muted)'}}>({Math.round(n.x_percent)}%, {Math.round(n.y_percent)}%)</span>
                    <button onClick={()=>setNodes(prev=>prev.filter((_,j)=>j!==i))} style={{color:'#dc2626',background:'none',border:'none',cursor:'pointer',fontSize:'0.75rem'}}>×</button>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={saveNodes}
              disabled={savingNodes || !nodes.some(n=>n.dirty||!n.id)}
              style={{marginTop:'0.75rem'}}
            >
              {savingNodes ? 'Saving…' : 'Save node positions'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
