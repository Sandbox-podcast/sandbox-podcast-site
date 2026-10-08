import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LocalizedRankingPage } from '@/components/localized-pages';
import { isLocaleUiReviewed } from '@/i18n/messages';
import { pageMetadata } from '@/lib/seo';
import {
  publicRankingCollectionPageByPath,
  publicRankingCollectionPagesFor,
  publicRankingEntries,
} from '@/lib/localized-content';
export async function rankingCatalogMetadata(path: string): Promise<Metadata> {
  const page = await publicRankingCollectionPageByPath(path);
  if (!page) {
    return pageMetadata({
      title: 'Classement à venir',
      description:
        'Ce classement sera accessible lorsque les données et sa traduction auront été publiées.',
      path,
      locale: 'fr-FR',
      noindex: true,
    });
  }
  const translations = await publicRankingCollectionPagesFor(page.collection.key);
  return pageMetadata({
    title: page.localization.metaTitle,
    description: page.localization.metaDescription,
    path: page.localization.path,
    locale: page.localization.locale,
    modifiedTime: page.publishedAt,
    noindex: !isLocaleUiReviewed(page.localization.locale),
    localizedAlternates: translations.map((translation) => ({
      locale: translation.localization.locale,
      path: translation.localization.path,
      indexable: isLocaleUiReviewed(translation.localization.locale),
    })),
  });
}
export async function RankingCatalogRoute({ path }: { path: string }) {
  const page = await publicRankingCollectionPageByPath(path);
  if (!page) notFound();
  const [entries, translations] = await Promise.all([
    publicRankingEntries(page.collection.key, page.editionId, page.localization.locale),
    publicRankingCollectionPagesFor(page.collection.key),
  ]);
  if (!entries.length) notFound();
  return (
    <LocalizedRankingPage
      page={page}
      entries={entries}
      alternates={translations.map((translation) => ({
        locale: translation.localization.locale,
        path: translation.localization.path,
        indexable: isLocaleUiReviewed(translation.localization.locale),
      }))}
    />
  );
}
