import { describe, expect, it } from 'vitest';
import { episodeResourcePath, matchesSearch, normalizeSearch } from '../src/domain/discovery.ts';
import { isNavigationActive } from '../src/domain/site-navigation.ts';

describe('exploration de la bibliothèque', () => {
  it('recherche sans tenir compte des accents, majuscules ou espaces autour du mot', () => {
    expect(normalizeSearch('  ÉTUDE  ')).toBe('etude');
    expect(matchesSearch('etude', ['Étude de cas', undefined])).toBe(true);
  });
  it('relie une ressource à son ancre dans la fiche', () => {
    expect(episodeResourcePath(42, 0)).toBe('/episodes/42#resource-0');
    expect(episodeResourcePath(42, 26)).toBe('/episodes/42#resource-26');
  });
});

describe('repères de navigation', () => {
  it('garde la rubrique Podcast active dans le catalogue et les épisodes', () => {
    for (const path of ['/podcast', '/episodes/42'])
      expect(isNavigationActive(path, '/podcast')).toBe(true);
    expect(isNavigationActive('/podcast-other', '/podcast')).toBe(false);
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
  it('garde la rubrique Actualité active sur le fil', () => {
    expect(isNavigationActive('/news', '/news')).toBe(true);
    expect(isNavigationActive('/about', '/news')).toBe(false);
  });
});
