import { createClient } from 'jsr:@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { jobId } = await req.json()
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: job } = await sb.schema('marketplace').from('jobs').select('id,facility_id,vendor_id,status,access_instructions').eq('id', jobId).single()
  const { data: facility } = await sb.schema('facility').from('facilities').select('name,address').eq('id', job?.facility_id).single()
  const brief = `Job dispatched at ${facility?.name ?? 'facility'} (${facility?.address ?? ''}). Access: ${job?.access_instructions ?? 'Contact manager on arrival.'}`
  console.log('Dispatch brief:', brief)
  return new Response(JSON.stringify({ ok: true, brief }), { headers: { ...cors, 'Content-Type': 'application/json' } })
})
