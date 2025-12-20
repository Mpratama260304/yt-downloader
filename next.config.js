/** @type {import('next').NextConfig} */

/**
 * Next.js Configuration
 * 
 * This config does NOT require any .env files to build.
 * All runtime configuration is handled via environment variables
 * that can be set in docker-compose.yml.
 * 
 * For Phala Cloud and similar platforms, set these in docker-compose.yml:
 *   - NODE_ENV=production
 *   - PORT=3000
 *   - HOSTNAME=0.0.0.0
 *   - NEXT_PUBLIC_APP_URL=https://your-domain.com
 */
const nextConfig = {
  // Enable images from YouTube thumbnails
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Compress responses
  compress: true,
  
  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Enable experimental features
  experimental: {
    serverComponentsExternalPackages: ['yt-dlp-wrap', 'winston'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
