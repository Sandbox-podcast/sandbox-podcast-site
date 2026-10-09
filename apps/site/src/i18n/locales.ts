import { z } from 'zod';

export const DEFAULT_SITE_LOCALE = 'fr-FR';

/** Les seules langues proposées et servies par le site. */
export const SITE_LOCALES = [
  { locale: 'fr-FR', name: 'Français' },
  { locale: 'en', name: 'Anglais' },
  { locale: 'es-ES', name: 'Espagnol' },
  { locale: 'de-DE', name: 'Allemand' },
] as const;

export const siteLocaleSchema = z.enum(['fr-FR', 'en', 'es-ES', 'de-DE']);

/** Préfixe d'URL stable : / pour le français, /en/, /es-es/ et /de-de/ ailleurs. */
export function localeRouteSegment(locale: string): string | null {
  const supported = siteLocaleSchema.parse(locale);
  return supported === DEFAULT_SITE_LOCALE ? null : supported.toLowerCase();
}

/** Retourne une langue prise en charge depuis son préfixe d'URL. */
export function localeTagFromRouteSegment(segment: string): string | undefined {
  return SITE_LOCALES.find(
    (item) => item.locale !== DEFAULT_SITE_LOCALE && item.locale.toLowerCase() === segment,
  )?.locale;
}

export function localizedPathMatchesLocale(path: string, locale: string): boolean {
  const prefix = localeRouteSegment(locale);
  if (!prefix) {
    const firstSegment = path.split('/').find(Boolean);
    return (
      path.startsWith('/') &&
      !path.startsWith('//') &&
      !firstSegment?.match(/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/i)
    );
  }
  return path.startsWith(`/${prefix}/`) || path === `/${prefix}`;
}

export function localeLabel(locale: string): string {
  return SITE_LOCALES.find((item) => item.locale === locale)?.name ?? locale;
}
