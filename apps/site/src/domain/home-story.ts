import type { Host } from './schema';
import type { PersonalProject } from './personal-projects';

/** Présentations fondées sur le catalogue de projets, autorisées par Lou le 15 octobre. */
const profiles = [
  {
    slug: 'lou',
    focus: 'Game designer des trucs chiants',
    bio: "Passionné par les jeux vidéo et les nouvelles technologies, Lou explore comment appliquer les mécaniques du jeu vidéo à l'éducation et à la pédagogie. Son ambition : transformer les programmes scolaires et les apprentissages du quotidien en expériences ludiques et interactives, pour apprendre autrement, en mêlant l'utile à l'agréable.\n\nÀ travers des projets comme Héros de la classe, Okodukai ou Not My Fault, il expérimente de nouvelles façons d'apprendre, de collaborer et de développer ses compétences en jouant.",
    project: 'okodukai',
  },
  {
    slug: 'loic',
    focus: 'Savant fou en localhost',
    bio: "Loïc développe des outils pour faire fonctionner l'IA sur sa propre machine. Akasha OS rassemble conversations, modèles, mémoire et agents dans un environnement local. Avec Song Maker, il explore la création musicale : génération de chansons, édition des prises et mixage. Ses projets vont des outils techniques aux applications de création.\n\nSon terrain de jeu : le local et l'open source. Il veut comprendre ce qui tourne sous le capot, assembler ses propres outils et garder la main sur ses propres machines, au quotidien.",
    project: 'song-maker',
  },
  {
    slug: 'nicolas',
    focus: 'Directeur de la flemme automatisée',
    bio: "Nico crée des outils pour travailler avec des agents et des expériences à explorer dans le navigateur. Sillage réunit Claude Code, Codex et OpenCode dans un même espace de travail. BallCam.tv permet de revoir des matchs Rocket League en 3D, et Boostback de piloter le retour de Super Heavy. Ses réalisations relient développement, jeu et simulation.\n\nSon autre obsession : optimiser et automatiser le quotidien. Il cherche ce qu'il peut confier aux IA et aux robots, pour consacrer davantage de temps aux idées suivantes.",
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
