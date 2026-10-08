import { describe, expect, it } from 'vitest';
import {
  chartIdForSlug,
  hasIndexableChartArchive,
  hasIndexableChartCollection,
  hasIndexableChartContent,
  publishedChartSitemapPaths,
} from '../src/domain/chart-seo.ts';
import type { ChartsData } from '../src/domain/sandbox-charts.ts';
import { snapshotSchema } from '../src/domain/schema.ts';

function liveData(): ChartsData {
  return {
    mode: 'live',
    week: '2026-W41',
    weeks: ['2026-W41'],
    entities: [],
    series: [
      {
        id: 'github',
        slug: 'github',
        primary: 'momentum',
        dimensions: [],
        metrics: [],
        editions: [],
        snapshots: [
          snapshotSchema.parse({
            chart: 'github',
            week: '2026-W41',
            publishedAt: '2026-10-05T03:00:00Z',
            retrievedAt: '2026-10-05T02:00:00Z',
            provenance: 'auto',
            entries: [
              { entity: 'sample-project', rank: 1, score: 100, dimensions: {}, metrics: {} },
            ],
          }),
        ],
      },
    ],
    takes: [],
    episodes: [],
    newsletterUrl: null,
  };
}

describe('SEO des classements publiés', () => {
  it('indexe uniquement une édition réelle avec des entrées', () => {
    const data = liveData();

    expect(hasIndexableChartContent(data, 'github')).toBe(true);
    expect(hasIndexableChartContent(data, 'github', '2026-W41')).toBe(true);
    expect(hasIndexableChartContent(data, 'github', '2026-W40')).toBe(false);
    expect(hasIndexableChartContent(data, 'rising')).toBe(false);
    expect(hasIndexableChartContent({ ...data, mode: 'pending' }, 'github')).toBe(false);
    expect(hasIndexableChartContent({ ...data, mode: 'fixtures' }, 'github')).toBe(false);
  });

  it('n’indexe pas une collection vide', () => {
    expect(hasIndexableChartCollection(liveData())).toBe(true);
    expect(hasIndexableChartCollection({ ...liveData(), mode: 'pending', weeks: [] })).toBe(false);
  });

  it('indexe une archive uniquement si la semaine est publiée en mode réel', () => {
    const data = liveData();

    expect(hasIndexableChartArchive(data, '2026-W41')).toBe(true);
    expect(hasIndexableChartArchive(data, '2026-W40')).toBe(false);
    expect(hasIndexableChartArchive({ ...data, mode: 'unavailable' }, '2026-W41')).toBe(false);
  });

  it('associe les routes chart aux identifiants de données réels', () => {
    expect(chartIdForSlug('github')).toBe('github');
    expect(chartIdForSlug('open-source-ai')).toBe('models');
    expect(chartIdForSlug('unknown')).toBeUndefined();
  });

  it('ne propose au sitemap que les éditions, archives et projets réellement publiés', () => {
    const paths = publishedChartSitemapPaths(
      [
        { chart: 'github', week: '2026-W41', entries: 20 },
        { chart: 'github', week: '2026-W40', entries: 0 },
        { chart: 'rising', week: '2026-W41', entries: 8 },
        { chart: 'rising', week: '2026-W42', entries: 0 },
        { chart: 'github', week: 'invalid', entries: 20 },
      ],
      ['owner-project-42', 'owner-project-42', 'invalid/slug'],
    );

    expect(paths).toEqual(
      expect.arrayContaining([
        '/charts',
        '/charts/history',
        '/charts/history/2026-W41',
        '/charts/github',
        '/charts/github/methodology',
        '/charts/github/2026-W41',
        '/charts/project/owner-project-42',
        '/charts/rising',
        '/charts/rising/methodology',
        '/charts/rising/2026-W41',
      ]),
    );
    expect(paths).not.toContain('/charts/github/2026-W40');
    expect(paths).not.toContain('/charts/rising/2026-W42');
    expect(paths).not.toContain('/charts/project/invalid/slug');
  });

  it('ne donne que les pages de méthode au sitemap avant la première édition', () => {
    expect(publishedChartSitemapPaths([], [])).toEqual([
      '/charts/github/methodology',
      '/charts/rising/methodology',
    ]);
  });
});
