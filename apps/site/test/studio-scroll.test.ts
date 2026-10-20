import { describe, expect, it } from 'vitest';
import { studioScrollState } from '../src/domain/studio-scroll';

describe('chorégraphie du plateau', () => {
  it('commence éteint avec une promesse lisible et allume les quatre destinations dans l’ordre', () => {
    expect(studioScrollState(0)).toMatchObject({ light: 0, copy: 1, turn: 0, wall: 0 });
    expect(studioScrollState(0.2)).toMatchObject({ charts: 1, projects: 0, history: 0 });
    expect(studioScrollState(0.4)).toMatchObject({
      light: 1,
      charts: 1,
      news: 1,
      projects: 1,
      history: 1,
      approach: 0,
      turn: 0,
      wall: 0,
    });
  });
  it('laisse une pause sur le plateau allumé avant de tourner et de présenter les replays', () => {
    expect(studioScrollState(0.5)).toMatchObject({ copy: 0, turn: 0, wall: 0 });
    expect(studioScrollState(0.7).turn).toBeGreaterThan(0);
    expect(studioScrollState(0.9)).toMatchObject({
      approach: 1,
      turn: 1,
      wall: 1,
      phase: 'replays',
    });
  });
  it('borne les entrées invalides et rejoue la même scène en revenant en arrière', () => {
    expect(studioScrollState(-1)).toEqual(studioScrollState(0));
    expect(studioScrollState(NaN)).toEqual(studioScrollState(0));
    expect(studioScrollState(Infinity)).toEqual(studioScrollState(0));
    expect(studioScrollState(2)).toEqual(studioScrollState(1));
    const first = studioScrollState(0.35);
    studioScrollState(1);
    expect(studioScrollState(0.35)).toEqual(first);
  });
});
