import { describe, expect, it } from 'vitest';
import { portalPointer, portalProjects } from '../src/domain/studio-portal';
import { personalProjects } from '../src/lib/personal-projects';
import { VHS_PROJECT_ARTWORK } from '../src/domain/vhs-project-artwork';
import { videoClubTapeSlot } from '../src/domain/video-club';

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

  it('montre les illustrations VHS actuelles pour chaque cassette de l’aperçu', () => {
    for (const project of portalProjects(personalProjects).flat()) {
      expect(project.image).toBe(VHS_PROJECT_ARTWORK[project.slug]);
      expect(project.image).toMatch(/^\/images\/vhs-projects\//);
    }
  });

  it('conserve les trois colonnes et les bas des trois rayons de la salle', () => {
    expect(videoClubTapeSlot(0, 0)).toEqual({ x: 0.21, y: 0.435 });
    expect(videoClubTapeSlot(1, 4)).toEqual({ x: 0.5, y: 0.55 });
    expect(videoClubTapeSlot(2, 8)).toEqual({ x: 0.79, y: 0.66 });
  });
});
