import { describe, expect, it } from 'vitest';
import { rankScored } from '../src/domain/ranking.ts';
import type { ScoringProfile } from '../src/domain/schema.ts';
import { scorePool, withDerived } from '../src/domain/scoring.ts';

const profile: ScoringProfile = {
  id: 'test',
  metrics: [
    { key: 'a', label: 'A', unit: 'percent', decimals: 0, source: 'src', higherIsBetter: true },
    { key: 'b', label: 'B', unit: 'count', decimals: 0, source: 'src', higherIsBetter: true },
    { key: 'price', label: 'Prix', unit: 'usd', decimals: 2, source: 'src', higherIsBetter: false },
  ],
  derived: [
    {
      kind: 'ratio',
      key: 'growth',
      label: 'Croissance',
      unit: 'percent',
      decimals: 1,
      numerator: 'b',
      denominator: 'a',
      scale: 100,
      higherIsBetter: true,
    },
  ],
  dimensions: [
    {
      id: 'quality',
      label: 'Qualité',
      description: '',
      components: [{ type: 'metric', metric: 'a', weight: 1, scale: { kind: 'identity' } }],
    },
    {
      id: 'cheap',
      label: 'Prix',
      description: '',
      components: [
        {
          type: 'metric',
          metric: 'price',
          weight: 1,
          scale: { kind: 'range', min: 1, max: 100, transform: 'log', invert: true },
        },
      ],
    },
    {
      id: 'reach',
      label: 'Reach',
      description: '',
      components: [
        {
          type: 'metric',
          metric: 'b',
          weight: 1,
          scale: { kind: 'pool', transform: 'linear', invert: false },
        },
      ],
    },
    {
      id: 'overall',
      label: 'Global',
      description: '',
      components: [
        { type: 'dimension', dimension: 'quality', weight: 3 },
        { type: 'dimension', dimension: 'cheap', weight: 1 },
      ],
    },
  ],
  primary: 'overall',
};

describe('scoring', () => {
  it('calcule les métriques dérivées sans diviser par zéro', () => {
    expect(withDerived({ a: 200, b: 50 }, profile.derived)).toEqual({ a: 200, b: 50, growth: 25 });
    expect(withDerived({ a: 0, b: 50 }, profile.derived)).toEqual({ a: 0, b: 50 });
    expect(withDerived({ b: 50 }, profile.derived)).toEqual({ b: 50 });
  });

  it('convertit chaque échelle en sous-score de 0 à 100', () => {
    const scored = scorePool(
      [
        { entity: 'x', metrics: { a: 80, b: 10, price: 1 } },
        { entity: 'y', metrics: { a: 60, b: 30, price: 100 } },
      ],
      profile,
    );
    const [x, y] = scored;
    expect(x?.dimensions['quality']).toBe(80);
    // Échelle fixe et inversée : 1 $ vaut 100, 100 $ vaut 0.
    expect(x?.dimensions['cheap']).toBe(100);
    expect(y?.dimensions['cheap']).toBe(0);
    // Échelle relative au pool : le plus petit vaut 0, le plus grand 100.
    expect(x?.dimensions['reach']).toBe(0);
    expect(y?.dimensions['reach']).toBe(100);
    // Composite : (80 × 3 + 100 × 1) / 4
    expect(x?.score).toBe(85);
  });

  it('ne met pas 0 quand une donnée manque : la dimension est absente et ignorée', () => {
    const scored = scorePool(
      [
        { entity: 'x', metrics: { a: 80, b: 10 } },
        { entity: 'y', metrics: { a: 60, b: 30, price: 10 } },
      ],
      profile,
    );
    const x = scored[0];
    expect(x?.dimensions['cheap']).toBeUndefined();
    // Sans prix, le global se calcule sur la seule qualité.
    expect(x?.score).toBe(80);
  });

  it('refuse de noter un candidat dont la note principale est impossible à calculer', () => {
    expect(() => scorePool([{ entity: 'x', metrics: { b: 10 } }], profile)).toThrow(/indisponible/);
  });

  it('classe par note décroissante, départage par métrique puis par identifiant', () => {
    const scored = scorePool(
      [
        { entity: 'b', metrics: { a: 70, b: 5, price: 10 } },
        { entity: 'a', metrics: { a: 70, b: 9, price: 10 } },
        { entity: 'c', metrics: { a: 90, b: 1, price: 10 } },
      ],
      profile,
    );
    const ranked = rankScored(scored, 'b');
    expect(ranked.map((e) => e.entity)).toEqual(['c', 'a', 'b']);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it('est déterministe : la même entrée donne le même classement', () => {
    const input = [
      { entity: 'x', metrics: { a: 80, b: 10, price: 3 } },
      { entity: 'y', metrics: { a: 60, b: 30, price: 7 } },
    ];
    expect(rankScored(scorePool(input, profile), 'b')).toEqual(
      rankScored(scorePool(input, profile), 'b'),
    );
  });
});
