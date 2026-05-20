import { getSupabaseClient } from '@/lib/supabase/client'

export interface Floor {
  id: string
  facility_id: string
  level: number
  name: string
  floor_plan_url: string | null
  image_url: string | null
  floor_plan_width: number | null
  floor_plan_height: number | null
  geo_lat_min: number | null
  geo_lat_max: number | null
  geo_lng_min: number | null
  geo_lng_max: number | null
  building_name: string | null
  level_number: number
  level_label: string
}

export interface QRNode {
  id: string
  label: string
  node_type: string
  zone: string | null
  emergency_priority: number
  is_active: boolean
  qr_payload: string | null
  coord_x: number | null
  coord_y: number | null
  floor_id: string | null
  x_percent: number | null
  y_percent: number | null
}

export interface LiveLocation {
  lat: number
  lng: number
  accuracy: number
  floor: Floor | null
  x_percent: number | null
  y_percent: number | null
}

function matchFloor(lat: number, lng: number, floors: Floor[]): Floor | null {
  return floors.find(f =>
    f.geo_lat_min !== null && f.geo_lat_max !== null &&
    f.geo_lng_min !== null && f.geo_lng_max !== null &&
    lat >= f.geo_lat_min && lat <= f.geo_lat_max &&
    lng >= f.geo_lng_min && lng <= f.geo_lng_max
  ) ?? null
}

function toPercent(floor: Floor, lat: number, lng: number): { x: number; y: number } | null {
  if (
    floor.geo_lat_min == null || floor.geo_lat_max == null ||
    floor.geo_lng_min == null || floor.geo_lng_max == null
  ) return null
  const x = ((lng - floor.geo_lng_min) / (floor.geo_lng_max - floor.geo_lng_min)) * 100
  // Y is inverted: lat_max is top of image (y=0), lat_min is bottom (y=100)
  const y = ((floor.geo_lat_max - lat) / (floor.geo_lat_max - floor.geo_lat_min)) * 100
  return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) }
}

export function startLocationTracking(
  facilityId: string,
  userId: string,
  floors: Floor[],
  onLocation: (loc: LiveLocation) => void
): () => void {
  if (typeof window === 'undefined' || !navigator.geolocation) return () => {}

  const supabase = getSupabaseClient()
  let lastPublish = 0
  const PUBLISH_INTERVAL_MS = 3000

  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords
      const now = Date.now()

      const matchedFloor = matchFloor(latitude, longitude, floors)
      const pct = matchedFloor ? toPercent(matchedFloor, latitude, longitude) : null

      onLocation({
        lat: latitude,
        lng: longitude,
        accuracy,
        floor: matchedFloor,
        x_percent: pct?.x ?? null,
        y_percent: pct?.y ?? null,
      })

      // Throttle Supabase writes to every 3 seconds
      if (now - lastPublish < PUBLISH_INTERVAL_MS) return
      lastPublish = now

      await (supabase as any).from('user_locations').upsert({
        user_id: userId,
        facility_id: facilityId,
        floor_id: matchedFloor?.id ?? null,
        lat: latitude,
        lng: longitude,
        x_percent: pct?.x ?? null,
        y_percent: pct?.y ?? null,
        source: accuracy < 20 ? 'gps' : 'wifi',
        accuracy_meters: accuracy,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    },
    (error) => console.warn('Geolocation error:', error.message),
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  )

  // Pause tracking when tab is hidden to save battery
  function onVisibilityChange() {
    if (document.hidden) {
      navigator.geolocation.clearWatch(watchId)
    }
    // watchPosition re-fires automatically on resume because we keep the same watchId
    // (clearWatch cancels it — the caller restarts if needed)
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    navigator.geolocation.clearWatch(watchId)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

// Call when a QR node is scanned — overrides GPS with exact node position
export async function setLocationFromQR(
  userId: string,
  facilityId: string,
  node: QRNode
): Promise<void> {
  if (typeof window === 'undefined') return
  const supabase = getSupabaseClient()
  await (supabase as any).from('user_locations').upsert({
    user_id: userId,
    facility_id: facilityId,
    floor_id: node.floor_id ?? null,
    x_percent: node.x_percent ?? null,
    y_percent: node.y_percent ?? null,
    source: 'qr',
    accuracy_meters: 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}
