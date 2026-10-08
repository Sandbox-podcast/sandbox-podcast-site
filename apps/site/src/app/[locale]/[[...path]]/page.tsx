import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  EnglishHomePage,
  LocalizedRankingHub,
  LocalizedRankingPage,
  LocalizedSiteContentPage,
} from '@/components/localized-pages';
import { localeRouteSegment, localeTagFromRouteSegment } from '@/i18n/locales';
import { isLocaleUiReviewed } from '@/i18n/messages';
import { hasRankingUiTranslation, rankingMessages } from '@/i18n/ranking-messages';
import { pageMetadata } from '@/lib/seo';
import {
  publicLocalizedSitePageByPath,
  publicRankingCollectionPageByPath,
  publicRankingCollectionPages,
  publicRankingCollectionPagesFor,
  publicRankingEntries,
} from '@/lib/localized-content';

export const revalidate = 3600;

type RouteParams = Promise<{ locale: string; path?: string[] }>;

function routePath(routeLocale: string, path?: string[]): string {
  return `/${routeLocale}${path?.length ? `/${path.join('/')}` : ''}`;
}

async function rankingPageForRoute(routeLocale: string, path: string) {
  const page = await publicRankingCollectionPageByPath(path);
  if (!page || localeRouteSegment(page.localization.locale) !== routeLocale.toLowerCase())
    return null;
  return page;
}

async function sitePageForRoute(routeLocale: string, path: string) {
  const page = await publicLocalizedSitePageByPath(path);
  if (!page || localeRouteSegment(page.localization.locale) !== routeLocale.toLowerCase())
    return null;
  return page;
}

async function rankingHubPages(routeLocale: string) {
  return (await publicRankingCollectionPages()).filter(
    (page) => localeRouteSegment(page.localization.locale) === routeLocale.toLowerCase(),
  );
}

async function rankingHubAlternates(routeLocale: string) {
  const allPages = await publicRankingCollectionPages();
  const pagesByLocale = new Map<string, typeof allPages>();
  for (const page of allPages) {
    const prefix = localeRouteSegment(page.localization.locale);
    if (!prefix) continue;
    const localizedPages = pagesByLocale.get(prefix) ?? [];
    localizedPages.push(page);
    pagesByLocale.set(prefix, localizedPages);
  }
  const currentPages = pagesByLocale.get(routeLocale.toLowerCase()) ?? [];
  const signature = (pages: typeof allPages) =>
    [...new Set(pages.map((page) => page.collection.key))].sort().join('|');
  if (!currentPages.length) return [];
  return [...pagesByLocale.entries()]
    .filter(([, pages]) => signature(pages) === signature(currentPages))
    .map(([prefix, pages]) => ({
      locale: pages[0]?.localization.locale ?? prefix,
      path: `/${prefix}/charts`,
      indexable: isLocaleUiReviewed(pages[0]?.localization.locale ?? prefix),
    }));
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { locale: routeLocale, path } = await params;
  const locale = localeTagFromRouteSegment(routeLocale);
  if (!locale) return {};
  const pathName = routePath(routeLocale, path);
  const rankingPage = await rankingPageForRoute(routeLocale, pathName);
  if (rankingPage) {
    const translations = await publicRankingCollectionPagesFor(rankingPage.collection.key);
    return pageMetadata({
      title: rankingPage.localization.metaTitle,
      description: rankingPage.localization.metaDescription,
      path: rankingPage.localization.path,
      locale: rankingPage.localization.locale,
      modifiedTime: rankingPage.publishedAt,
      noindex: !isLocaleUiReviewed(rankingPage.localization.locale),
      localizedAlternates: translations.map((page) => ({
        locale: page.localization.locale,
        path: page.localization.path,
        indexable: isLocaleUiReviewed(page.localization.locale),
      })),
    });
  }

  const sitePage = await sitePageForRoute(routeLocale, pathName);
  if (sitePage) {
    const localization = sitePage.localization;
    return pageMetadata({
      title: localization.metaTitle,
      description: localization.metaDescription,
      path: localization.path,
      locale: localization.locale,
      ...(localization.publishedAt ? { modifiedTime: localization.publishedAt } : {}),
      noindex: !isLocaleUiReviewed(localization.locale),
      localizedAlternates: sitePage.alternates.map((alternate) => ({
        ...alternate,
        indexable: isLocaleUiReviewed(alternate.locale),
      })),
    });
  }

  if (!path?.length && routeLocale.toLowerCase() === 'en') {
    return pageMetadata({
      title: 'AI rankings and video podcasts',
      description:
        'Discover AI with video podcasts and transparent rankings built from dated data, sources and published methods.',
      path: '/en',
      locale,
      noindex: true,
      ownImage: true,
    });
  }

  if (path?.length === 1 && path[0] === 'charts') {
    const pages = await rankingHubPages(routeLocale);
    if (pages.length || hasRankingUiTranslation(locale)) {
      const alternates = await rankingHubAlternates(routeLocale);
      const copy = rankingMessages(locale);
      return pageMetadata({
        title: copy.hubTitle,
        description: copy.hubDescription,
        path: pathName,
        locale,
        noindex: pages.length === 0 || !isLocaleUiReviewed(locale),
        localizedAlternates: alternates,
      });
    }
  }

  return pageMetadata({
    title: 'Page not found',
    description: 'This page is not available in this language.',
    path: pathName,
    locale,
    noindex: true,
  });
}

export default async function LocalizedPage({ params }: { params: RouteParams }) {
  const { locale: routeLocale, path } = await params;
  const locale = localeTagFromRouteSegment(routeLocale);
  if (!locale) notFound();
  const pathName = routePath(routeLocale, path);
  const rankingPage = await rankingPageForRoute(routeLocale, pathName);
  if (rankingPage) {
    const [entries, translations] = await Promise.all([
      publicRankingEntries(
        rankingPage.collection.key,
        rankingPage.editionId,
        rankingPage.localization.locale,
      ),
      publicRankingCollectionPagesFor(rankingPage.collection.key),
    ]);
    if (!entries.length) notFound();
    return (
      <LocalizedRankingPage
        page={rankingPage}
        entries={entries}
        alternates={translations.map((translation) => ({
          locale: translation.localization.locale,
          path: translation.localization.path,
          indexable: isLocaleUiReviewed(translation.localization.locale),
        }))}
      />
    );
  }

  const sitePage = await sitePageForRoute(routeLocale, pathName);
  if (sitePage) return <LocalizedSiteContentPage page={sitePage.localization} />;

  if (!path?.length && routeLocale.toLowerCase() === 'en') return <EnglishHomePage />;
  if (path?.length === 1 && path[0] === 'charts') {
    const pages = await rankingHubPages(routeLocale);
    if (pages.length || hasRankingUiTranslation(locale)) {
      return <LocalizedRankingHub pages={pages} locale={locale} />;
    }
  }
  notFound();
}
