import { historyEventAnchor, sortHistory, type TimeMachineData } from './time-machine.ts';

export function timeMachineSeo(data: TimeMachineData) {
  return {
    title: `Histoire de l'IA : chronologie ${data.fromYear}-${data.toYear}`,
    description: `${data.events.length} dates de l'intelligence artificielle, de ${data.fromYear} à ${data.toYear}. Travaux, modèles et lancements sourcés pour comprendre d'où vient l'IA d'aujourd'hui.`,
    path: '/time-machine',
    noindex: data.events.length === 0,
    ownImage: true,
  } as const;
}

/** Une collection historique, sans faux événements à réserver ni dates de publication inventées. */
export function timeMachineJsonLd(data: TimeMachineData, origin: string): Record<string, unknown> {
  const url = new URL('/time-machine', origin).toString();
  const meta = timeMachineSeo(data);
  const events = sortHistory(data.events);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': url + '#page',
        url,
        name: meta.title,
        description: meta.description,
        inLanguage: 'fr-FR',
        dateModified: data.reviewedAt,
        lastReviewed: data.reviewedAt,
        temporalCoverage: `${data.fromYear}/${data.toYear}`,
        isAccessibleForFree: true,
        publisher: {
          '@type': 'Organization',
          name: 'Sandbox',
          url: new URL('/', origin).toString(),
        },
        about: { '@type': 'Thing', name: "Histoire de l'intelligence artificielle" },
        mainEntity: { '@id': url + '#chronologie' },
        breadcrumb: { '@id': url + '#fil-ariane' },
      },
      {
        '@type': 'ItemList',
        '@id': url + '#chronologie',
        name: `Les grandes dates de l'IA, de ${data.fromYear} à ${data.toYear}`,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: events.length,
        itemListElement: events.map((event, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'CreativeWork',
            '@id': url + '#' + historyEventAnchor(event.id),
            url: url + '#' + historyEventAnchor(event.id),
            name: event.title,
            description: event.summary,
            temporalCoverage: event.date,
            citation: event.sources.map((source) => source.url),
            about: { '@type': 'Thing', name: event.organization },
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': url + '#fil-ariane',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Sandbox',
            item: new URL('/', origin).toString(),
          },
          { '@type': 'ListItem', position: 2, name: "Histoire de l'IA", item: url },
        ],
      },
    ],
  };
}
