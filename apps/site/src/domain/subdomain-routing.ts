export const SLIDES_HOST = 'slides.sandboxpodcast.fr';

export function slidesHostFromHeader(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  return hostHeader.split(':')[0]?.toLowerCase() ?? null;
}

export function isSlidesHost(hostHeader: string | null): boolean {
  return slidesHostFromHeader(hostHeader) === SLIDES_HOST;
}

/** Chemins laissés tels quels sur le sous-domaine (runtime Next, API). */
export function shouldBypassSlidesRewrite(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.svg' ||
    pathname === '/apple-icon' ||
    pathname.startsWith('/apple-icon')
  );
}

/**
 * Cible interne sous /slides/ pour une URL du sous-domaine.
 * Retourne null si aucune rewrite n’est nécessaire.
 */
export function slidesRewriteDestination(pathname: string): string | null {
  if (shouldBypassSlidesRewrite(pathname)) return null;
  if (pathname === '/' || pathname === '') return '/slides/index.html';
  if (pathname.startsWith('/slides/') || pathname === '/slides') return null;
  return `/slides${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

/** Sur le sous-domaine, forcer le slash final pour que ./assets/ se résolve sous le deck. */
export const subdomainRedirectRules = [
  {
    source: '/:deck(episode-[^/.]+)',
    has: [{ type: 'host' as const, value: SLIDES_HOST }],
    destination: '/:deck/',
    permanent: false,
  },
];
