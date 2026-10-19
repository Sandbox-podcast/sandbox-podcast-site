import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminChartsEdition } from '../src/components/admin-charts-edition.tsx';
import { ChartsExperience } from '../src/components/charts-experience.tsx';
import { chartEditionSchema } from '../src/domain/schema.ts';

function render(draft: boolean, publish: boolean) {
  return renderToStaticMarkup(
    createElement(AdminChartsEdition, {
      edition: {
        id: 'edition',
        week: '2026-W41',
        chart: 'github',
        published: true,
        etag: null,
        entries: [
          {
            entity: 'project',
            name: '<script>alert(1)</script>',
            description: 'Un projet',
            category: 'Coding',
            rank: 7,
            score: 82,
            dimensions: {},
            metrics: { stars7d: -10 },
          },
        ],
        editorial: chartEditionSchema.parse({ week: '2026-W41' }),
      },
      repositories: [],
      author: 'Lou',
      pending: false,
      permissions: { draft, publish },
      onSave: async () => true,
    }),
  );
}
describe('édition dans le backoffice', () => {
  it('présente les scores en lecture seule et échappe les noms externes', () => {
    const html = render(true, true);
    expect(html).toContain('82.0 / 100');
    expect(html).toContain('WHAT IT IS');
    expect(html).toContain('SANDBOX TAKE');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toMatch(/<input[^>]+value="82"/);
  });
  it('un lecteur ne reçoit aucun champ éditorial actif', () => {
    const html = render(false, false);
    for (const input of html.matchAll(/<(?:input|textarea|select)\b[^>]*>/g))
      expect(input[0]).toContain('disabled');
  });
});

describe('attente de publication des classements', () => {
  it('affiche quatorze jours pour Rising quand GitHub en demande sept', () => {
    for (const [chart, required] of [
      ['rising', 14],
      ['github', 7],
    ] as const) {
      const html = renderToStaticMarkup(
        createElement(ChartsExperience, {
          initialChart: chart,
          data: {
            mode: 'live',
            week: '2026-10-19',
            weeks: ['2026-10-19'],
            entities: [],
            series: [],
            takes: [],
            episodes: [],
            newsletterUrl: null,
            progress: {
              databaseReady: true,
              trackedRepositories: 1350,
              snapshotsToday: 20,
              distinctSnapshotDays: 9,
              requiredHistoryDays: 7,
              lastSuccessfulCollectAt: null,
              earliestPossibleEditionWeek: null,
            },
          },
        }),
      ).replace(/<[^>]+>/gu, '');
      expect(html).toContain(`Historique : 9 / ${required} jours`);
      if (chart === 'rising') expect(html).toContain('Rising attend au moins 20 projets éligibles');
    }
  });
});
