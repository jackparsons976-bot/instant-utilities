import type { Metadata } from 'next'
import { AuthProvider } from '@/providers/AuthProvider'
import { ToastProvider } from '@/components/Toast'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Instant Utilities', template: '%s — Instant Utilities' },
  description: 'Live building intelligence and emergency coordination platform',
  openGraph: {
    title: 'Instant Utilities',
    description: 'Live building intelligence, emergency coordination, and residential operations.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
