import type { PersonalProject } from './personal-projects';
import { VIDEO_CLUB_BAYS } from './video-club';
import { HOME_PROJECT_ARTWORK } from './home-project-artwork';

export const STUDIO_PORTAL_DURATION_MS = 720;

export function portalPointer(x: number, y: number, width: number, height: number) {
  const axis = (position: number, size: number) =>
    Number.isFinite(position) && Number.isFinite(size) && size > 0
      ? Math.max(-1, Math.min(1, (position / size) * 2 - 1))
      : 0;
  return { x: axis(x, width) * -12, y: axis(y, height) * -8 };
}

/** Première page des trois rayons par auteur, avec les seules données de l'aperçu. */
export function portalProjects(projects: readonly PersonalProject[]) {
  return VIDEO_CLUB_BAYS.map((creator) =>
    projects
      .filter((project) => project.creator === creator)
      .slice(0, 9)
      .map((project) => ({
        slug: project.slug,
        name: project.name,
        color: project.color,
        image:
          HOME_PROJECT_ARTWORK[project.slug] ??
          (project.cover ?? project.images[0] ?? project.icon)?.src,
      })),
  );
}

export type PortalProjects = ReturnType<typeof portalProjects>;
