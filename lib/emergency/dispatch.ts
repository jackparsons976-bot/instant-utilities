import { getSupabaseClient } from '@/lib/supabase/client'

export async function dispatchResponder(
  incidentId: string,
  responderId: string,
  facilityId: string
): Promise<{ error: string | null }> {
  const sb = getSupabaseClient()
  const { error } = await (sb as any).schema('emergency').from('responder_assignments').insert({
    incident_id: incidentId,
    responder_id: responderId,
    facility_id: facilityId,
    assigned_at: new Date().toISOString(),
    status: 'assigned',
  })
  return { error: error?.message ?? null }
}

export async function updateIncidentStatus(
  incidentId: string,
  status: 'active' | 'investigating' | 'contained' | 'resolved'
): Promise<{ error: string | null }> {
  const sb = getSupabaseClient()
  const update: Record<string, any> = { status, updated_at: new Date().toISOString() }
  if (status === 'resolved') update.resolved_at = new Date().toISOString()
  const { error } = await (sb as any).schema('emergency').from('incidents')
    .update(update).eq('id', incidentId)
  return { error: error?.message ?? null }
}

export async function getAvailableResponders(facilityId: string) {
  const sb = getSupabaseClient()
  const { data, error } = await (sb as any).schema('facility').from('members')
    .select('user_id, role, unit_number')
    .eq('facility_id', facilityId)
    .in('role', ['facility_manager'])
  return { data: data ?? [], error: error?.message ?? null }
}
