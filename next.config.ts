// Designed and constructed by Claudesy.
import type { NextConfig } from 'next'

const BRIDGE_CORS_HEADERS = [
  { key: 'Access-Control-Allow-Origin', value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-Crew-Access-Token, X-Correlation-Id' },
]

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ['socket.io-client', 'engine.io-client', '@socket.io/component-emitter'],
  async headers() {
    return [
      {
        // Bridge API — called by sentra-assist Chrome extension
        source: '/api/emr/:path*',
        headers: BRIDGE_CORS_HEADERS,
      },
      {
        source: '/api/doctors/:path*',
        headers: BRIDGE_CORS_HEADERS,
      },
      {
        source: '/api/consult',
        headers: BRIDGE_CORS_HEADERS,
      },
    ]
  },
}

export default nextConfig
