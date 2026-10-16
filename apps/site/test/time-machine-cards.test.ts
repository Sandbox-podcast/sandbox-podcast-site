import { describe, expect, it } from 'vitest';
import { historyCardWindow } from '../src/domain/time-machine-cards';

describe('fenêtre des inventions illustrées', () => {
  it('garde cinq dates contiguës autour de chaque sélection, sans sortir du corpus', () => {
    for (let selected = 0; selected < 151; selected += 1) {
      const window = historyCardWindow(151, selected);
      expect(window).toHaveLength(5);
      expect(window).toContain(selected);
      expect(window[0]).toBeGreaterThanOrEqual(0);
      expect(window.at(-1)).toBeLessThan(151);
      expect(window).toEqual(Array.from({ length: 5 }, (_, i) => (window[0] ?? 0) + i));
    }
  });
  it('donne trois cartes mobiles avec la sélection et les voisins disponibles aux bornes', () => {
    expect(historyCardWindow(151, 0, 3)).toEqual([0, 1, 2]);
    expect(historyCardWindow(151, 75, 3)).toEqual([74, 75, 76]);
    expect(historyCardWindow(151, 150, 3)).toEqual([148, 149, 150]);
  });
  it('conserve les corpus vides, isolés ou courts', () => {
    expect(historyCardWindow(0, 0)).toEqual([]);
    expect(historyCardWindow(1, 0)).toEqual([0]);
    expect(historyCardWindow(2, 1, 3)).toEqual([0, 1]);
  });
});
