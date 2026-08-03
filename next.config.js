/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

// Content Security Policy.
// - img-src allows Vercel Blob (uploaded images), data: and blob: previews.
// - style-src allows inline styles (framer-motion + Next inject them).
// - script-src allows inline (Next hydration bootstrap). 'unsafe-eval' is added
//   only in development for React Fast Refresh; production stays without it.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "font-src 'self' data:",
  "connect-src 'self' https://*.public.blob.vercel-storage.com",
  "manifest-src 'self'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // HSTS is honored only over HTTPS; browsers ignore it on http (safe locally).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Vercel Blob public URLs are served from this host.
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },
  experimental: {
    // PGlite (local-dev database) ships WASM and must not be bundled. It is only
    // imported when DATABASE_URL is absent, so production (Neon) never loads it.
    serverComponentsExternalPackages: ['@electric-sql/pglite'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
