import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SearchPage from '../src/app/(fr)/search/page';
import EpisodePage from '../src/app/(fr)/episodes/[number]/page';
import { allEpisodes } from '../src/lib/repository';
import { episodeResourcePath } from '../src/domain/discovery';

describe('recherche publique', () => {
  it('garde un champ modifiable et un filtre de catégorie adressable', async () => {
    const html = renderToStaticMarkup(
      await SearchPage({ searchParams: Promise.resolve({ q: 'Claude', type: 'resources' }) }),
    );
    expect(html).toContain('Sources et ressources');
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

describe('parcours de la fiche podcast', () => {
  it('rend les ancres des ressources et un sommaire utilisable sans vidéo', async () => {
    const episode = allEpisodes()[0];
    if (!episode) throw new Error('Épisode de fixture absent');
    const page = await EpisodePage({ params: Promise.resolve({ number: String(episode.number) }) });
    const html = renderToStaticMarkup(createElement('div', null, page));
    expect(html).toContain('href="#chapters"');
    expect(html).toContain('href="#mentions"');
    expect(html).toContain('id="episode-video"');
    for (let index = 0; index < episode.mentions.length + episode.sources.length; index++) {
      const anchor = episodeResourcePath(episode.number, index).split('#')[1];
      expect(html).toContain(`id="${anchor}"`);
    }
    expect(html).not.toContain('<iframe');
    expect(html).toContain('pas encore disponible');
  });
});
