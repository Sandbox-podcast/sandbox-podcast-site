import type { NextConfig } from 'next';

// Le rendu statique de Next utilise des scripts inline pour l'hydratation.
// Cette politique limite les origines et les intégrations autorisées sans casser ce rendu.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://www.youtube.com https://www.googletagmanager.com",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://i.ytimg.com https://www.googletagmanager.com https://*.google-analytics.com",
  "font-src 'self' data:",
  "media-src 'self' https://marlburrow.github.io https://raw.githubusercontent.com",
  "connect-src 'self' https://vitals.vercel-insights.com https://www.googletagmanager.com https://*.google-analytics.com https://www.google.com",
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
].join('; ');

const config: NextConfig = {
  distDir:
    process.env.NODE_ENV === 'development' && process.env['SANDBOX_NEWS_PREVIEW'] === '1'
      ? '.local/news-next'
      : '.next',
  reactStrictMode: true,
  experimental: { cpus: 2 },
  poweredByHeader: false,
  serverExternalPackages: ['ws', '@neondatabase/serverless'],
  // Les chemins construits par le moteur OG ne sont pas détectés par le traçage du build.
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/@fontsource/archivo/files/archivo-latin-900-normal.woff',
      './node_modules/@fontsource/archivo/files/archivo-latin-800-normal.woff',
      './node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff',
      './node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff',
      './node_modules/@fontsource/newsreader/files/newsreader-latin-400-italic.woff',
    ],
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      {
        protocol: 'https',
        hostname: 'github.com',
        port: '',
        pathname: '/*.png',
        search: '?size=80',
      },
    ],
  },
  // Les URL du prompt d'origine (/rankings/…) restent valides : la section s'appelle CHARTS (DD-0001).
  redirects() {
    return Promise.resolve([
      ...['', '/en', '/es-es', '/de-de'].flatMap((prefix) => [
        { source: `${prefix}/episodes`, destination: `${prefix}/podcast`, permanent: true },
        { source: `${prefix}/topics/:slug*`, destination: `${prefix}/podcast`, permanent: true },
      ]),
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
          { key: 'Referrer-Policy', value: 'strict-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              // /admin reçoit son nonce propre à la requête depuis le middleware.
              source: '/((?!admin(?:/|$)).*)',
              headers: [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }],
            },
          ]
        : []),
      {
        // Next applique les en-têtes de configuration après ceux du Route Handler.
        // Garder cette règle après la politique générale du site.
        source: '/badges/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; style-src 'none'; sandbox",
          },
        ],
      },
    ]);
  },
};

export default config;
