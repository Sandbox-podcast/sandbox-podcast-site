import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchPage from '../src/components/search-screen';
import LocalizedPage from '../src/app/[locale]/[[...path]]/page';
import { LocalizationProvider } from '../src/components/localization';
import { loadCurrentChartSearchHits } from '../src/lib/chart-search';
import { preparePublicEditorialContent } from '../src/lib/admin-persistence';
import { editableContentSchema } from '../src/domain/admin-content';
import { episodeSchema } from '../src/domain/schema';
import { loadContent, setEditorialOverride } from '../src/lib/load';
import * as repository from '../src/lib/repository';

vi.mock('../src/lib/chart-search', () => ({ loadCurrentChartSearchHits: vi.fn() }));
vi.mock('../src/lib/admin-persistence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/admin-persistence')>()),
  preparePublicEditorialContent: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(loadCurrentChartSearchHits).mockReset().mockResolvedValue([]);
  vi.mocked(preparePublicEditorialContent).mockReset().mockResolvedValue(undefined);
});

describe('recherche publique', () => {
  it('conserve une fiche publiée dont le slug est aussi utilisé par une autre fiche éditoriale', async () => {
    const example = loadContent().entities[0];
    expect(example).toBeDefined();
    if (!example) throw new Error('Une entité éditoriale est requise pour cette fixture.');
    const local = vi.spyOn(repository, 'allEntities').mockReturnValue([
      {
        ...example,
        slug: 'shared-identity',
        name: 'Shared editorial',
        kind: 'model',
      },
    ]);
    vi.mocked(loadCurrentChartSearchHits).mockResolvedValue([
      {
        slug: 'shared-identity',
        name: 'Shared ranking',
        description: null,
        detail: 'GitHub · #1',
        href: '/charts/project/shared-identity',
        rank: 1,
        terms: ['Shared'],
      },
    ]);
    try {
      const page = await SearchPage({
        searchParams: Promise.resolve({ q: 'Shared', type: 'entities' }),
      });
      const html = renderToStaticMarkup(page);
      expect(html).toContain('href="/models/shared-identity"');
      expect(html).toContain('href="/charts/project/shared-identity"');
    } finally {
      local.mockRestore();
    }
  });
  it.each(['OpenCreator', 'workspace', 'krillinai/OpenCreator', 'krillinai-opencreator-904490600'])(
    'retrouve une publication par nom, description ou identifiant : %s',
    async (query) => {
      vi.mocked(loadCurrentChartSearchHits).mockResolvedValue([
        {
          slug: 'krillinai-opencreator-904490600',
          name: 'OpenCreator',
          description: 'AI workspace',
          detail: 'GitHub · #1 · krillinai',
          href: '/charts/project/krillinai-opencreator-904490600',
          rank: 1,
          terms: [
            'OpenCreator',
            'AI workspace',
            'krillinai/OpenCreator',
            'krillinai-opencreator-904490600',
          ],
        },
      ]);
      const page = await SearchPage({
        searchParams: Promise.resolve({ q: query, type: 'entities' }),
      });
      const html = renderToStaticMarkup(
        createElement(LocalizationProvider, { locale: 'en', dictionary: {}, children: page }),
      );
      expect(html).toContain('href="/en/charts/project/krillinai-opencreator-904490600"');
      expect(html).toContain('OpenCreator');
      expect(preparePublicEditorialContent).toHaveBeenCalled();
    },
  );

  it('garde la recherche éditoriale disponible même si le chargement publié échoue', async () => {
    const base = loadContent();
    const episode = episodeSchema.parse({
      number: 99,
      title: 'Épisode éditorial disponible pendant une panne',
      dek: 'Les ressources du podcast restent disponibles.',
      description: 'Présentation des ressources du podcast.',
      publishedAt: '2026-10-18T00:00:00Z',
      durationSec: 600,
      hosts: ['lou'],
      topics: [],
      platforms: { youtubeId: 'GgSiPkADCz4' },
      cover: { tone: 0, kicker: 'Sandbox' },
    });
    setEditorialOverride(
      editableContentSchema.parse({
        site: base.site,
        topics: base.topics,
        sources: base.sources,
        scoring: base.scoring,
        charts: base.charts,
        entities: base.entities,
        takes: base.takes,
        stories: base.stories,
        hosts: base.hosts.map((host) => ({ ...host, placeholder: false })),
        episodes: [episode],
      }),
    );
    vi.mocked(preparePublicEditorialContent).mockRejectedValueOnce(new Error('Database offline'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const page = await SearchPage({
        searchParams: Promise.resolve({ q: episode.title, type: 'episodes' }),
      });
      const html = renderToStaticMarkup(page);
      expect(html).toContain(`href="/episodes/${episode.number}"`);
      expect(log).toHaveBeenCalledWith('Search editorial content unavailable:', 'Error');
    } finally {
      log.mockRestore();
      setEditorialOverride(undefined);
    }
  });

  it('évite la lecture du classement quand la recherche est vide', async () => {
    await SearchPage({ searchParams: Promise.resolve({ q: '   ' }) });
    expect(loadCurrentChartSearchHits).not.toHaveBeenCalled();
  });

  it('laisse la recherche localisée gérer la panne éditoriale avant de rendre ses résultats', async () => {
    vi.mocked(preparePublicEditorialContent).mockRejectedValue(new Error('Database offline'));
    const page = await LocalizedPage({
      params: Promise.resolve({ locale: 'en', path: ['search'] }),
      searchParams: Promise.resolve({ q: 'OpenCreator' }),
    });
    expect(page).toBeTruthy();
    expect(preparePublicEditorialContent).not.toHaveBeenCalled();
  });
});
