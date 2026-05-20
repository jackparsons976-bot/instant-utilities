import { getSupabaseClient } from '@/lib/supabase/client'

export interface QRNodePosition {
  id: string
  floor_id: string | null
  x_percent: number | null
  y_percent: number | null
  label: string
}

export async function setLocationFromQR(
  userId: string,
  facilityId: string,
  node: QRNodePosition
): Promise<void> {
  if (typeof window === 'undefined') return
  const supabase = getSupabaseClient()
  await (supabase as any).from('user_locations').upsert(
    {
      user_id: userId,
      facility_id: facilityId,
      floor_id: node.floor_id ?? null,
      x_percent: node.x_percent ?? null,
      y_percent: node.y_percent ?? null,
      source: 'qr',
      accuracy_meters: 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
}
