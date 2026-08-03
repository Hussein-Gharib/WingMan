/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};

export default nextConfig;
