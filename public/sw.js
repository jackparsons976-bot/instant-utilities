// public/sw.js
const CACHE_NAME = 'floor-plans-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim())
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Only cache floor plan images (from Supabase Storage or similar)
  const isFloorPlanImage = (
    url.pathname.includes('/floor-plans/') ||
    url.pathname.includes('/storage/v1/object/public/floor-plans')
  )

  if (!isFloorPlanImage) return

  // Stale-while-revalidate
  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request)
      const fetchPromise = fetch(e.request).then((response) => {
        if (response.ok) cache.put(e.request, response.clone())
        return response
      }).catch(() => cached)
      return cached || fetchPromise
    })
  )
})
