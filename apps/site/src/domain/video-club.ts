import { PROJECT_CREATORS, type PersonalProject, type ProjectCreator } from './personal-projects';

export const VIDEO_CLUB_BAYS = ['lou', 'loic', 'nicolas'] as const;
export const VIDEO_CLUB_ROOM_IMAGE = '/images/rooms/video-club-room-v2.webp';
export const VIDEO_CLUB_VHS_CLOSED_IMAGE = '/video-club/vhs-case-closed-v1.webp';
export const VIDEO_CLUB_VHS_OPEN_IMAGE = '/video-club/vhs-case-open-v1.webp';

/** Garde du décor autour des rayons latéraux, même dans un cadre très large. */
export function videoClubRoomFit(
  width: number,
  height: number,
  creator: ProjectCreator | null = null,
) {
  return Math.max(width / (creator === null ? 1500 : 1200), height / 850);
}

/** Une place par projet, conservée même pendant une recherche. */
export function videoClubShelves(projects: readonly PersonalProject[]) {
  return VIDEO_CLUB_BAYS.map((creator) => {
    const titles = projects.filter((project) => project.creator === creator);
    return {
      creator,
      name: PROJECT_CREATORS[creator].name,
      rows: Array.from({ length: Math.ceil(titles.length / 6) }, (_, row) =>
        titles.slice(row * 6, row * 6 + 6),
      ),
    };
  });
}

export function videoClubCamera(
  creator: ProjectCreator | null,
  entered: boolean,
  photographic = true,
) {
  const index = creator === null ? 1 : VIDEO_CLUB_BAYS.indexOf(creator);
  return {
    x: creator === null ? 0 : -(index - 1) * (photographic ? 350 : 430),
    z: !entered ? (photographic ? 0 : -190) : creator === null ? 20 : 410,
  };
}
