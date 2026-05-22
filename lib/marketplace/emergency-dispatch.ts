import { getSupabaseClient } from '@/lib/supabase/client'

export async function getEmergencyProviders(facilityId: string) {
  const sb = getSupabaseClient()
  const { data } = await (sb as any).schema('marketplace').from('facility_vendors')
    .select('vendor_id, trust_level, marketplace_business_profiles!vendor_id(business_name,contact_phone,is_emergency_provider)')
    .eq('facility_id', facilityId).eq('trust_level', 'emergency')
  return data ?? []
}

export async function dispatchEmergencyProvider(facilityId: string, vendorId: string, incidentId: string) {
  const sb = getSupabaseClient()
  // incidentId passed as string reference only — no emergency schema import
  const { data, error } = await (sb as any).schema('marketplace').from('jobs').insert({
    facility_id: facilityId,
    vendor_id: vendorId,
    status: 'scheduled',
    manager_notes: `Emergency dispatch. Incident ref: ${incidentId}`,
  }).select('id').single()
  return { jobId: data?.id ?? null, error: error?.message ?? null }
}
