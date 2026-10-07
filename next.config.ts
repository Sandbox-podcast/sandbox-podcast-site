import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['ws'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'i.ytimg.com' }],
  },
  // Les URL du prompt d'origine (/rankings/…) restent valides : la section s'appelle CHARTS (DD-0001).
  redirects() {
    return Promise.resolve([
      { source: '/rankings', destination: '/charts', permanent: true },
      { source: '/rankings/history', destination: '/charts/history', permanent: true },
      { source: '/rankings/history/:week', destination: '/charts/history/:week', permanent: true },
      { source: '/rankings/:slug', destination: '/charts/:slug', permanent: true },
      { source: '/rankings/:slug/:rest*', destination: '/charts/:slug/:rest*', permanent: true },
    ]);
  },
  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]);
  },
};

export default config;
