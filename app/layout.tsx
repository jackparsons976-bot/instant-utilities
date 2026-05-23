import type { Metadata } from 'next'
import { AuthProvider } from '@/providers/AuthProvider'
import { ToastProvider } from '@/components/Toast'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Instant Utilities', template: '%s — Instant Utilities' },
  description: 'Live building intelligence and emergency coordination platform',
  openGraph: {
    title: 'Instant Utilities',
    description: 'Live building intelligence, emergency coordination, and residential operations.',
    type: 'website',
    images: [{ url: '/icon-512.png', width: 512, height: 512 }],
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
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
