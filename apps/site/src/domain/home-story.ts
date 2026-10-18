import type { Host } from './schema';
import type { PersonalProject } from './personal-projects';

/** Présentations fondées sur le catalogue de projets, autorisées par Lou le 15 octobre. */
const profiles = [
  {
    slug: 'lou',
    focus: 'Créateur de quêtes du quotidien',
    bio: "J'aime les jeux vidéo et je cherche comment leurs mécaniques peuvent aider à apprendre. Avec Héros de la classe, Okodukai et Not My Fault, je crée des projets autour de la pédagogie, de la gestion de l'argent et du jeu en équipe.",
    project: 'okodukai',
  },
  {
    slug: 'loic',
    focus: 'Inventeur, même sans Wi-Fi',
    bio: "Je développe des outils pour faire tourner l'IA sur ma machine. Akasha OS réunit conversations, modèles, mémoire et agents ; Song Maker sert à générer, éditer et mixer des morceaux. Je travaille sur des outils locaux et open source pour comprendre ce qui tourne sous le capot et garder la main sur mes machines.",
    project: 'song-maker',
  },
  {
    slug: 'nicolas',
    focus: "Chef d'orchestre des agents",
    bio: "Je crée des outils pour travailler avec des agents et des expériences à explorer dans le navigateur. Sillage réunit Claude Code, Codex et OpenCode. BallCam.tv permet de revoir des matchs Rocket League en 3D ; Boostback sert à piloter le retour de Super Heavy. Je passe du développement au jeu et à la simulation, et j'automatise ce que je peux au quotidien.",
    project: 'sillage',
  },
] as const;

export function homeProfiles(hosts: readonly Host[]) {
  return profiles.flatMap((profile) => {
    const host = hosts.find((item) => item.slug === profile.slug && !item.placeholder);
    if (!host) return [];
    const bio = host.bio.trim();
    return [
      {
        ...host,
        focus: profile.focus,
        bio: bio && bio !== 'Présentation à compléter.' ? bio : profile.bio,
      },
    ];
  });
}

export function homeProjects(projects: readonly PersonalProject[]) {
  return profiles.flatMap(({ project: slug }) => {
    const project = projects.find((item) => item.slug === slug);
    return project ? [project] : [];
  });
}
