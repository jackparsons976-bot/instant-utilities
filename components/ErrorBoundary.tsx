'use client'

import { Component, type ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</p>
        <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Something went wrong</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          {this.state.message || 'An unexpected error occurred.'}
        </p>
        <a href="/dashboard" style={{
          display: 'inline-flex', alignItems: 'center', padding: '0.5rem 1.25rem',
          background: 'var(--primary)', color: '#fff', borderRadius: '8px',
          fontSize: '0.875rem', fontWeight: 500,
        }}>
          Go back to dashboard
        </a>
      </div>
    )
  }
}
