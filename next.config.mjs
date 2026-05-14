/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

const nextConfig = {
  output: 'standalone',

  experimental: {
    outputFileTracingIncludes: {
      '/api/analyze': ['./node_modules/pdf-parse/**'],
      '/api/match': ['./node_modules/pdf-parse/**'],
      '/api/anonymize': ['./node_modules/pdf-parse/**'],
      '/api/cv-preview': ['./node_modules/pdf-parse/**'],
    },
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({ 'pdf-parse': 'commonjs pdf-parse' })
    }
    return config
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent browsers from MIME-sniffing away from the declared content-type
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Refuse to render inside a frame (clickjacking protection)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Enforce HTTPS when deployed
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Only send the origin as referrer, not the full path
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable browser features this app never needs
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // Content Security Policy
          // - default-src 'self': everything must be same-origin unless overridden
          // - script-src: 'unsafe-eval' only in dev (Next.js fast refresh); 'unsafe-inline' for hydration chunks
          // - style-src 'unsafe-inline': Tailwind inline styles require this
          // - img-src data: allows base64 images (SVG logos etc.)
          // - connect-src 'self': API calls only go to same origin (Gemini is called server-side)
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
              // Google Fonts CSS is loaded via <link>; font files come from gstatic
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https://media-asgard.s3.eu-west-1.amazonaws.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
