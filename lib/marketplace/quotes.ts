import { getSupabaseClient } from '@/lib/supabase/client'

export async function submitQuoteRequest(facilityId: string, vendorId: string, serviceType: string, description: string) {
  const sb = getSupabaseClient()
  return (sb as any).schema('marketplace').from('quotes').insert({ facility_id: facilityId, vendor_id: vendorId, service_type: serviceType, description, status: 'pending' })
}

export async function respondToQuote(quoteId: string, vendorId: string, price: number, message: string, availableFrom: string) {
  const sb = getSupabaseClient()
  return (sb as any).schema('marketplace').from('quotes').update({ vendor_response: message, vendor_price: price, vendor_available_from: availableFrom, status: 'quoted', responded_at: new Date().toISOString() }).eq('id', quoteId)
}

export async function acceptQuote(quoteId: string, facilityId: string) {
  const sb = getSupabaseClient()
  await (sb as any).schema('marketplace').from('quotes').update({ status: 'accepted' }).eq('id', quoteId)
  const { data: q } = await (sb as any).schema('marketplace').from('quotes').select('vendor_id,service_type,description,vendor_price,facility_id').eq('id', quoteId).single()
  if (q) await (sb as any).schema('marketplace').from('jobs').insert({ facility_id: q.facility_id, vendor_id: q.vendor_id, quote_id: quoteId, status: 'scheduled' })
  return { ok: true }
}

export async function rejectQuote(quoteId: string, reason?: string) {
  const sb = getSupabaseClient()
  return (sb as any).schema('marketplace').from('quotes').update({ status: 'rejected' }).eq('id', quoteId)
}
