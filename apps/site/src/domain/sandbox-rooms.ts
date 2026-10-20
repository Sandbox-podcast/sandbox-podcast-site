export type SandboxRoomId = 'studio' | 'projects' | 'rankings' | 'history' | 'cinema' | 'news';

export interface SandboxRoom {
  id: SandboxRoomId;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  accent: string;
  href: string;
  action: string;
}

/** Les pièces ouvrent les rubriques existantes ; aucun contenu éditorial n'est simulé. */
export const SANDBOX_ROOMS = [
  {
    id: 'studio',
    number: '01',
    title: 'Le plateau',
    subtitle: 'Le talk-show IA, engineering et produit',
    description: 'Deux développeurs et un Product Manager.',
    image: '/images/home/studio-wide-lit-v6.webp',
    accent: '#ffbd79',
    href: '/podcast',
    action: "Voir l'émission",
  },
  {
    id: 'projects',
    number: '02',
    title: 'Le vidéoclub',
    subtitle: 'Nos projets',
    description: 'Les applications de Lou, Loïc et Nicolas, à sortir de leur boîte.',
    image: '/images/rooms/video-club-room-v2.webp',
    accent: '#fb8c88',
    href: '/nos-projets',
    action: 'Tous nos projets',
  },
  {
    id: 'rankings',
    number: '03',
    title: 'La salle des classements',
    subtitle: 'Sandbox Charts',
    description:
      'Comparer les projets, les skills et les modèles à partir des mesures disponibles.',
    image: '/images/rooms/rankings-room-v1.webp',
    accent: '#74d7e5',
    href: '/charts',
    action: 'Voir les classements',
  },
  {
    id: 'history',
    number: '04',
    title: 'La Time Machine',
    subtitle: "L'histoire de l'IA",
    description:
      'Revenir sur les dates et les inventions qui ont changé notre façon de construire.',
    image: '/images/rooms/time-machine-room-v1.webp',
    accent: '#eac07b',
    href: '/time-machine',
    action: 'Explorer la chronologie',
  },
  {
    id: 'cinema',
    number: '05',
    title: 'Le cinéma',
    subtitle: 'Les replays',
    description: 'Choisis une émission. On reprend la discussion.',
    image: '/images/rooms/cinema-room-v2.webp',
    accent: '#f4a28e',
    href: '/podcast',
    action: 'Tous les replays',
  },
  {
    id: 'news',
    number: '06',
    title: 'Le radar',
    subtitle: 'Sandbox News',
    description: "Les actualités de l'IA et du développement, avec leurs sources.",
    image: '/images/rooms/radar-room-v1.webp',
    accent: '#a9d99c',
    href: '/news',
    action: 'Lire les actualités',
  },
] as const satisfies readonly SandboxRoom[];

export function sandboxRoom(id: SandboxRoomId): SandboxRoom {
  return SANDBOX_ROOMS.find((room) => room.id === id) ?? SANDBOX_ROOMS[0];
}

export function isSandboxRoomId(value: string): value is SandboxRoomId {
  return SANDBOX_ROOMS.some((room) => room.id === value);
}

/** Terminaux des familles publiques ; leurs numéros sont des canaux, pas des rangs. */
export const SANDBOX_CHART_TERMINALS = [
  { label: 'GitHub', detail: 'Projets open source', href: '/charts/github', symbol: '{ }' },
  { label: 'Skills', detail: 'Skills, agents et MCP', href: '/charts/skills', symbol: '>_' },
  { label: 'Models', detail: "Modèles d'IA", href: '/charts/ai-models', symbol: '[ ]' },
  { label: 'Rising', detail: 'Projets en progression', href: '/charts/rising', symbol: '↗' },
] as const;
