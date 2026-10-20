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
