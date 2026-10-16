export const HOME_STUDIO_IMAGE = '/images/home/studio-easter-eggs-v3.webp';
export const HOME_STUDIO_DOOR_IMAGE = HOME_STUDIO_IMAGE;
export const HOME_STUDIO_CLEAN_WALL = '/images/home/studio-chairless-v2.webp';
export const STUDIO_VIDEO_CLUB_HREF = '/nos-projets/video-club?from=studio';
export const STUDIO_DOOR_DURATION_MS = 1100;

/**
 * Portraits complets retouchés à partir des photos sources, conservées à part.
 * headTop repère le sommet visible en pixels, hors marge transparente.
 */
export const HOME_STUDIO_PEOPLE = {
  lou: {
    source: '/team/lou.png',
    photo: '/images/home/lou-body-no-mic-v2.webp',
    width: 900,
    height: 795,
    headTop: 39,
  },
  loic: {
    source: '/team/loic.png',
    photo: '/images/home/loic-body-no-mic-v2.webp',
    width: 900,
    height: 900,
    headTop: 150,
  },
  nicolas: {
    source: '/team/nicolas-prod-2026-10-15.webp',
    photo: '/images/home/nicolas-body-no-mic-v2.webp',
    width: 900,
    height: 900,
    headTop: 117,
  },
} as const;
