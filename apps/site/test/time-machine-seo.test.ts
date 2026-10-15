import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import Page, { metadata } from '../src/app/(fr)/time-machine/page.tsx';
import { historyEventAnchor } from '../src/domain/time-machine.ts';
import { timeMachineJsonLd, timeMachineSeo } from '../src/domain/time-machine-seo.ts';
import { timeMachineData } from '../src/lib/time-machine.ts';
import { pageMetadata } from '../src/lib/seo.ts';
import { JsonLd } from '../src/components/json-ld.tsx';

const graphSchema = z.object({
  '@context': z.literal('https://schema.org'),
  '@graph': z.array(z.object({ '@type': z.string() }).loose()),
});
const listSchema = z.object({
  numberOfItems: z.number(),
  itemListElement: z.array(
    z.object({
      position: z.number(),
      item: z
        .object({
          '@type': z.literal('CreativeWork'),
          '@id': z.url(),
          url: z.url(),
          name: z.string(),
          temporalCoverage: z.string(),
          citation: z.array(z.url()).min(1),
        })
        .loose(),
    }),
  ),
});

describe('SEO de la chronologie mondiale', () => {
  it('autorise le corpus vérifié et conserve une URL canonique unique sans fausses traductions', () => {
    const data = timeMachineData();
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.alternates).toEqual({ canonical: '/time-machine' });
    expect(metadata.title).toContain("Histoire de l'IA");
    expect(metadata.description).toContain(String(data.events.length));
    expect(metadata.description).toContain('intelligence artificielle');
    expect(timeMachineSeo(data).ownImage).toBe(true);
    expect(pageMetadata(timeMachineSeo({ ...data, events: [] })).robots).toMatchObject({
      index: false,
    });
  });

  it('livre tous les événements dans le HTML initial, avec ancres uniques et sources lisibles sans JavaScript', () => {
    const data = timeMachineData();
    const html = renderToStaticMarkup(createElement(Page));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('Histoire de l&#x27;intelligence artificielle');
    expect(html.match(/<article\b/g)).toHaveLength(data.events.length);
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
    expect(html).not.toContain('Afficher les événements suivants');
    expect(html).toContain('Sources et méthode');
    for (const event of data.events) {
      expect(html.match(new RegExp('id="' + historyEventAnchor(event.id) + '"', 'g'))).toHaveLength(
        1,
      );
      expect(html).toContain(event.sources[0]?.url.replaceAll('&', '&amp;'));
    }
  });

  it('décrit exactement les événements visibles, leurs dates de précision réelle et leurs sources', () => {
    const data = timeMachineData();
    const graph = graphSchema.parse(timeMachineJsonLd(data, 'https://www.sandboxpodcast.fr'))[
      '@graph'
    ];
    const collection = graph.find((node) => node['@type'] === 'CollectionPage');
    expect(collection).toMatchObject({
      url: 'https://www.sandboxpodcast.fr/time-machine',
      dateModified: data.reviewedAt,
      lastReviewed: data.reviewedAt,
      temporalCoverage: '1996/2026',
      inLanguage: 'fr-FR',
    });
    const list = listSchema.parse(graph.find((node) => node['@type'] === 'ItemList'));
    expect(list.numberOfItems).toBe(data.events.length);
    expect(list.itemListElement).toHaveLength(data.events.length);
    list.itemListElement.forEach(({ item, position }, index) => {
      const event = data.events[index];
      if (!event) throw new Error('Événement absent');
      expect(position).toBe(index + 1);
      expect(item.url).toBe(
        'https://www.sandboxpodcast.fr/time-machine#' + historyEventAnchor(event.id),
      );
      expect(item.temporalCoverage).toBe(event.date);
      expect(item.citation).toEqual(event.sources.map((source) => source.url));
      expect(item).not.toHaveProperty('datePublished');
    });
    expect(graph.map((node) => node['@type'])).toEqual([
      'CollectionPage',
      'ItemList',
      'BreadcrumbList',
    ]);
  });

  it('sérialise un JSON-LD valide et échappe un contenu contenant une fermeture de script', () => {
    const html = renderToStaticMarkup(createElement(Page));
    const raw = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
    if (!raw) throw new Error('JSON-LD absent du HTML');
    expect(graphSchema.safeParse(JSON.parse(raw)).success).toBe(true);
    const data = timeMachineData();
    const first = data.events[0];
    if (!first) throw new Error('Corpus vide');
    const unsafe = {
      ...data,
      events: [{ ...first, summary: '</script><script>alert(1)</script>' }],
    };
    const escaped = renderToStaticMarkup(
      createElement(JsonLd, {
        data: timeMachineJsonLd(unsafe, 'https://www.sandboxpodcast.fr'),
      }),
    );
    expect(escaped).not.toContain('</script><script>');
    expect(escaped).toContain('\\u003c/script>');
    expect(escaped.match(/<script\b/g)).toHaveLength(1);
  });
});
