// lib/offline/cache.ts

const DB_NAME = 'instant-utilities-offline'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('SSR')); return }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('floor-plans')) {
        db.createObjectStore('floor-plans', { keyPath: 'floorId' })
      }
      if (!db.objectStoreNames.contains('sos-queue')) {
        db.createObjectStore('sos-queue', { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface CachedFloorPlan {
  floorId: string
  facilityId: string
  imageUrl: string | null
  nodes: any[]
  hazardMarkers: any[]
  cachedAt: number
}

export async function cacheFloorPlan(data: CachedFloorPlan): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('floor-plans', 'readwrite')
      tx.objectStore('floor-plans').put(data)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* silent fail — offline cache is best-effort */ }
}

export async function getCachedFloorPlan(floorId: string): Promise<CachedFloorPlan | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('floor-plans', 'readonly')
      const req = tx.objectStore('floor-plans').get(floorId)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch { return null }
}

export interface QueuedSOS {
  facilityId: string
  userId: string
  floorId: string | null
  x_percent: number | null
  y_percent: number | null
  queuedAt: number
}

export async function queueSOSOffline(sos: QueuedSOS): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sos-queue', 'readwrite')
      tx.objectStore('sos-queue').add({ ...sos })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* silent */ }
}

export async function drainSOSQueue(): Promise<QueuedSOS[]> {
  try {
    const db = await openDB()
    const items: QueuedSOS[] = await new Promise((resolve, reject) => {
      const tx = db.transaction('sos-queue', 'readwrite')
      const store = tx.objectStore('sos-queue')
      const req = store.getAll()
      req.onsuccess = () => {
        store.clear()
        resolve(req.result)
      }
      req.onerror = () => reject(req.error)
    })
    return items
  } catch { return [] }
}
