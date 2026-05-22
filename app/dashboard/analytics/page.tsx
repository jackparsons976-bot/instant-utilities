'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { getSupabaseClient } from '@/lib/supabase/client'
import { AppNav } from '@/components/AppNav'
import { can } from '@/lib/permissions/can'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

interface Incident {
  id: string
  created_at: string
  resolved_at: string | null
}

interface MaintenanceRequest {
  id: string
  created_at: string
  status: string
}

function startOfMonth() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function toDateStr(iso: string) {
  return iso.slice(0, 10)
}

function isoWeek(iso: string) {
  const d = new Date(iso)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d.setDate(diff))
  return mon.toISOString().slice(0, 10)
}

function buildLast30DaySlots(): Record<string, number> {
  const map: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    map[d.toISOString().slice(0, 10)] = 0
  }
  return map
}

function buildLast90WeekSlots(): string[] {
  const weeks: string[] = []
  const seen = new Set<string>()
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const w = isoWeek(d.toISOString())
    if (!seen.has(w)) { seen.add(w); weeks.push(w) }
  }
  return weeks
}

export default function AnalyticsPage() {
  const { jwtClaims, loading: authLoading } = useAuth()

  const facilityId =
    jwtClaims?.app_metadata?.active_facility_ids?.[0] ??
    jwtClaims?.active_facility_ids?.[0] ?? ''

  const [loading, setLoading] = useState(true)

  // Metric cards
  const [totalResidents, setTotalResidents] = useState(0)
  const [activeIncidents, setActiveIncidents] = useState(0)
  const [openMaintenance, setOpenMaintenance] = useState(0)
  const [pendingQuotes, setPendingQuotes] = useState(0)

  // Chart data
  const [incidentFreq, setIncidentFreq] = useState<{ date: string; count: number }[]>([])
  const [maintenanceWeekly, setMaintenanceWeekly] = useState<{ week: string; open: number; resolved: number }[]>([])
  const [responseTimes, setResponseTimes] = useState<{ label: string; hours: number }[]>([])

  const sb = getSupabaseClient() as any

  useEffect(() => {
    if (authLoading || !facilityId) return
    if (!can(jwtClaims, 'VIEW_ANALYTICS')) { setLoading(false); return }
    loadAll()
  }, [authLoading, facilityId])

  async function loadAll() {
    setLoading(true)
    await Promise.all([
      loadMetrics(),
      loadIncidentFreq(),
      loadMaintenanceWeekly(),
      loadResponseTimes(),
    ])
    setLoading(false)
  }

  async function loadMetrics() {
    const [
      { count: resCount },
      { count: incCount },
      { count: maintCount },
      { count: quoteCount },
    ] = await Promise.all([
      sb.schema('facility').from('members')
        .select('id', { count: 'exact', head: true })
        .eq('facility_id', facilityId)
        .is('left_at', null),
      sb.schema('emergency').from('incidents')
        .select('id', { count: 'exact', head: true })
        .eq('facility_id', facilityId)
        .gt('created_at', startOfMonth()),
      sb.schema('facility').from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('facility_id', facilityId)
        .neq('status', 'resolved'),
      sb.schema('marketplace').from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('facility_id', facilityId)
        .eq('status', 'pending'),
    ])
    setTotalResidents(resCount ?? 0)
    setActiveIncidents(incCount ?? 0)
    setOpenMaintenance(maintCount ?? 0)
    setPendingQuotes(quoteCount ?? 0)
  }

  async function loadIncidentFreq() {
    const { data } = await sb.schema('emergency').from('incidents')
      .select('id,created_at')
      .eq('facility_id', facilityId)
      .gt('created_at', daysAgo(30))
    const slots = buildLast30DaySlots()
    for (const row of data ?? []) {
      const d = toDateStr(row.created_at)
      if (d in slots) slots[d]++
    }
    setIncidentFreq(Object.entries(slots).map(([date, count]) => ({ date, count })))
  }

  async function loadMaintenanceWeekly() {
    const { data } = await sb.schema('facility').from('maintenance_requests')
      .select('id,created_at,status')
      .eq('facility_id', facilityId)
      .gt('created_at', daysAgo(90))
    const weeks = buildLast90WeekSlots()
    const openMap: Record<string, number> = {}
    const resolvedMap: Record<string, number> = {}
    for (const w of weeks) { openMap[w] = 0; resolvedMap[w] = 0 }
    for (const row of (data ?? []) as MaintenanceRequest[]) {
      const w = isoWeek(row.created_at)
      if (w in openMap) {
        if (row.status === 'resolved') resolvedMap[w]++
        else openMap[w]++
      }
    }
    setMaintenanceWeekly(weeks.map(w => ({ week: w, open: openMap[w], resolved: resolvedMap[w] })))
  }

  async function loadResponseTimes() {
    const { data } = await sb.schema('emergency').from('incidents')
      .select('id,created_at,resolved_at')
      .eq('facility_id', facilityId)
      .not('resolved_at', 'is', null)
      .order('resolved_at', { ascending: false })
      .limit(10)
    const rows = ((data ?? []) as Incident[]).map((row, i) => {
      const created = new Date(row.created_at).getTime()
      const resolved = new Date(row.resolved_at!).getTime()
      const hours = Math.max(0, (resolved - created) / 3600000)
      return { label: `#${i + 1}`, hours: Math.round(hours * 10) / 10 }
    })
    setResponseTimes(rows)
  }

  if (authLoading) return <div className="center"><div className="spinner" /></div>

  if (!can(jwtClaims, 'VIEW_ANALYTICS')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppNav />
        <div style={{ padding: '2rem' }}>Access denied</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNav />
      <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Analytics</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Facility performance metrics</p>
        </div>

        {loading ? (
          <div className="center"><div className="spinner" /></div>
        ) : (
          <>
            {/* 2x2 metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="stat-card">
                <div className="stat-label">Total residents</div>
                <div className="stat-value">{totalResidents}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Active incidents this month</div>
                <div className="stat-value" style={{ color: activeIncidents > 0 ? 'var(--danger)' : 'var(--fg)' }}>{activeIncidents}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Open maintenance requests</div>
                <div className="stat-value" style={{ color: openMaintenance > 0 ? 'var(--warning)' : 'var(--fg)' }}>{openMaintenance}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Pending vendor quotes</div>
                <div className="stat-value" style={{ color: pendingQuotes > 0 ? 'var(--warning)' : 'var(--fg)' }}>{pendingQuotes}</div>
              </div>
            </div>

            {/* Chart 1: Incident frequency last 30 days */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Incident frequency — last 30 days</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={incidentFreq} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Incidents" fill="var(--danger, #ef4444)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Maintenance requests last 90 days (by week) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Maintenance requests — last 90 days (weekly)</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={maintenanceWeekly} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="open" name="Open" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3: Response times (last 10 resolved incidents) */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Response times — last 10 resolved incidents (hours)</div>
              {responseTimes.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No resolved incidents yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={responseTimes} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="h" />
                    <Tooltip formatter={(v: number) => [`${v}h`, 'Response time']} />
                    <Bar dataKey="hours" name="Hours" fill="var(--primary, #6366f1)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
