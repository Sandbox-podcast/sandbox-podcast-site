import { describe, expect, it } from 'vitest';
import {
  addWeeks,
  compareWeeks,
  isoWeekOf,
  nextWeek,
  parseWeek,
  previousWeek,
  weekEnd,
  weekRange,
  weekStart,
} from '../src/domain/weeks.ts';

describe('semaines ISO', () => {
  it('place le 6 octobre 2026 en semaine 41, du lundi 5 au dimanche 11', () => {
    expect(isoWeekOf(new Date('2026-10-06T07:00:00Z'))).toBe('2026-W41');
    expect(weekStart('2026-W41').toISOString().slice(0, 10)).toBe('2026-10-05');
    expect(weekEnd('2026-W41').toISOString().slice(0, 10)).toBe('2026-10-11');
  });

  it("gère les années où la semaine 1 commence l'année précédente", () => {
    expect(weekStart('2026-W01').toISOString().slice(0, 10)).toBe('2025-12-29');
    expect(isoWeekOf(new Date('2025-12-29T00:00:00Z'))).toBe('2026-W01');
    expect(isoWeekOf(new Date('2027-01-03T12:00:00Z'))).toBe('2026-W53');
  });

  it('passe de la semaine 53 à la semaine 1', () => {
    expect(nextWeek('2026-W53')).toBe('2027-W01');
    expect(previousWeek('2027-W01')).toBe('2026-W53');
  });

  it('additionne et compare des semaines', () => {
    expect(addWeeks('2026-W41', -15)).toBe('2026-W26');
    expect(compareWeeks('2026-W40', '2026-W41')).toBeLessThan(0);
    expect(compareWeeks('2027-W01', '2026-W52')).toBeGreaterThan(0);
  });

  it('liste les semaines entre deux bornes incluses', () => {
    const range = weekRange('2026-W26', '2026-W41');
    expect(range).toHaveLength(16);
    expect(range[0]).toBe('2026-W26');
    expect(range.at(-1)).toBe('2026-W41');
  });

  it('refuse un identifiant mal formé', () => {
    expect(() => parseWeek('2026-41')).toThrow();
    expect(parseWeek('2026-W41')).toEqual({ year: 2026, week: 41 });
  });
});
