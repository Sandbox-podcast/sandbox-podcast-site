const belongsTo = (pathname: string, root: string): boolean =>
  pathname === root || pathname.startsWith(`${root}/`);

export function isNavigationActive(pathname: string, href: string): boolean {
  if (href === '/podcast')
    return belongsTo(pathname, '/podcast') || belongsTo(pathname, '/episodes');
  if (href === '/charts')
    return ['/charts', '/projects', '/models', '/moves'].some((root) => belongsTo(pathname, root));
  return belongsTo(pathname, href);
}
