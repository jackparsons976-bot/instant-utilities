import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { incidentId, facilityId } = await req.json()
    if (!incidentId || !facilityId) {
      return new Response(JSON.stringify({ error: 'incidentId and facilityId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch incident details
    const { data: incident } = await supabase
      .schema('emergency').from('incidents')
      .select('id, title, incident_type, severity, created_at, origin_node_id')
      .eq('id', incidentId).single()

    // Fetch facility details
    const { data: facility } = await supabase
      .schema('facility').from('facilities')
      .select('id, name, address, emergency_contacts')
      .eq('id', facilityId).single()

    // Count users on affected floors
    const { count: affectedCount } = await supabase
      .from('user_locations')
      .select('user_id', { count: 'exact', head: true })
      .eq('facility_id', facilityId)

    if (!incident || !facility) {
      return new Response(JSON.stringify({ error: 'Incident or facility not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const brief = [
      `EMERGENCY INCIDENT BRIEF`,
      `========================`,
      `Facility: ${facility.name}`,
      facility.address ? `Address: ${facility.address}` : null,
      `Incident: ${incident.title}`,
      `Type: ${incident.incident_type?.replace(/_/g, ' ')}`,
      `Severity: ${['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'][incident.severity] ?? incident.severity}`,
      `People on site: approximately ${affectedCount ?? 'unknown'}`,
      `Time: ${new Date(incident.created_at).toLocaleString('en-AU')}`,
      ``,
      `For Australian emergency services: call 000`,
      `Police/Fire/Ambulance: 000`,
    ].filter(Boolean).join('\n')

    // Send SMS via Twilio if configured
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioFrom = Deno.env.get('TWILIO_FROM_NUMBER')
    const contacts: string[] = (facility as any).emergency_contacts ?? []
    const smsSent: string[] = []
    const smsErrors: string[] = []

    if (twilioSid && twilioToken && twilioFrom && contacts.length > 0) {
      for (const to of contacts) {
        const body = new URLSearchParams({
          From: twilioFrom,
          To: to,
          Body: `EMERGENCY at ${facility.name}: ${incident.title}. Severity: ${incident.severity}/5. Call 000 immediately.`,
        })
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          }
        )
        if (res.ok) smsSent.push(to)
        else smsErrors.push(to)
      }
    } else if (contacts.length > 0) {
      console.warn('Twilio not configured — SMS not sent. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.')
    }

    return new Response(JSON.stringify({ brief, smsSent, smsErrors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
