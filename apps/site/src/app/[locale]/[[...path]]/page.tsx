import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { sharedPages } from '@/components/shared-pages';
import { matchSharedPage } from '@/i18n/page-routes';
import { sourcePath } from '@/i18n/routing';
import { siteDictionary } from '@/i18n/dictionaries';
import { translateText } from '@/i18n/translation';
import { preparePublicEditorialContent } from '@/lib/admin-persistence';
import { localeTagFromRouteSegment } from '@/i18n/locales';
import { isLocaleUiReviewed } from '@/i18n/messages';
import { sharedPageAlternates, sourceAllowsIndexing } from '@/i18n/indexing';
import { hreflangAlternates } from '@/domain/ranking-catalog';
import { isMock, siteConfig } from '@/config/site';
import {
  pageMetadata,
  absoluteUrl,
  openGraphLocaleForTag,
  robotsMetadata,
  siteShareImage,
} from '@/lib/seo';

export const revalidate = 3600;

type RouteParams = Promise<{ locale: string; path?: string[] }>;

function routePath(routeLocale: string, path?: string[]): string {
  return `/${routeLocale}${path?.length ? `/${path.join('/')}` : ''}`;
}

export async function generateMetadata({
  params,
  searchParams = Promise.resolve({}),
}: {
  params: RouteParams;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale: routeLocale, path } = await params;
  const locale = localeTagFromRouteSegment(routeLocale);
  if (!locale) return {};
  const pathName = routePath(routeLocale, path);
  const shared = matchSharedPage(sourcePath(pathName));
  if (shared) {
    const dictionary = await siteDictionary(locale);
    const metadata = await sharedPages[shared.route].metadata({
      locale,
      params: shared.params,
      searchParams,
      dictionary,
    });
    const title =
      typeof metadata.title === 'string'
        ? translateText(metadata.title, dictionary, locale)
        : metadata.title;
    const description = metadata.description
      ? translateText(metadata.description, dictionary, locale)
      : metadata.description;
    const image = siteShareImage();
    const indexable = isLocaleUiReviewed(locale) && sourceAllowsIndexing(metadata.robots, !isMock);
    const languages = indexable
      ? hreflangAlternates(sharedPageAlternates(pathName), siteConfig.url)
      : undefined;
    return {
      ...metadata,
      title,
      description,
      alternates: { canonical: absoluteUrl(pathName), ...(languages ? { languages } : {}) },
      robots: robotsMetadata(!indexable),
      openGraph: {
        ...metadata.openGraph,
        ...(typeof title === 'string' ? { title } : {}),
        ...(description ? { description } : {}),
        images: [image],
        url: absoluteUrl(pathName),
        locale: openGraphLocaleForTag(locale),
      },
      twitter: {
        ...metadata.twitter,
        ...(typeof title === 'string' ? { title } : {}),
        ...(description ? { description } : {}),
        images: [{ url: image.url, alt: image.alt }],
      },
    };
  }
  return pageMetadata({
    title: 'Page not found',
    description: 'This page is not available in this language.',
    path: pathName,
    locale,
    noindex: true,
  });
}

export default async function LocalizedPage({
  params,
  searchParams = Promise.resolve({}),
}: {
  params: RouteParams;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: routeLocale, path } = await params;
  const locale = localeTagFromRouteSegment(routeLocale);
  if (!locale) notFound();
  const pathName = routePath(routeLocale, path);
  const shared = matchSharedPage(sourcePath(pathName));
  await preparePublicEditorialContent();
  if (shared) {
    const dictionary = await siteDictionary(locale);
    return sharedPages[shared.route].render({
      params: shared.params,
      searchParams,
      dictionary,
      locale,
    });
  }
  notFound();
}
