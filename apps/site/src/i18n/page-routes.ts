export const SHARED_PAGE_ROUTES = [
  '/',
  '/episodes',
  '/episodes/:number',
  '/topics',
  '/topics/:slug',
  '/about',
  '/search',
  '/latest',
  '/stories/:slug',
  '/projects/:slug',
  '/models/:slug',
  '/moves/:chart/:week/:entity',
  '/charts',
  '/charts/history',
  '/charts/history/:week',
  '/charts/project/:slug',
  '/charts/skills/:platform',
  '/charts/models/:task',
  '/charts/rising',
  '/charts/rising/methodology',
  '/charts/rising/:week',
  '/charts/:slug/methodology',
  '/charts/:slug/:week',
  '/charts/:slug',
] as const;

export type SharedPageRoute = (typeof SHARED_PAGE_ROUTES)[number];

/** Routes publiques communes à toutes les langues. Les identifiants éditoriaux restent stables. */
export function matchSharedPage(
  path: string,
): { route: SharedPageRoute; params: Record<string, string> } | undefined {
  const segments = path.split(/[?#]/)[0]?.split('/').filter(Boolean) ?? [];
  for (const route of SHARED_PAGE_ROUTES) {
    const pattern = route.split('/').filter(Boolean);
    if (pattern.length !== segments.length) continue;
    const params: Record<string, string> = {};
    const matches = pattern.every((segment, index) => {
      const value = segments[index];
      if (!value) return false;
      if (!segment.startsWith(':')) return segment === value;
      params[segment.slice(1)] = value;
      return true;
    });
    if (matches) return { route, params };
  }
  return undefined;
}
