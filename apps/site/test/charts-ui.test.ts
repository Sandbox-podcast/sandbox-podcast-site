import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminChartsEdition } from '../src/components/admin-charts-edition.tsx';
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
