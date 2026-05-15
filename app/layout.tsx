// app/layout.tsx
// Root layout — wraps the full app in AuthProvider.
// AuthProvider calls getSession() on mount, subscribes to auth state changes,
// and keeps authStore + facilityStore in sync.

import type { Metadata } from 'next';
import { AuthProvider } from '@/providers/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Harbourview Platform',
  description: 'Live building intelligence and emergency coordination',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
