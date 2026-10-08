const belongsTo = (pathname: string, root: string): boolean =>
  pathname === root || pathname.startsWith(`${root}/`);

export function isNavigationActive(pathname: string, href: string): boolean {
  if (href === '/episodes')
    return belongsTo(pathname, '/episodes') || belongsTo(pathname, '/topics');
  if (href === '/charts')
    return ['/charts', '/projects', '/models', '/moves'].some((root) => belongsTo(pathname, root));
  return belongsTo(pathname, href);
}
