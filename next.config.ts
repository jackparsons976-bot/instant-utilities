import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default withSentryConfig(nextConfig, {
  org: 'instant-utilities',
  project: 'instant-utilities',
  silent: true,
  disableLogger: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  automaticVercelMonitors: false,
})
