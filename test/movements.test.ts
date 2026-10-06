import { describe, expect, it } from 'vitest';
import { entityHistory, reigns } from '../src/domain/history.ts';
import { computeMovements, isBaseline } from '../src/domain/movements.ts';
import type { Snapshot } from '../src/domain/schema.ts';
import { snapshotSchema } from '../src/domain/schema.ts';
import { addWeeks } from '../src/domain/weeks.ts';

/** Construit une suite de snapshots à partir de classements (du #1 au dernier), une semaine par ligne. */
function history(weeks: string[][]): Snapshot[] {
  return weeks.map((order, i) => ({
    chart: 'test',
    week: addWeeks('2026-W30', i),
    publishedAt: '2026-01-01T00:00:00.000Z',
    retrievedAt: '2026-01-01T00:00:00.000Z',
    provenance: 'mock' as const,
    entries: order.map((entity, r) => ({
      entity,
      rank: r + 1,
      score: 100 - r,
      dimensions: { s: 100 - r },
      metrics: { stars: 1000 * (order.length - r) },
    })),
  }));
}

const SIZE = 3;

describe('mouvements', () => {
  const h = history([
    ['a', 'b', 'c', 'd'],
    ['b', 'a', 'd', 'c'],
    ['b', 'd', 'a', 'e'],
    ['b', 'a', 'e', 'd'],
  ]);

  it('détecte UP, DOWN et STABLE par rapport à la semaine précédente', () => {
    const { moves } = computeMovements(h, 1, SIZE);
    expect(moves).toEqual([
      { entity: 'b', kind: 'up', rank: 1, previousRank: 2, delta: 1 },
      { entity: 'a', kind: 'down', rank: 2, previousRank: 1, delta: -1 },
      { entity: 'd', kind: 'new', rank: 3, previousRank: 4, delta: 0 },
    ]);
  });

  it('signale OUT avec le rang actuel quand l’entité reste dans le pool', () => {
    const { out } = computeMovements(h, 1, SIZE);
    expect(out).toEqual([{ entity: 'c', previousRank: 3, currentRank: 4 }]);
  });

  it('distingue un retour (RE) d’une première entrée (NEW)', () => {
    const { moves } = computeMovements(h, 3, SIZE);
    const e = moves.find((m) => m.entity === 'e');
    expect(e?.kind).toBe('new');
    const back = computeMovements(
      history([
        ['a', 'b', 'c'],
        ['b', 'c', 'd'],
        ['b', 'c', 'a'],
      ]),
      2,
      SIZE,
    );
    expect(back.moves.find((m) => m.entity === 'a')?.kind).toBe('re');
  });

  it('traite la première semaine comme une base de comparaison, sans mouvement', () => {
    expect(isBaseline(0)).toBe(true);
    expect(isBaseline(1)).toBe(false);
    const { out } = computeMovements(h, 0, SIZE);
    expect(out).toEqual([]);
  });

  it("n'est pas modifié par les semaines suivantes : un snapshot publié est immuable", () => {
    const before = computeMovements(h, 1, SIZE);
    const extended = [...h, ...history([['z', 'y', 'x', 'w']])];
    expect(computeMovements(extended, 1, SIZE)).toEqual(before);
  });
});

describe('historique', () => {
  const h = history([
    ['a', 'b', 'c', 'd'],
    ['b', 'a', 'd', 'c'],
    ['b', 'd', 'a', 'e'],
    ['b', 'a', 'e', 'd'],
    ['a', 'b', 'e', 'd'],
  ]);

  it('calcule meilleure place, semaines dans le Top et séries consécutives', () => {
    const a = entityHistory(h, 'a', SIZE);
    expect(a.peak).toBe(1);
    expect(a.weeksAtPeak).toBe(2);
    expect(a.weeksInTop).toBe(5);
    expect(a.currentStreak).toBe(5);
    expect(a.weeksAtNumberOne).toBe(2);
    expect(a.firstWeek).toBe('2026-W30');
    expect(a.currentRank).toBe(1);
    expect(a.previousRank).toBe(2);
  });

  it("coupe la série quand l'entité sort du Top", () => {
    const d = entityHistory(h, 'd', SIZE);
    expect(d.points.map((p) => p.inTop)).toEqual([false, true, true, false, false]);
    expect(d.currentStreak).toBe(0);
    expect(d.longestStreak).toBe(2);
    expect(d.weeksInTop).toBe(2);
  });

  it('retient la plus forte progression et la plus forte chute en une semaine', () => {
    const a = entityHistory(h, 'a', SIZE);
    expect(a.biggestClimb).toEqual({ places: 1, week: '2026-W33' });
    expect(a.biggestFall).toEqual({ places: 1, week: '2026-W31' });
  });

  it('liste les règnes à la première place', () => {
    expect(reigns(h)).toEqual([
      { entity: 'a', from: '2026-W30', to: '2026-W30', weeks: 1 },
      { entity: 'b', from: '2026-W31', to: '2026-W33', weeks: 3 },
      { entity: 'a', from: '2026-W34', to: '2026-W34', weeks: 1 },
    ]);
  });
});

describe('contrat de snapshot', () => {
  const ok = history([['a', 'b', 'c']])[0];

  it('accepte un snapshot cohérent', () => {
    expect(snapshotSchema.safeParse(ok).success).toBe(true);
  });

  it('refuse des rangs non contigus, des scores croissants ou un doublon', () => {
    if (!ok) throw new Error('fixture');
    const gap = { ...ok, entries: ok.entries.map((e, i) => (i === 1 ? { ...e, rank: 3 } : e)) };
    expect(snapshotSchema.safeParse(gap).success).toBe(false);
    const unsorted = {
      ...ok,
      entries: ok.entries.map((e, i) => (i === 1 ? { ...e, score: 500 } : e)),
    };
    expect(snapshotSchema.safeParse(unsorted).success).toBe(false);
    const dup = { ...ok, entries: ok.entries.map((e, i) => (i === 1 ? { ...e, entity: 'a' } : e)) };
    expect(snapshotSchema.safeParse(dup).success).toBe(false);
  });
});
