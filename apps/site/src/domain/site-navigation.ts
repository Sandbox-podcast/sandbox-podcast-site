const belongsTo = (pathname: string, root: string): boolean =>
  pathname === root || pathname.startsWith(`${root}/`);

export function isNavigationActive(pathname: string, href: string): boolean {
  if (href === '/episodes')
    return belongsTo(pathname, '/episodes') || belongsTo(pathname, '/topics');
  if (href === '/charts')
    return ['/charts', '/projects', '/models', '/moves'].some((root) => belongsTo(pathname, root));
  return belongsTo(pathname, href);
}

/** Le site anglais n'a pas encore de traduction pour toutes les pages publiques. */
export function languageSwitchTarget(pathname: string, locale: string): string {
  const sourcePath = locale.startsWith('fr')
    ? pathname
    : pathname.replace(/^\/[^/]+(?=\/|$)/, '') || '/';
  const inRankings = isNavigationActive(sourcePath, '/charts');
  return locale.startsWith('fr')
    ? inRankings
      ? '/en/charts'
      : '/en'
    : inRankings
      ? '/charts'
      : '/';
}
