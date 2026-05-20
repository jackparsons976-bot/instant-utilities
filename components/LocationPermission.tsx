'use client'

import { useEffect, useState } from 'react'

type PermState = 'granted' | 'denied' | 'prompt' | 'unknown'

interface LocationPermissionProps {
  onGranted?: () => void
}

export function LocationPermission({ onGranted }: LocationPermissionProps) {
  const [state, setState] = useState<PermState>('unknown')
  const [modalDismissed, setModalDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.permissions) {
      setState('unknown')
      return
    }
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      setState(result.state as PermState)
      result.onchange = () => {
        setState(result.state as PermState)
        if (result.state === 'granted') onGranted?.()
      }
    }).catch(() => setState('unknown'))
  }, [onGranted])

  if (state === 'granted' || state === 'unknown') return null

  if (state === 'denied') {
    return (
      <div style={{
        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
        padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
        fontSize: '0.875rem', color: '#991b1b',
      }}>
        <span style={{ fontSize: '1.1rem' }}>⚠️</span>
        <span>
          Location access is off. Enable it in your browser settings to see your position on the map and receive accurate emergency guidance.
        </span>
      </div>
    )
  }

  // state === 'prompt' — show one-time modal explaining why
  if (!modalDismissed) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}>
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '2rem',
          maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📍</div>
          <h2 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
            Allow location access
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Instant Utilities needs your location to show your position on the floor plan and guide you during emergencies.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => {
                setModalDismissed(true)
                // Trigger browser geolocation prompt
                navigator.geolocation.getCurrentPosition(
                  () => { setState('granted'); onGranted?.() },
                  () => setState('denied')
                )
              }}
            >
              Allow
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setModalDismissed(true)}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
