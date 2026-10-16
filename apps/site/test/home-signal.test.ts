import { describe, expect, it } from 'vitest';
import {
  homeSignalContact,
  homeSignalLayoutPoint,
  homeSignalProgress,
  homeSignalSegments,
  type SignalLayoutOffset,
} from '../src/domain/home-signal';

describe('fil lumineux des chapitres', () => {
  it('mesure les contacts dans la mise en page, indépendamment des transformations visuelles', () => {
    type Node = 'page' | 'chapter' | 'reveal' | 'contact';
    const offsets: Record<Node, SignalLayoutOffset<Node>> = {
      page: { x: 0, y: 70, borderX: 0, borderY: 0, parent: null },
      chapter: { x: 60, y: 900, borderX: 1, borderY: 2, parent: 'page' },
      reveal: { x: 24, y: 80, borderX: 0, borderY: 0, parent: 'chapter' },
      contact: { x: 0, y: 0, borderX: 0, borderY: 0, parent: 'reveal' },
    };
    const read = (node: Node) => offsets[node];
    expect(homeSignalLayoutPoint<Node>('contact', read)).toEqual({ x: 85, y: 1052 });

    // Une fois la transformation terminée, le wrapper peut cesser d'être offsetParent.
    offsets.contact = { x: 24, y: 80, borderX: 0, borderY: 0, parent: 'chapter' };
    expect(homeSignalLayoutPoint<Node>('contact', read)).toEqual({ x: 85, y: 1052 });

    // L'ouverture de la biographie déplace le chapitre suivant dans le flux réel.
    offsets.chapter.y += 240;
    expect(homeSignalLayoutPoint<Node>('contact', read)).toEqual({ x: 85, y: 1292 });
  });

  it('utilise la largeur de la fenêtre pour placer le fil dans la marge mobile', () => {
    const point = { x: 84, y: 1010 };
    expect(homeSignalContact(point, 16, 390)).toEqual({ x: 12, y: 1018 });
    expect(homeSignalContact(point, 16, 900)).toEqual({ x: 12, y: 1018 });
    expect(homeSignalContact(point, 16, 901)).toEqual({ x: 60, y: 1018 });
    expect(homeSignalContact(point, 24, 1440)).toEqual({ x: 60, y: 1022 });
    expect(homeSignalContact({ x: 20, y: 1010 }, 16, 1440).x).toBe(12);
  });

  it('relie les contacts dans des segments contigus sans prolonger la page', () => {
    const segments = homeSignalSegments({ x: 720, y: 880 }, [
      { x: 80, y: 1010 },
      { x: 80, y: 2030 },
      { x: 80, y: 2840 },
    ]);
    expect(segments.map(({ top, height }) => [top, height])).toEqual([
      [880, 130],
      [1010, 1020],
      [2030, 810],
    ]);
    expect(segments[0]?.path).toMatch(/^M 720 0 C /);
    expect(segments.at(-1)?.path).toMatch(/80 810$/);
  });

  it('ignore les contacts absents, non mesurables ou placés en arrière', () => {
    expect(homeSignalSegments({ x: NaN, y: 0 }, [{ x: 12, y: 20 }])).toEqual([]);
    const segments = homeSignalSegments({ x: 100, y: 200 }, [
      { x: 12, y: 200 },
      { x: 12, y: -10 },
      { x: Infinity, y: 300 },
      { x: 12, y: 450 },
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.height).toBe(250);
  });

  it('suit la lecture dans les deux sens et reste borné hors de la section', () => {
    const segment = { top: 900, height: 400, path: '' };
    expect(
      [700, 900, 1100, 1300, 1500, 1000].map((line) => homeSignalProgress(segment, line)),
    ).toEqual([0, 0, 0.5, 1, 1, 0.25]);
    expect(homeSignalProgress({ ...segment, height: 0 }, 1000)).toBe(0);
    expect(homeSignalProgress(segment, NaN)).toBe(0);
  });
});
