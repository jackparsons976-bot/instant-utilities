import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { invitationId } = await req.json()
    if (!invitationId) {
      return new Response(JSON.stringify({ error: 'invitationId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: inv } = await supabase.schema('facility').from('invitations')
      .select('id,email,role,unit_number,token,expires_at,facility_id,invited_by')
      .eq('id', invitationId).single()

    if (!inv) {
      return new Response(JSON.stringify({ error: 'Invitation not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: facility } = await supabase.schema('facility').from('facilities')
      .select('name').eq('id', inv.facility_id).single()

    const { data: inviter } = await supabase.from('auth.users')
      .select('email').eq('id', inv.invited_by).single().catch(() => ({ data: null }))

    const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://instant-utilities.vercel.app'
    const inviteUrl = `${appUrl}/invite?token=${inv.token}`
    const facilityName = (facility as any)?.name ?? 'your building'
    const roleLabel = inv.role === 'facility_manager' ? 'Facility Manager' : 'Resident'

    // Use Supabase Admin API to send invite email
    const { error: emailErr } = await supabase.auth.admin.inviteUserByEmail(inv.email, {
      data: { invitation_token: inv.token, facility_name: facilityName },
      redirectTo: inviteUrl,
    })

    if (emailErr) {
      // Fallback: log the invite URL (email not configured)
      console.warn('Email send failed:', emailErr.message)
      console.info(`Invite URL for ${inv.email}: ${inviteUrl}`)
    }

    return new Response(JSON.stringify({ ok: true, inviteUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
