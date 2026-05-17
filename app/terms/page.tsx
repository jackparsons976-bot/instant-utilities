import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem', lineHeight: 1.75 }}>
      <nav style={{ marginBottom: '2rem', fontSize: '0.875rem' }}>
        <Link href="/" style={{ color: 'var(--primary)' }}>Instant Utilities</Link>
        {' / '}Terms of Service
      </nav>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Terms of Service</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2.5rem' }}>
        Last updated: 17 May 2026 — Instant Utilities Pty Ltd, Sydney NSW 2000, Australia
      </p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>1. Acceptance</h2>
        <p>
          By accessing or using the Instant Utilities platform (<strong>"Platform"</strong>), you agree to be bound
          by these Terms of Service and our Privacy Policy. If you do not agree, do not use the Platform.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>2. Emergency features — important disclaimer</h2>
        <div style={{ background: '#fff3cd', border: '1px solid #f59e0b', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
          <strong>The SOS and emergency coordination features are supplementary tools only.</strong>
        </div>
        <p>
          In any genuine emergency — including fire, medical emergency, or threat to life — you must{' '}
          <strong>call 000</strong> (Australian emergency services) immediately. The Platform does not connect
          you to emergency services. Facility managers may not be available at all times. Do not rely solely
          on this Platform during a life-threatening situation.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>3. Permitted use</h2>
        <p style={{ marginBottom: '0.75rem' }}>You agree to use the Platform only for its intended purpose and in compliance with all applicable laws. You must not:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Submit false SOS alerts or fabricate emergency events.</li>
          <li>Attempt to access data outside your facility membership.</li>
          <li>Use the Platform to harass, harm, or defame any person.</li>
          <li>Reverse-engineer, scrape, or interfere with the Platform's systems.</li>
          <li>Share your credentials or allow unauthorised access to your account.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>4. Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your password and for all activity under
          your account. Notify us immediately at{' '}
          <a href="mailto:support@instantutilities.com" style={{ color: 'var(--primary)' }}>support@instantutilities.com</a>{' '}
          if you suspect unauthorised access.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>5. Availability</h2>
        <p>
          We aim for high availability but do not guarantee uninterrupted access. The Platform may be
          unavailable during maintenance windows or due to circumstances beyond our control. Real-time
          features (SOS alerts, live subscriptions) depend on internet connectivity and third-party
          infrastructure.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>6. Intellectual property</h2>
        <p>
          All content, software, and trademarks on the Platform are owned by Instant Utilities Pty Ltd or its
          licensors. You may not reproduce, distribute, or create derivative works without written permission.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>7. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by Australian consumer law, Instant Utilities Pty Ltd is not liable
          for indirect, incidental, special, or consequential damages arising from your use of the Platform,
          including loss arising from failure of emergency features. Our total liability to you for any claim
          shall not exceed AUD $100.
        </p>
        <p style={{ marginTop: '0.75rem' }}>
          Nothing in these Terms limits rights you may have under the{' '}
          <em>Australian Consumer Law</em> (Schedule 2 of the <em>Competition and Consumer Act 2010</em> (Cth)).
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>8. Termination</h2>
        <p>
          We may suspend or terminate your account if you breach these Terms or if required by law.
          You may delete your account at any time by contacting support.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>9. Governing law</h2>
        <p>
          These Terms are governed by the laws of New South Wales, Australia. You submit to the exclusive
          jurisdiction of the courts of New South Wales for any disputes arising under these Terms.
        </p>
      </section>

      <section>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.75rem' }}>10. Contact</h2>
        <p>
          <a href="mailto:support@instantutilities.com" style={{ color: 'var(--primary)' }}>support@instantutilities.com</a><br />
          Instant Utilities Pty Ltd, Sydney NSW 2000, Australia
        </p>
      </section>

      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
        <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link>
        <Link href="/privacy" style={{ color: 'var(--muted)' }}>Privacy Policy</Link>
        <Link href="/login" style={{ color: 'var(--muted)' }}>Sign in</Link>
      </div>
    </div>
  )
}
