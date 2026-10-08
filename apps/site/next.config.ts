import type { NextConfig } from 'next';
import { subdomainRedirectRules, subdomainRewriteRules } from './src/domain/subdomain-routing';

// Le rendu statique de Next utilise des scripts inline pour l'hydratation.
// Cette politique limite les origines et les intégrations autorisées sans casser ce rendu.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://i.ytimg.com",
  "font-src 'self' data:",
  "connect-src 'self' https://vitals.vercel-insights.com",
  'frame-src https://www.youtube-nocookie.com',
].join('; ');

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
      ...subdomainRedirectRules,
    ]);
  },
  rewrites() {
    return Promise.resolve({
      beforeFiles: subdomainRewriteRules,
    });
  },
  headers() {
    return Promise.resolve([
      {
        source: '/api/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/admin',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }]
            : []),
        ],
      },
    ]);
  },
};

export default config;
