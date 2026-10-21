import type { PersonalProject } from './personal-projects';
import { HOME_PROJECT_ARTWORK } from './home-project-artwork';

/** Illustrations éditoriales des jaquettes VHS ; les médias produit restent dans le catalogue. */
export const VHS_PROJECT_ARTWORK: Readonly<Partial<Record<string, string>>> = {
  sillage: '/images/vhs-projects/sillage-v1.webp',
  boostback: '/images/vhs-projects/boostback-v1.webp',
  ballcam: '/images/vhs-projects/ballcam-v1.webp',
  'point-zero': '/images/vhs-projects/point-zero-v1.webp',
  hivekeep: '/images/vhs-projects/hivekeep-v1.webp',
  'akasha-os': '/images/vhs-projects/akasha-os-v1.webp',
  'song-maker': '/images/vhs-projects/song-maker-v1.webp',
  akasha: '/images/vhs-projects/akasha-v1.webp',
  'not-my-fault': '/images/vhs-projects/not-my-fault-v1.webp',
  okodukai: '/images/vhs-projects/okodukai-v1.webp',
  'heros-de-la-classe': '/images/vhs-projects/heros-de-la-classe-v1.webp',
  politiquizz: '/images/vhs-projects/politiquizz-v1.webp',
  pinchchat: '/images/vhs-projects/pinchchat-v1.webp',
  'three-observers': '/images/vhs-projects/three-observers-v1.webp',
  aigora: '/images/vhs-projects/aigora-v1.webp',
  'mission-maison': '/images/vhs-projects/mission-maison-v1.webp',
  'akasha-code-studio': '/images/vhs-projects/akasha-code-studio-v1.webp',
  rbitnet: '/images/vhs-projects/rbitnet-v1.webp',
  'akasha-model': '/images/vhs-projects/akasha-model-v1.webp',
  'akasha-companion': '/images/vhs-projects/akasha-companion-v1.webp',
  'offline-memory': '/images/vhs-projects/offline-memory-v1.webp',
  'llm-router': '/images/vhs-projects/llm-router-v1.webp',
  clawscope: '/images/vhs-projects/clawscope-v1.webp',
  'cloudflare-dns-swarm': '/images/vhs-projects/cloudflare-dns-swarm-v1.webp',
  'google-home-notification-gateway':
    '/images/vhs-projects/google-home-notification-gateway-v1.webp',
  'streamdeck-uptime-kuma': '/images/vhs-projects/streamdeck-uptime-kuma-v1.webp',
  'raycast-uptime-kuma': '/images/vhs-projects/raycast-uptime-kuma-v1.webp',
  'teamspeak-mcp': '/images/vhs-projects/teamspeak-mcp-v1.webp',
  'bot-hub': '/images/vhs-projects/bot-hub-v1.webp',
  'bot-chronicles': '/images/vhs-projects/bot-chronicles-v1.webp',
  'cursor-chat': '/images/vhs-projects/cursor-chat-v1.webp',
  'rust-commander': '/images/vhs-projects/rust-commander-v1.webp',
  chromehue: '/images/vhs-projects/chromehue-v1.webp',
};

/** Même jaquette dans la salle, le portail et le catalogue du vidéoclub. */
export function vhsProjectArtwork(project: PersonalProject) {
  return (
    VHS_PROJECT_ARTWORK[project.slug] ??
    HOME_PROJECT_ARTWORK[project.slug] ??
    project.cover?.src ??
    project.images[0]?.src ??
    project.icon?.src
  );
}
