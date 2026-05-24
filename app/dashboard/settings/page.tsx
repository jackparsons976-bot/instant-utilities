'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/components/Toast'
import { getSupabaseClient } from '@/lib/supabase/client'

interface MemberRecord { id: string; marketplace_enabled: boolean | null; display_name: string | null }

export default function SettingsPage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const [member, setMember] = useState<MemberRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [hasBusinessProfile, setHasBusinessProfile] = useState(false)

  const facilityId = session?.user?.app_metadata?.active_facility_ids?.[0]

  useEffect(() => {
    if (!session?.user?.id || !facilityId) { setLoading(false); return }
    const sb = getSupabaseClient() as any
    Promise.all([
      sb.schema('facility').from('members').select('id,marketplace_enabled,display_name')
        .eq('user_id', session.user.id).eq('facility_id', facilityId).maybeSingle(),
      sb.schema('marketplace').from('business_profiles').select('id')
        .eq('user_id', session.user.id).maybeSingle(),
    ]).then(([{ data: mData }, { data: bpData }]: [{ data: MemberRecord | null }, { data: { id: string } | null }]) => {
      setMember(mData)
      if (mData) setDisplayName(mData.display_name ?? '')
      setHasBusinessProfile(!!bpData)
      setLoading(false)
    })
  }, [session?.user?.id, facilityId])

  async function toggleMarketplace() {
    if (!member) return
    const newVal = !member.marketplace_enabled
    const sb = getSupabaseClient() as any
    const { error } = await sb.schema('facility').from('members')
      .update({ marketplace_enabled: newVal }).eq('id', member.id)
    if (error) { toast('Failed to update setting.', 'error'); return }
    setMember({ ...member, marketplace_enabled: newVal })
    toast(newVal ? 'Marketplace access enabled.' : 'Marketplace access disabled.', 'success')
  }

  async function saveDisplayName() {
    if (!member) return
    setSavingName(true)
    const sb = getSupabaseClient() as any
    const { error } = await sb.schema('facility').from('members')
      .update({ display_name: displayName }).eq('id', member.id)
    if (error) { toast('Failed to save name.', 'error'); setSavingName(false); return }
    setMember({ ...member, display_name: displayName })
    setSavingName(false)
    toast('Display name updated.', 'success')
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="skeleton" style={{ height: '28px', width: '35%', borderRadius: '6px' }} />
      <div className="skeleton" style={{ height: '100px', borderRadius: '8px' }} />
      <div className="skeleton" style={{ height: '100px', borderRadius: '8px' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Settings</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Manage your account preferences</p>
      </div>

      {/* General */}
      <div className="card">
        <h2 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1rem' }}>General</h2>
        <div className="field">
          <label className="label">Display name</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="How you appear to others" style={{ flex: 1 }} />
            <button className="btn btn-primary" style={{ fontSize: '0.85rem' }} onClick={saveDisplayName} disabled={savingName}>
              {savingName ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <div className="field" style={{ marginTop: '1rem' }}>
          <label className="label">Email</label>
          <p style={{ fontSize: '0.875rem', padding: '0.4rem 0', color: 'var(--muted)' }}>{session?.user?.email ?? '—'}</p>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Notification preferences — coming soon.</p>
        </div>
      </div>

      {/* Marketplace */}
      <div className="card">
        <h2 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1rem' }}>Marketplace</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>Enable marketplace access</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
              Allows you to view and interact with the service marketplace.
            </p>
          </div>
          <button
            className={`btn ${member?.marketplace_enabled ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', minWidth: '80px' }}
            onClick={toggleMarketplace}
          >
            {member?.marketplace_enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {member?.marketplace_enabled && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            {hasBusinessProfile ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.875rem' }}>You have a business profile on the marketplace.</p>
                <Link href="/dashboard/business" className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                  Manage profile
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Register as a vendor to list your services.</p>
                <Link href="/business/register" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                  Register business
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
