import { newsSentence, newsSynopsis, type NewsItem } from './news-preview.ts';

/** Décrit la liste SANDBOX et ses liens externes, sans s'attribuer les articles des médias. */
export function newsCollectionLd(
  items: readonly NewsItem[],
  canonicalUrl: string,
  name: string,
  locale = 'fr-FR',
): Record<string, unknown> {
  const home = new URL(locale === 'fr-FR' ? '/' : `/${locale.toLowerCase()}`, canonicalUrl).href;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': canonicalUrl,
        url: canonicalUrl,
        name,
        inLanguage: locale,
        publisher: {
          '@type': 'Organization',
          name: 'Sandbox TalkShow',
          url: new URL('/', canonicalUrl).href,
        },
        breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: items.length,
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'CreativeWork',
              url: item.url,
              name: newsSentence(item, locale),
              abstract: newsSynopsis(item, locale).join(' '),
              datePublished: item.publishedAt,
              publisher: {
                '@type': 'Organization',
                name: item.project,
                url: new URL('/', item.url).href,
              },
            },
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: locale === 'fr-FR' ? 'Accueil' : 'Sandbox',
            item: home,
          },
          { '@type': 'ListItem', position: 2, name, item: canonicalUrl },
        ],
      },
    ],
  };
}
