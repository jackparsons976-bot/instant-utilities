import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 3

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { facility_id } = body
  if (!facility_id) {
    return NextResponse.json({ error: 'facility_id required' }, { status: 400 })
  }

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count } = await (supabase as any)
    .schema('emergency')
    .from('sos_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('facility_id', facility_id)
    .gte('created_at', windowStart)

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before sending another SOS.' },
      { status: 429 }
    )
  }

  const { error } = await (supabase as any)
    .schema('emergency')
    .from('sos_events')
    .insert({ facility_id, user_id: user.id, status: 'pending' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
