import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem', lineHeight: 1.75 }}>
      <nav style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--primary)' }}>Instant Utilities</Link>
        {' / '}Privacy Policy
      </nav>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2.5rem' }}>
        Last updated: 17 May 2026 — Instant Utilities Pty Ltd, Sydney NSW 2000, Australia
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>1. About this policy</h2>
        <p>
          Instant Utilities Pty Ltd (<strong>"we", "us", "our"</strong>) operates a building intelligence and
          emergency coordination platform. This Privacy Policy explains how we collect, use, disclose, and protect
          personal information in accordance with the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy
          Principles (APPs).
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>2. What information we collect</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><strong>Account information:</strong> name, email address, password (hashed).</li>
          <li><strong>Facility data:</strong> unit number, role within facility, facility membership.</li>
          <li><strong>Emergency data:</strong> SOS events (timestamp, user ID, facility), incident reports, hazard markers, and evacuation route interactions.</li>
          <li><strong>Usage data:</strong> page visits, feature interactions, error logs, and realtime subscription activity.</li>
          <li><strong>Device data:</strong> browser type, IP address, operating system.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>3. How we use your information</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>To provide and operate the platform, including emergency coordination features.</li>
          <li>To authenticate users and enforce role-based access controls.</li>
          <li>To send facility announcements and in-app notifications.</li>
          <li>To monitor platform reliability and investigate incidents via error tracking (Sentry).</li>
          <li>To comply with legal obligations and protect the safety of building occupants.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>4. Disclosure of information</h2>
        <p style={{ marginBottom: '0.75rem' }}>
          We do not sell personal information. We may share it with:
        </p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><strong>Facility managers:</strong> within your registered facility for operational purposes.</li>
          <li><strong>Service providers:</strong> Supabase (database and auth, servers in Australia/US), Vercel (hosting, US), Sentry (error monitoring, US) — each bound by data processing agreements.</li>
          <li><strong>Emergency services:</strong> where disclosure is necessary to prevent a serious and imminent threat to a person's life, health, or safety.</li>
          <li><strong>Law enforcement:</strong> where required by Australian law or a court order.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>5. Data security</h2>
        <p>
          We implement row-level security (RLS) on all database tables, encrypted connections (TLS), JWT-based
          authentication, and server-side route protection. Access is scoped to the facility you are a member of.
          Despite these measures, no internet transmission is completely secure.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>6. Data retention</h2>
        <p>
          Account data is retained for the duration of your membership plus 12 months. Emergency event data
          (SOS events, incidents) is retained for 7 years for safety and compliance purposes. You may request
          deletion of non-safety data at any time.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>7. Your rights</h2>
        <p>
          Under the APPs, you have the right to access, correct, and in some circumstances request deletion of your
          personal information. To exercise these rights, contact us at{' '}
          <a href="mailto:privacy@instantutilities.com" style={{ color: 'var(--primary)' }}>privacy@instantutilities.com</a>.
          We will respond within 30 days.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>8. Cookies and local storage</h2>
        <p>
          We use browser localStorage to persist your authentication session. A short-lived cookie
          (<code>sb-access-token</code>) is written solely to enable server-side route protection; it contains
          only your JWT access token and expires in 1 hour.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>9. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. Material changes will be notified via an in-app
          announcement. Continued use of the platform after the effective date constitutes acceptance.
        </p>
      </section>

      <section>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>10. Contact</h2>
        <p>
          Privacy enquiries: <a href="mailto:privacy@instantutilities.com" style={{ color: 'var(--primary)' }}>privacy@instantutilities.com</a><br />
          Instant Utilities Pty Ltd, Sydney NSW 2000, Australia
        </p>
      </section>

      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link>
        <Link href="/terms" style={{ color: 'var(--muted)' }}>Terms of Service</Link>
        <Link href="/login" style={{ color: 'var(--muted)' }}>Sign in</Link>
      </div>
    </div>
  )
}
