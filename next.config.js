/** @type {import('next').NextConfig} */
// Build timestamp: 2026-01-07T01:30:00Z - forcing redeployment
const nextConfig = {
  // Enable server actions for form handling
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: https://pbs.twimg.com https://abs.twimg.com",
              "font-src 'self'",
              "connect-src 'self' https://api.stripe.com https://api.twitter.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
