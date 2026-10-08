export const SLIDES_HOST = 'slides.sandboxpodcast.fr';

/** Rewrite hôte slides : la racine sert l’index ; le reste préserve le dossier du deck. */
export const subdomainRewriteRules = [
  {
    source: '/',
    has: [{ type: 'host' as const, value: SLIDES_HOST }],
    destination: '/presentations',
  },
  {
    source: '/:path+',
    has: [{ type: 'host' as const, value: SLIDES_HOST }],
    destination: '/slides/:path+',
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
