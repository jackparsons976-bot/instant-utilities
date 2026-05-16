'use client'

export default function MessagesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Messages</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Direct messages and threads</p>
      </div>
      <div className="placeholder-section">
        <h3>✉️ Messaging</h3>
        <p>Resident-to-manager and direct messaging threads — Phase 3</p>
      </div>
    </div>
  )
}
