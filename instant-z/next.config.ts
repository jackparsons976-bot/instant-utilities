import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Only type-check files inside this project, not sibling folders
    ignoreBuildErrors: false,
  },
  // Exclude unrelated project folders from compilation
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules/**', '**/ai-realtor-os/**'],
    }
    return config
  },
}

export default nextConfig
