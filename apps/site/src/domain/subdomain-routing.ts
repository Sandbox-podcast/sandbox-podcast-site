export const SLIDES_HOST = 'slides.sandboxpodcast.fr';

const DECK_ROOT_RE = /^\/(episode-[^/]+)\/?$/;
const DECK_INDEX_RE = /^\/(episode-[^/]+)\/index\.html$/;

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
 * Redirection visible (évite la boucle 307⇄308 sur le slash final).
 * `/episode-043` et `/episode-043/` → `/episode-043/index.html`
 */
export function slidesBrowserRedirect(pathname: string): string | null {
  const deck = DECK_ROOT_RE.exec(pathname)?.[1];
  return deck ? `/${deck}/index.html` : null;
}

/**
 * Cible interne sous /slides/ pour une URL du sous-domaine.
 * Les decks pointent vers index.html (pas un dossier) pour éviter les redirects trailing slash.
 */
export function slidesRewriteDestination(pathname: string): string | null {
  if (shouldBypassSlidesRewrite(pathname)) return null;
  if (pathname === '/' || pathname === '') return '/slides/index.html';
  if (pathname.startsWith('/slides/') || pathname === '/slides') return null;

  const deckIndex = DECK_INDEX_RE.exec(pathname)?.[1];
  if (deckIndex) return `/slides/${deckIndex}/index.html`;

  const deckRoot = DECK_ROOT_RE.exec(pathname)?.[1];
  if (deckRoot) return `/slides/${deckRoot}/index.html`;

  return `/slides${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
