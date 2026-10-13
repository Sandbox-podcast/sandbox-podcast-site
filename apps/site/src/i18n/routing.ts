import { DEFAULT_SITE_LOCALE, localeRouteSegment, localeTagFromRouteSegment } from './locales';

const PUBLIC_ROOTS = new Set([
  'episodes',
  'charts',
  'projects',
  'models',
  'topics',
  'stories',
  'moves',
  'latest',
  'about',
  'search',
]);

/** Même ressource et mêmes paramètres, seule la langue du chemin change. */
export function sourcePath(path: string): string {
  const boundary = path.search(/[?#]/);
  const pathname = boundary === -1 ? path : path.slice(0, boundary);
  const suffix = boundary === -1 ? '' : path.slice(boundary);
  const segments = pathname.split('/').filter(Boolean);
  if (
    segments[0] &&
    !['api', 'admin', '_next', 'flags'].includes(segments[0]) &&
    localeTagFromRouteSegment(segments[0])
  )
    segments.shift();
  return `/${segments.join('/')}${suffix}`;
}

export function localizedHref(href: string, locale: string = DEFAULT_SITE_LOCALE): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const path = sourcePath(href);
  const first = path.split(/[?#]/)[0]?.split('/').find(Boolean);
  if (first && !PUBLIC_ROOTS.has(first)) return href;
  const prefix = localeRouteSegment(locale);
  if (!prefix) return path;
  return `/${prefix}${path === '/' ? '' : path.startsWith('/?') || path.startsWith('/#') ? path.slice(1) : path}`;
}

export function localeCountry(locale: string): string {
  const countries: Record<string, string> = {
    'fr-FR': 'fr',
    en: 'gb',
    'es-ES': 'es',
    'de-DE': 'de',
  };
  const country = countries[locale];
  if (!country) throw new RangeError(`Langue non prise en charge : ${locale}`);
  return country;
}
