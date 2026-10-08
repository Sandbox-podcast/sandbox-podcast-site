import { describe, expect, it } from 'vitest';
import {
  discoverEpisodes,
  episodeResourcePath,
  matchesSearch,
  normalizeSearch,
} from '../src/domain/discovery.ts';
import { isNavigationActive } from '../src/domain/site-navigation.ts';

const entries = [
  {
    number: 3,
    publishedAt: '2026-10-06',
    durationSec: 3600,
    topics: ['agents'],
    searchable: ['Les agents', 'Étude de cas'],
  },
  {
    number: 2,
    publishedAt: '2026-09-29',
    durationSec: 1800,
    topics: ['models'],
    searchable: ['Modèles ouverts', 'llama.cpp'],
  },
  {
    number: 1,
    publishedAt: '2026-09-22',
    durationSec: 2400,
    topics: ['agents', 'coding'],
    searchable: ['Coder avec un agent', 'Documentation'],
  },
];

describe('exploration de la bibliothèque', () => {
  it('recherche sans tenir compte des accents, majuscules ou espaces autour du mot', () => {
    expect(normalizeSearch('  ÉTUDE  ')).toBe('etude');
    expect(matchesSearch('etude', ['Étude de cas', undefined])).toBe(true);
    expect(discoverEpisodes(entries, { query: ' MODELES ' }).map((entry) => entry.number)).toEqual([
      2,
    ]);
    expect(discoverEpisodes(entries, { query: 'llama.cpp' }).map((entry) => entry.number)).toEqual([
      2,
    ]);
  });
  it('combine un mot avec le thème choisi et conserve un état vide', () => {
    expect(
      discoverEpisodes(entries, { topic: 'agents', query: 'coder' }).map((entry) => entry.number),
    ).toEqual([1]);
    expect(discoverEpisodes(entries, { topic: 'agents', query: 'llama' })).toEqual([]);
    expect(discoverEpisodes([], {})).toEqual([]);
  });
  it('trie les résultats par date ou durée sans modifier les données partagées', () => {
    const original = entries.map((entry) => entry.number);
    expect(discoverEpisodes(entries, { sort: 'newest' }).map((entry) => entry.number)).toEqual([
      3, 2, 1,
    ]);
    expect(discoverEpisodes(entries, { sort: 'oldest' }).map((entry) => entry.number)).toEqual([
      1, 2, 3,
    ]);
    expect(discoverEpisodes(entries, { sort: 'shortest' }).map((entry) => entry.number)).toEqual([
      2, 1, 3,
    ]);
    expect(entries.map((entry) => entry.number)).toEqual(original);
  });
  it('relie une ressource à son ancre dans la fiche', () => {
    expect(episodeResourcePath(42, 0)).toBe('/episodes/42#resource-0');
    expect(episodeResourcePath(42, 26)).toBe('/episodes/42#resource-26');
  });
});

describe('repères de navigation', () => {
  it('garde la rubrique Podcast active dans les épisodes et les thèmes', () => {
    for (const path of ['/episodes', '/episodes/42', '/topics', '/topics/agents'])
      expect(isNavigationActive(path, '/episodes')).toBe(true);
    expect(isNavigationActive('/episodes-other', '/episodes')).toBe(false);
  });
  it('garde la rubrique Classements active dans les fiches et les mouvements', () => {
    for (const path of [
      '/charts',
      '/charts/history/2026-W41',
      '/projects/claude-code',
      '/models/gemini',
      '/moves/github/2026-W41/projet',
    ])
      expect(isNavigationActive(path, '/charts')).toBe(true);
    expect(isNavigationActive('/about', '/charts')).toBe(false);
    expect(isNavigationActive('/charts-other', '/charts')).toBe(false);
  });
});
