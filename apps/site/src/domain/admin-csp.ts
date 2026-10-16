/** Administration is already rendered per request, so a fresh nonce has no ISR cost. */
export function adminContentSecurityPolicy(nonce: string): string {
  if (!/^[A-Za-z0-9+/]{22,}={0,2}$/.test(nonce)) throw new Error('Nonce CSP invalide.');
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.ytimg.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.public.blob.vercel-storage.com",
    "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
  ].join('; ');
}
