import { describe, expect, it } from 'vitest';
import {
  dateFromRefreshSlot,
  isRefreshSlotId,
  refreshSlotForDate,
  refreshSlotId,
} from '../src/domain/chart-refresh.ts';

describe('créneaux de collecte SANDBOX CHARTS', () => {
  it('range les collectes dans deux créneaux UTC fixes par jour', () => {
    expect(refreshSlotId('2026-10-13T03:17:00Z')).toBe('2026-10-13T00:00Z');
    expect(refreshSlotId('2026-10-13T11:59:59Z')).toBe('2026-10-13T00:00Z');
    expect(refreshSlotId('2026-10-13T12:00:00Z')).toBe('2026-10-13T12:00Z');
    expect(refreshSlotId('2026-10-13T15:17:00Z')).toBe('2026-10-13T12:00Z');
  });

  it('valide les identifiants de créneau et leurs dates', () => {
    expect(isRefreshSlotId('2026-10-13T00:00Z')).toBe(true);
    expect(isRefreshSlotId('2026-10-13T12:00Z')).toBe(true);
    expect(isRefreshSlotId('2026-02-31T00:00Z')).toBe(false);
    expect(isRefreshSlotId('2026-10-13T03:00Z')).toBe(false);
    expect(refreshSlotForDate('2026-10-13', 'second')).toBe('2026-10-13T12:00Z');
    expect(dateFromRefreshSlot('2026-10-13T12:00Z')).toBe('2026-10-13');
    expect(() => refreshSlotId('date inconnue')).toThrow();
  });
});
