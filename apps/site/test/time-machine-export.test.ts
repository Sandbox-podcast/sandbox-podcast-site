import { describe, expect, it } from 'vitest';
import { buildHistoryWrapped } from '../src/domain/time-machine.ts';
import { timeMachineWrappedSvg } from '../src/domain/time-machine-export.ts';
import { timeMachineData } from '../src/lib/time-machine.ts';

describe('export du Wrapped historique', () => {
  it('exporte un SVG autonome avec les événements, leurs sources et la portée éditoriale', () => {
    const wrapped = buildHistoryWrapped(timeMachineData(), 2024);
    const svg = timeMachineWrappedSvg(wrapped);
    expect(svg).toContain('width="1200" height="960"');
    expect(svg).toContain('Wrapped 2024');
    expect(svg).toContain('Sélection non exhaustive');
    expect(svg).toContain('https://');
    expect(svg).not.toMatch(/<script|<image|<foreignObject|@import/i);
    expect(svg).not.toContain('gagnant');
    expect(svg).not.toContain('score Sandbox');
  });
  it("signale l'année en cours et échappe les chaînes XML et les URLs", () => {
    const data = timeMachineData();
    const first = data.events[0];
    if (!first) throw new Error('Corpus vide');
    const wrapped = buildHistoryWrapped(
      {
        ...data,
        events: [
          {
            ...first,
            date: '2026-10-01',
            shortTitle: '<script>A&B</script>',
            organization: 'A & B',
            landmark: true,
            sources: [{ label: 'Source', url: 'https://example.org/?a=1&b=2' }],
          },
        ],
      },
      2026,
    );
    const svg = timeMachineWrappedSvg(wrapped);
    expect(svg).toContain('ANNÉE EN COURS');
    expect(svg).toContain('&lt;script&gt;A&amp;B&lt;/script&gt;');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('https://example.org/?a=1&amp;b=2');
    expect(timeMachineWrappedSvg(buildHistoryWrapped({ ...data, events: [] }, 2024))).toContain(
      '0 événements',
    );
  });
});
