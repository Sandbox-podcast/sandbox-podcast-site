import { describe, expect, it } from 'vitest';
import { portalPointer, portalProjects } from '../src/domain/studio-portal';
import { personalProjects } from '../src/lib/personal-projects';

describe('portail du vidéoclub', () => {
  it('déplace la vue derrière la porte dans le sens opposé au regard, sans dépasser le cadre', () => {
    expect(portalPointer(50, 100, 100, 200)).toEqual({ x: -0, y: -0 });
    expect(portalPointer(0, 0, 100, 200)).toEqual({ x: 12, y: 8 });
    expect(portalPointer(100, 200, 100, 200)).toEqual({ x: -12, y: -8 });
    expect(portalPointer(-500, 800, 100, 200)).toEqual({ x: 12, y: -8 });
    expect(portalPointer(NaN, Infinity, 0, -1)).toEqual({ x: -0, y: -0 });
  });

  it('représente les trois auteurs sans inventer de cassettes ni embarquer les fiches complètes', () => {
    const bays = portalProjects(personalProjects);
    expect(bays).toHaveLength(3);
    for (const [index, creator] of ['lou', 'loic', 'nicolas'].entries()) {
      const originals = personalProjects.filter((project) => project.creator === creator);
      expect(bays[index]?.map((project) => project.slug)).toEqual(
        originals.slice(0, 9).map((project) => project.slug),
      );
      for (const preview of bays[index] ?? []) {
        expect(preview).not.toHaveProperty('description');
        expect(preview).not.toHaveProperty('url');
      }
    }
    expect(portalProjects([])).toEqual([[], [], []]);
  });
});
