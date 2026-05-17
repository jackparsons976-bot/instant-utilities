import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [
    Sentry.replayIntegration(),
  ],
  debug: false,
})

// Required by Next.js 16 for navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
