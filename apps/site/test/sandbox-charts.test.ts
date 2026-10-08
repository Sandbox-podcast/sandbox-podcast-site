import { describe, expect, it } from 'vitest';
import {
  chartRows,
  chartsRecords,
  hasChartEdition,
  marketSignals,
  matchesChartFilter,
  type ChartsData,
} from '../src/domain/sandbox-charts.ts';
import { chartEditionSchema, snapshotSchema } from '../src/domain/schema.ts';
import {
  editionMarkdown,
  editionsFromMarkdown,
  updateEditionMarkdown,
} from '../src/domain/chart-edition.ts';
import { chartShareSvg, SHARE_FORMATS } from '../src/domain/chart-share.ts';
import { chartSelectionSchema } from '../src/domain/chart-selection.ts';

function dataset(): ChartsData {
  return {
    mode: 'live',
    week: '2026-W41',
    weeks: ['2026-W41', '2026-W40', '2026-W39'],
    entities: ['a', 'b', 'c'].map((slug) => ({
      slug,
      kind: 'project',
      name: slug,
      tagline: slug,
      description: slug,
      category: slug === 'a' ? 'Agents' : 'Coding',
      topics: [],
      links: [],
      href: `/charts/project/${slug}`,
    })),
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
            week: '2026-W39',
            publishedAt: '2026-09-21T03:00:00Z',
            retrievedAt: '2026-09-21T02:00:00Z',
            provenance: 'auto',
            entries: [
              { entity: 'b', rank: 1, score: 100, dimensions: {}, metrics: { stars7d: 100 } },
            ],
          }),
          snapshotSchema.parse({
            chart: 'github',
            week: '2026-W40',
            publishedAt: '2026-09-28T03:00:00Z',
            retrievedAt: '2026-09-28T02:00:00Z',
            provenance: 'auto',
            entries: [
              { entity: 'b', rank: 1, score: 95, dimensions: {}, metrics: { stars7d: 200 } },
              { entity: 'a', rank: 2, score: 70, dimensions: {}, metrics: { stars7d: 50 } },
            ],
          }),
          snapshotSchema.parse({
            chart: 'github',
            week: '2026-W41',
            publishedAt: '2026-10-05T03:00:00Z',
            retrievedAt: '2026-10-05T02:00:00Z',
            provenance: 'auto',
            entries: [
              { entity: 'a', rank: 1, score: 80, dimensions: {}, metrics: { stars7d: 100 } },
              { entity: 'b', rank: 2, score: 75, dimensions: {}, metrics: { stars7d: 80 } },
              { entity: 'c', rank: 3, score: 65, dimensions: {}, metrics: {} },
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
describe('présentation des charts', () => {
  it('une archive existe pour son chart et sa semaine, sans emprunter une édition d’un autre chart', () => {
    expect(hasChartEdition(dataset(), 'github', '2026-W41')).toBe(true);
    expect(hasChartEdition(dataset(), 'github', '2026-W42')).toBe(false);
    expect(hasChartEdition(dataset(), 'rising', '2026-W41')).toBe(false);
    expect(hasChartEdition({ ...dataset(), series: [] }, 'github', '2026-W41')).toBe(false);
  });
  it('les liens de partage conservent la période et la vue, avec des valeurs invalides ramenées aux défauts', () => {
    expect(chartSelectionSchema.parse({ period: 'month', view: 'coding' })).toEqual({
      period: 'month',
      view: 'coding',
    });
    expect(chartSelectionSchema.parse({ period: ['unsafe'], view: 'unknown' })).toEqual({
      period: 'week',
      view: undefined,
    });
  });
  it('un trou d’archive interrompt une série à la première place', () => {
    const data = dataset();
    const firstSeries = data.series[0];
    if (!firstSeries) throw new Error('Série fixture absente');
    const first = firstSeries.snapshots[0];
    if (!first) throw new Error('Fixture absente');
    firstSeries.snapshots = [first, { ...first, week: '2026-W41' }];
    expect(
      chartsRecords(data, 'github', '2026-W41').find(
        (record) => record.label === 'PLUS LONGUE SÉRIE À LA 1RE PLACE',
      )?.value,
    ).toBe('1 sem.');
  });
  it('calcule les mouvements et garde une mesure absente comme absente', () => {
    const rows = chartRows(dataset(), 'github', '2026-W41');
    expect(rows[0]?.movement.delta).toBe(1);
    expect(rows[1]?.movement.delta).toBe(-1);
    expect(rows[2]?.movement.kind).toBe('new');
    expect(rows[2]?.periodStars).toBeNull();
    expect(rows.find((row) => matchesChartFilter(row.entity, 'Coding'))?.rank).toBe(2);
  });
  it('THIS MONTH utilise le mois du lundi et compare au mois précédent', () => {
    const rows = chartRows(dataset(), 'github', '2026-W41', 'month');
    expect(rows[0]?.entity.slug).toBe('a');
    expect(rows[0]?.periodStars).toBe(100);
    expect(rows[1]?.score).toBe(50);
    expect(rows[0]?.movement.delta).toBe(1);
  });
  it('ne compare pas une semaine à une archive éloignée si l’édition précédente manque', () => {
    const data = dataset();
    const firstSeries = data.series[0];
    if (!firstSeries) throw new Error('Série fixture absente');
    firstSeries.snapshots.splice(1, 1);
    expect(chartRows(data, 'github', '2026-W41').every((row) => row.baseline)).toBe(true);
    expect(chartRows(data, 'github', '2026-W42')).toEqual([]);
  });
  it('ALL TIME récompense la présence et ne prétend pas avoir un mouvement comparable', () => {
    const rows = chartRows(dataset(), 'github', '2026-W41', 'all');
    expect(rows[0]?.entity.slug).toBe('b');
    expect(rows[0]?.periodStars).toBe(380);
    expect(rows.every((row) => row.baseline)).toBe(true);
  });
  it('un signal sectoriel n’attribue pas de croissance à une nouvelle entrée sans baseline', () => {
    const signals = marketSignals(dataset(), '2026-W41');
    expect(signals.find((signal) => signal.category === 'Agents')).toMatchObject({
      change: 100,
      stars: 100,
      candidates: 1,
    });
    expect(signals.find((signal) => signal.category === 'Coding')).toMatchObject({
      change: -60,
      stars: 80,
      candidates: 1,
    });
    expect(
      marketSignals({ ...dataset(), series: [] }, '2026-W41').every(
        (signal) => signal.stars === 0 && signal.change === null,
      ),
    ).toBe(true);
  });
});
describe('édition et exports', () => {
  it('le Markdown conserve les retours à la ligne, guillemets et usages contenant un séparateur', () => {
    const edition = chartEditionSchema.parse({
      week: '2026-W41',
      headline: 'La semaine',
      watchlist: [{ entity: 'a', reason: 'Une raison\n## Faux titre' }],
      insights: [
        {
          entity: 'a',
          whatItIs: 'Une ligne\nUne autre',
          sandboxTake: '"À suivre"',
          author: 'Lou',
          bestFor: ['Code | Data'],
        },
      ],
    });
    expect(editionsFromMarkdown(editionMarkdown(edition))).toEqual([edition]);
    const document = '# Charts\n\n## Entrées et avis\nContenu original\n';
    const once = updateEditionMarkdown(document, edition);
    expect(editionsFromMarkdown(updateEditionMarkdown(once, edition))).toEqual([edition]);
    expect(once).toContain('Contenu original');
  });
  it('refuse les doublons éditoriaux au lieu de masquer un commentaire', () => {
    expect(
      chartEditionSchema.safeParse({
        week: '2026-W41',
        watchlist: [
          { entity: 'a', reason: 'A' },
          { entity: 'a', reason: 'B' },
        ],
      }).success,
    ).toBe(false);
  });
  it('exporte les cinq formats en échappant les textes de l’éditeur', () => {
    for (const [format, size] of Object.entries(SHARE_FORMATS)) {
      const svg = chartShareSvg(
        {
          week: '2026-W41',
          title: 'GitHub',
          name: '<script>alert(1)</script>',
          rank: 1,
          movement: 'NEW',
          stat: '+100',
          growth: '',
          fixture: true,
        },
        format as keyof typeof SHARE_FORMATS,
      );
      expect(svg).toContain(`width="${size.width}" height="${size.height}"`);
      expect(svg).not.toContain('<script>');
      expect(svg).toContain('&lt;SCRIPT&gt;');
      expect(svg).toContain('FIXTURES');
    }
  });
});
