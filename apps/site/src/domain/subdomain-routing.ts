export const SLIDES_HOST = 'slides.sandboxpodcast.fr';

/**
 * Rewrite hôte slides :
 * - `/` → index HTML statique (pas de bundle `/_next`)
 * - chemins deck/assets → `/slides/...`
 * - exclure `/_next`, `/api`, etc. pour ne pas casser le runtime Next
 */
export const subdomainRewriteRules = [
  {
    source: '/',
    has: [{ type: 'host' as const, value: SLIDES_HOST }],
    destination: '/slides/index.html',
  },
  {
    source: '/:path((?!_next(?:/|$)|api(?:/|$)|presentations(?:/|$)).*)',
    has: [{ type: 'host' as const, value: SLIDES_HOST }],
    destination: '/slides/:path',
  },
];

/** Sur le sous-domaine, forcer le slash final pour que ./assets/ se résolve sous le deck. */
export const subdomainRedirectRules = [
  {
    source: '/:deck(episode-[^/.]+)',
    has: [{ type: 'host' as const, value: SLIDES_HOST }],
    destination: '/:deck/',
    permanent: false,
  },
];
