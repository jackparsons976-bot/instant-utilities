import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="center" style={{ flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
      <p style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1 }}>404</p>
      <p style={{ color: 'var(--muted)' }}>This page could not be found.</p>
      <Link href="/" className="btn btn-outline">Go home</Link>
    </div>
  )
}
