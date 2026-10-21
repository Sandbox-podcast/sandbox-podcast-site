import { PUBLIC_SITE_LOCALES } from './locales';
import { isLocaleUiReviewed } from './messages';
import { matchSharedPage } from './page-routes';
import { localizedHref, sourcePath } from './routing';

/** Les variantes partagent exactement la même ressource publiée. */
export function sharedPageAlternates(path: string) {
  const source = sourcePath(path);
  if (!matchSharedPage(source)) return [];
  return PUBLIC_SITE_LOCALES.filter(({ locale }) => isLocaleUiReviewed(locale)).map(
    ({ locale }) => ({
      locale,
      path: localizedHref(source, locale),
      indexable: true,
    }),
  );
}

/** La traduction ne doit jamais ouvrir une recherche, un brouillon ou une page vide. */
export function sourceAllowsIndexing(
  robots: string | { index?: boolean | undefined } | null | undefined,
  fallback = false,
): boolean {
  if (typeof robots === 'string') return !/(?:^|[,\s])noindex(?:$|[,\s])/i.test(robots);
  return robots?.index ?? fallback;
}
