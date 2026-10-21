import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NewsScreen } from '../src/components/news-screen';
import type { NewsFeed } from '../src/domain/news-preview';

const feed: NewsFeed = {
  checkedAt: '2026-10-20T02:03:02.931Z',
  lastPublishedAt: '2026-10-20T02:18:07.000Z',
  sources: [],
  items: [],
};

describe('dates de mise à jour du fil News', () => {
  it.each([
    [
      'fr-FR',
      'Dernière mise à jour',
      'Dernière publication sur le site',
      'Dernière collecte des sources',
    ],
    ['en', 'Last update', 'Last publication on the site', 'Last source collection'],
    [
      'es-ES',
      'Última actualización',
      'Última publicación en el sitio',
      'Última recopilación de fuentes',
    ],
    [
      'de-DE',
      'Letzte Aktualisierung',
      'Letzte Veröffentlichung auf der Website',
      'Letzter Quellenabruf',
    ],
  ])(
    'sépare publication et collecte en %s avec leur date machine et le fuseau',
    (locale, title, published, collected) => {
      const html = renderToStaticMarkup(createElement(NewsScreen, { initialFeed: feed, locale }));
      expect(html).toContain(title);
      expect(html).toContain(published);
      expect(html).toContain(collected);
      expect(html).toContain('dateTime="2026-10-20T02:03:02.931Z"');
      expect(html).toContain('dateTime="2026-10-20T02:18:07.000Z"');
      expect(html.match(/Europe\/Paris/g)).toHaveLength(2);
      expect(html).toContain('04:03');
      expect(html).toContain('04:18');
    },
  );

  it('ne remplace aucune date absente par l’heure du rendu ou la date d’un article', () => {
    const html = renderToStaticMarkup(
      createElement(NewsScreen, {
        initialFeed: { checkedAt: null, sources: [], items: [] },
      }),
    );
    expect(html).toContain('Date non disponible');
    expect(html).toContain('Aucune collecte enregistrée');
    expect(html).not.toContain('<time');
  });
});

describe('brèves françaises avant traduction', () => {
  it.each([1, 2, 3])('affiche les %i phrases disponibles et attend la bonne langue', (count) => {
    const sentences = [
      'Le modèle est publié.',
      'Les poids sont accessibles.',
      'La licence est ouverte.',
    ].slice(0, count);
    const initialFeed: NewsFeed = {
      ...feed,
      items: [
        {
          id: 'rundown:/articles/brief',
          project: 'The Rundown AI',
          repository: 'therundown.ai',
          version: 'article',
          url: 'https://www.therundown.ai/articles/brief',
          publishedAt: '2026-10-21T08:00:00Z',
          category: 'models',
          prerelease: false,
          kind: 'article',
          titles: { 'fr-FR': 'Un modèle accessible' },
          synopses: { 'fr-FR': sentences },
        },
      ],
    };
    const french = renderToStaticMarkup(
      createElement(NewsScreen, { initialFeed, locale: 'fr-FR' }),
    );
    for (const sentence of sentences) expect(french).toContain(sentence);
    const english = renderToStaticMarkup(createElement(NewsScreen, { initialFeed, locale: 'en' }));
    expect(english).not.toContain('Un modèle accessible');
  });
});

describe('absence de répétition entre le titre et le résumé', () => {
  it.each(['fr-FR', 'en', 'es-ES', 'de-DE'])(
    'retire la reprise du titre en %s tout en conservant les autres faits',
    (locale) => {
      const title = 'Un modèle est accessible';
      const item: NewsFeed['items'][number] = {
        id: 'rundown:/articles/distinct',
        project: 'The Rundown AI',
        repository: 'therundown.ai',
        version: 'article',
        url: 'https://www.therundown.ai/articles/distinct',
        publishedAt: '2026-10-21T08:00:00Z',
        category: 'models',
        prerelease: false,
        kind: 'article',
        titles: { 'fr-FR': title, [locale]: title },
        synopses: {
          'fr-FR': [title + '.', 'Les poids sont publiés.'],
          [locale]: [title + '.', 'Les poids sont publiés.'],
        },
      };
      const html = renderToStaticMarkup(
        createElement(NewsScreen, { initialFeed: { ...feed, items: [item] }, locale }),
      );
      const visible = html.replace(/<script[\s\S]*?<\/script>/gu, '');
      expect(visible.split(title)).toHaveLength(2);
      expect(visible).toContain('Les poids sont publiés.');
      item.synopses = { 'fr-FR': [title + '.'], [locale]: [title + '.'] };
      const brief = renderToStaticMarkup(
        createElement(NewsScreen, { initialFeed: { ...feed, items: [item] }, locale }),
      ).replace(/<script[\s\S]*?<\/script>/gu, '');
      expect(brief.split(title)).toHaveLength(2);
      expect(brief).toContain('https://www.therundown.ai/articles/distinct');
    },
  );
});
