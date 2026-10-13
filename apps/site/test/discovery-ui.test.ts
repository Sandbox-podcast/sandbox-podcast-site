import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SearchPage from '../src/app/(fr)/search/page';
import EpisodesPage from '../src/app/(fr)/episodes/page';
import { allEpisodes } from '../src/lib/repository';

describe('recherche publique', () => {
  it('garde un champ modifiable et un filtre de catégorie adressable', async () => {
    const html = renderToStaticMarkup(
      await SearchPage({ searchParams: Promise.resolve({ q: 'Claude', type: 'resources' }) }),
    );
    expect(html).toContain('Ressources');
    expect(html).not.toContain('id="search-episodes"');
    expect(html).toContain('name="q"');
    expect(html).toContain('name="type" value="resources"');
    expect(html).not.toMatch(/<input[^>]+readOnly/);
    expect(html).toContain('aria-current="page"');
  });
  it('propose une reprise quand aucune correspondance ne subsiste', async () => {
    const html = renderToStaticMarkup(
      await SearchPage({
        searchParams: Promise.resolve({ q: 'zzzzzzz-aucun-resultat', type: 'invalid' }),
      }),
    );
    expect(html).toContain('Aucun résultat');
    expect(html).toContain('Nouvelle recherche');
    expect(html).toContain('href="/episodes"');
  });
  it('échappe une requête reçue depuis une URL', async () => {
    const html = renderToStaticMarkup(
      await SearchPage({ searchParams: Promise.resolve({ q: '<script>alert(1)</script>' }) }),
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});

describe('parcours de la bibliothèque podcast', () => {
  it('n’expose aucun épisode de démonstration', () => {
    expect(allEpisodes()).toEqual([]);
  });

  it('rend la bibliothèque vide sans lecteur vidéo de démo', async () => {
    const page = await EpisodesPage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(createElement('div', null, page));
    expect(html).toContain('Tous les podcasts');
    expect(html).not.toContain('EP. 40');
    expect(html).not.toContain('EP. 41');
    expect(html).not.toContain('EP. 42');
    expect(html).not.toContain('<iframe');
  });
});
