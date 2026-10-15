import { awardFixture } from '../scripts/fixtures/awards.ts';
import { describe, expect, it } from 'vitest';
import { awardSunday, parisWeek, badgeSvg } from '../src/domain/badges.ts';
import {
  AWARD_DEFINITIONS,
  awardPeriod,
  awardPeriodBounds,
  awardScope,
  categoryAwardScope,
  requiredAwardSundays,
  selectAwardWinners,
  validAwardEdition,
  assignedAwardShare,
  assignedAwardSnippets,
  candidateAwardPeriods,
  awardSourcePath,
} from '../src/domain/awards.ts';

const now = new Date('2026-11-02T03:00:00Z');
describe('périodes et catalogue des sept Awards', () => {
  it('déclare chaque distinction avec sa règle et son calendrier', () => {
    expect(Object.keys(AWARD_DEFINITIONS)).toHaveLength(7);
    expect(awardPeriod('rookie-month', '2026-10')).toBe('2026-10');
    expect(() => awardPeriod('rookie-month', '2026-13')).toThrow();
    expect(() => awardPeriod('annual', '2026-W41')).toThrow();
    expect(() => awardPeriod('skill-week', '2025-W53')).toThrow();
    expect(categoryAwardScope('Local AI')).toBe('local-ai');
    expect(() => awardScope('github-category', 'hacker')).toThrow();
    expect(() => awardScope('skill-week', 'github')).toThrow();
  });
  it('couvre les mois complets, les semaines ISO et les années à 53 semaines', () => {
    expect(requiredAwardSundays('rookie-month', '2026-10')).toEqual([
      '2026-10-04',
      '2026-10-11',
      '2026-10-18',
      '2026-10-25',
    ]);
    expect(requiredAwardSundays('annual', '2026')).toHaveLength(53);
    expect(requiredAwardSundays('annual', '2025')).toHaveLength(52);
    expect(awardPeriodBounds('annual', '2026').end).toBe('2027-01-03');
    expect(awardPeriodBounds('rookie-month', '2028-02').end).toBe('2028-02-29');
  });
});
describe('attributions hebdomadaires sans nouveau score', () => {
  it('attribue le premier rang de chaque catégorie publiée', () => {
    const edition = awardFixture('github', '2026-10-11');
    const awards = selectAwardWinners('github-category', '2026-W41', [edition], now);
    expect(awards.map((award) => [award.scope, award.nominee.entityId])).toEqual([
      ['agents', 'a'],
      ['coding', 'c'],
    ]);
    expect(
      selectAwardWinners('github-category', '2026-W41', [edition], now, 'coding'),
    ).toHaveLength(1);
  });
  it('compare deux dimanches, exclut les nouveaux et départage par rang final', () => {
    const before = awardFixture('github', '2026-10-04', ['a', 'b', 'c', 'd']);
    const current = awardFixture('github', '2026-10-11', ['c', 'd', 'a', 'b']);
    const [winner] = selectAwardWinners('biggest-mover', '2026-W41', [before, current], now);
    expect(winner?.nominee.entityId).toBe('c');
    expect(winner?.facts).toEqual({ rankGain: 2, previousRank: 3 });
    expect(selectAwardWinners('biggest-mover', '2026-W41', [current], now)).toEqual([]);
    expect(
      selectAwardWinners(
        'biggest-mover',
        '2026-W41',
        [before, awardFixture('github', '2026-10-11', ['e', 'b', 'c', 'd'])],
        now,
      ),
    ).toEqual([]);
  });
  it.each([
    ['skill-week', 'skills'],
    ['best-model', 'models'],
    ['rising-star', 'rising'],
  ] as const)('attribue %s au premier rang officiel', (type, chart) => {
    const edition = awardFixture(chart, '2026-10-11');
    expect(selectAwardWinners(type, '2026-W41', [edition], now)[0]?.nominee.entityId).toBe('a');
    expect(
      selectAwardWinners(type, '2026-W41', [edition], new Date('2026-10-11T21:59:59Z')),
    ).toEqual([]);
    expect(
      selectAwardWinners(type, '2026-W41', [edition], new Date('2026-10-11T22:00:00Z')),
    ).toHaveLength(1);
  });
});
describe('palmarès mensuels et annuels', () => {
  it('exige chaque dimanche du mois et compte les premières places Rising', () => {
    const days = requiredAwardSundays('rookie-month', '2026-10');
    const editions = days.map((day, index) =>
      awardFixture('rising', day, index === 1 ? ['b', 'a', 'c'] : ['a', 'b', 'c']),
    );
    const winner = selectAwardWinners('rookie-month', '2026-10', editions, now)[0];
    expect(winner?.nominee.entityId).toBe('a');
    expect(winner?.facts.firstPlaces).toBe(3);
    expect(winner?.sources).toHaveLength(4);
    expect(selectAwardWinners('rookie-month', '2026-10', editions.slice(1), now)).toEqual([]);
    expect(
      selectAwardWinners('rookie-month', '2026-10', editions, new Date('2026-10-31T22:59:59Z')),
    ).toEqual([]);
  });
  it('départage les égalités au rang du dernier dimanche, puis à identité stable', () => {
    const editions = requiredAwardSundays('rookie-month', '2026-10').map((day, index) =>
      awardFixture('rising', day, index % 2 ? ['b', 'a', 'c'] : ['a', 'b', 'c']),
    );
    expect(selectAwardWinners('rookie-month', '2026-10', editions, now)[0]?.nominee.entityId).toBe(
      'b',
    );
    const orders = [
      ['a', 'b', 'c'],
      ['b', 'a', 'c'],
      ['a', 'b', 'c'],
      ['b', 'a', 'c'],
      ['c', 'd', 'e'],
    ];
    const november = requiredAwardSundays('rookie-month', '2026-11').map((day, index) =>
      awardFixture('rising', day, orders[index]),
    );
    expect(
      selectAwardWinners('rookie-month', '2026-11', november, new Date('2026-12-01T03:00:00Z'))[0]
        ?.nominee.entityId,
    ).toBe('a');
  });
  it('attribue une distinction annuelle par famille seulement avec toutes les semaines', () => {
    const editions = requiredAwardSundays('annual', '2026').map((day) =>
      awardFixture('github', day),
    );
    const closed = new Date('2027-01-04T03:00:00Z');
    const [winner] = selectAwardWinners('annual', '2026', editions, closed);
    expect(winner?.scope).toBe('github');
    expect(winner?.facts.firstPlaces).toBe(53);
    expect(selectAwardWinners('annual', '2026', editions.slice(1), closed)).toEqual([]);
    expect(
      selectAwardWinners('annual', '2026', editions, new Date('2027-01-03T22:59:59Z')),
    ).toEqual([]);
  });
});
describe('preuves et adresses publiques', () => {
  it('refuse le simulé, les doublons, les sources exclues et les anciennes méthodes', () => {
    const good = awardFixture('github', awardSunday('2026-W41'));
    expect(validAwardEdition(good, now)).toBe(true);
    expect(validAwardEdition({ ...good, scoringVersion: 'github-momentum-v1' }, now)).toBe(false);
    expect(validAwardEdition({ ...good, excluded: true }, now)).toBe(false);
    expect(
      validAwardEdition(
        {
          ...good,
          rows: [...good.rows.slice(0, 1), ...good.rows.slice(0, 1), ...good.rows.slice(2)],
        },
        now,
      ),
    ).toBe(false);
    expect(selectAwardWinners('github-category', '2026-W41', [good, good], now)).toEqual([]);
    const external = awardFixture('models', '2026-10-11');
    expect(
      validAwardEdition(
        { ...external, rows: external.rows.map((row) => ({ ...row, metadata: {} })) },
        now,
      ),
    ).toBe(false);
  });
  it('construit le partage depuis une attribution permanente validée', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const share = assignedAwardShare('https://sandbox.test', {
      id,
      type: 'best-model',
      period: '2026-W41',
      name: 'MODÈLE FIXTURE',
    });
    expect(share.url).toBe(`https://sandbox.test/charts/awards/edition/${id}`);
    expect(share.image).toBe(`https://sandbox.test/api/awards/edition/${id}/image`);
    expect(share.text).toContain('Best AI Model 2026-W41');
    expect(parisWeek(now)).toBe('2026-W45');
  });
  it('intègre les modèles sans identité GitHub et échappe les noms dans tous les formats', () => {
    const award = {
      id: '11111111-1111-4111-8111-111111111111',
      type: 'best-model' as const,
      chart: 'models' as const,
      period: '2026-W41',
      scope: '',
      slug: 'model-a',
      name: '<script>x</script> [model] "test"',
    };
    const snippets = assignedAwardSnippets('https://sandbox.test/ignored', award);
    expect(new URL(snippets.target).pathname).toBe('/charts/entity/model-a');
    expect(new URL(snippets.target).searchParams.get('utm_campaign')).toBe('best_model');
    expect(new URL(snippets.target).hash).toBe(`#award-${award.id}`);
    expect(snippets.image).toBe(`https://sandbox.test/badges/awards/${award.id}.svg`);
    expect(snippets.html).not.toContain('<script>');
    expect(snippets.markdown).toContain('\\[model\\]');
    expect(() => assignedAwardSnippets('javascript:alert(1)', award)).toThrow();
    expect(awardSourcePath({ chart: 'models', sourceEdition: '2026-10-11' })).toBe(
      '/charts/ai-models/2026-10-11',
    );
    const svg = badgeSvg({
      kind: 'distinction',
      label: '<script>',
      period: '2026-W41',
      scope: 'coding',
      status: 'awarded',
    });
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).not.toContain('<script>');
    expect(
      badgeSvg({
        kind: 'distinction',
        label: 'BEST MODEL',
        period: '2026-W41',
        status: 'withdrawn',
      }),
    ).not.toContain('BEST MODEL');
  });
  it('ignore les dates hors calendrier supporté lors de la reprise', () => {
    expect(candidateAwardPeriods('annual', [awardFixture('models', '2000-01-02')], now)).toEqual(
      [],
    );
  });
});
