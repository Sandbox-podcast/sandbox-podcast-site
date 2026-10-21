import { DEFAULT_SITE_LOCALE, localeTagFromRouteSegment, siteLocaleSchema } from '../i18n/locales';
import { sourcePath } from '../i18n/routing';

export const SITE_LOCALE_COOKIE = 'sandbox-locale';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const BASE_LOCALES = new Map([
  ['fr', 'fr-FR'],
  ['en', 'en'],
  ['es', 'es-ES'],
  ['de', 'de-DE'],
]);

/** Le choix explicite prime ; sinon les langues du navigateur sont classées par qualité. */
export function preferredBrowserLocale(
  acceptLanguage: string | null | undefined,
  savedLocale?: string,
): string {
  const saved = siteLocaleSchema.safeParse(savedLocale);
  if (saved.success) return saved.data;
  const candidates = (acceptLanguage ?? '')
    .split(',')
    .map((entry, index) => {
      const [language = '', ...parameters] = entry.trim().split(';');
      const qualityParameter = parameters.find((parameter) => /^\s*q\s*=/i.test(parameter));
      const qualityText = qualityParameter?.split('=')[1]?.trim();
      const quality =
        qualityText === undefined
          ? 1
          : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(qualityText)
            ? Number(qualityText)
            : 0;
      const base = language.trim().toLowerCase().split('-')[0];
      const locale = /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i.test(language.trim())
        ? BASE_LOCALES.get(base ?? '')
        : undefined;
      return { locale, quality, index };
    })
    .filter((candidate) => candidate.locale && candidate.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return candidates[0]?.locale ?? DEFAULT_SITE_LOCALE;
}

/** Les anciennes URL traduites reviennent temporairement au français. */
export function browserLocaleRedirect({
  pathname,
  method,
}: {
  pathname: string;
  method: string;
  acceptLanguage?: string | null;
  savedLocale?: string | undefined;
}): string | undefined {
  if (!['GET', 'HEAD'].includes(method)) return undefined;
  if (!localeTagFromRouteSegment(pathname.split('/')[1] ?? '')) return undefined;
  const destination = sourcePath(pathname);
  return destination === pathname ? undefined : destination;
}

/** Cookie fonctionnel écrit uniquement lorsqu'une personne choisit sa langue. */
export function manualLocaleCookie(locale: string, secure: boolean): string {
  const value = siteLocaleSchema.parse(locale);
  return `${SITE_LOCALE_COOKIE}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure ? '; Secure' : ''}`;
}
