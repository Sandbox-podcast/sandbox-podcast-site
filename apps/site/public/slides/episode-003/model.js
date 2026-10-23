export const scenes = [
  {
    id: 'intro',
    kind: 'lobby',
    chapter: 'Introduction',
    title: 'Introduction',
    sequence: 1,
    illustration: './assets/intro-v1.webp',
  },
  {
    id: 'radar',
    kind: 'lobby',
    chapter: 'Radar',
    title: 'Radar',
    sequence: 2,
    illustration: './assets/radar-v1.webp',
  },
  {
    id: 'copilot-studio-frontier',
    kind: 'radar-story',
    chapter: 'Radar',
    title: 'Copilot Studio · Frontier',
    subtitle: 'Des agents qui suivent les processus dans la durée',
    date: '15 octobre 2026',
    illustration: './assets/radar-v1.webp',
    points: [
      [
        'Un compte propre',
        'L’agent intervient dans Teams et Outlook avec ses autorisations et des actions traçables.',
      ],
      [
        'Une mémoire partagée',
        'Il conserve le contexte du processus et les préférences entre deux cycles.',
      ],
      [
        'Des déclencheurs',
        'Un email ou un horaire lance le travail via le harnais GitHub Copilot, sans nouveau prompt.',
      ],
    ],
    availability: 'Frontier · fonctions expérimentales en cours de déploiement',
    upcoming:
      'À venir : ordinateur cloud avec navigateur et suggestions d’amélioration de l’agent.',
    sourceImage: './assets/sources/copilot-studio-memory.webp',
    sourceImageAlt:
      'Visuel Microsoft montrant l’activation de la mémoire et la gestion des souvenirs dans Copilot Studio.',
    figureCaption: 'Compte propre · Mémoire · Déclencheurs',
    figureAside: 'Frontier · expérimental',
    sources: [
      {
        label: 'Annonce Microsoft · 15/10',
        url: 'https://www.microsoft.com/en-us/copilot/blog/copilot-studio/delegate-shared-business-processes-to-agents-that-are-more-persistent-and-proactive-with-microsoft-copilot-studio/',
      },
      {
        label: 'Programme Frontier',
        url: 'https://www.microsoft.com/en-us/copilot/resources/frontier-features?sortBy=newest-oldest#All-Frontier-features',
      },
    ],
  },
  {
    id: 'anthropic-employment',
    kind: 'radar-story',
    chapter: 'Radar',
    title: 'Comment l’IA transforme Anthropic',
    subtitle: 'Comment forme-t-on les futurs seniors à l’ère des agents IA ?',
    date: '16 octobre 2026',
    illustration: './assets/radar-v1.webp',
    points: [
      ['6 ×', 'Heures d’exécution des agents / heures humaines estimées'],
      ['> ½ semaine', 'Pour lire toutes les réponses, même hors métiers techniques'],
      ['27 % → 9 %', 'Part des juniors dans les recrutements techniques'],
    ],
    availability: 'Étude interne · heures ≠ travail utile · lecture théorique · part des embauches',
    sources: [
      {
        label: 'Étude Anthropic · 16/10',
        url: 'https://www.anthropic.com/research/employment-at-anthropic',
      },
    ],
    notes: [
      {
        title: '1. L’accroche · 1 minute',
        text: 'On parle souvent de ce que l’IA va changer dans nos métiers. Regardons comment on travaille chez son fabricant. L’étude s’appuie sur des données internes et 17 entretiens. Question de départ : aimerait-on travailler dans une entreprise organisée autour des agents ?',
      },
      {
        title: '2. Un salarié entouré d’agents · 2 minutes',
        text: 'Le ratio de six concerne août 2026 : durées d’exécution des agents comparées à 40 heures hebdomadaires supposées par salarié, sans équivalence de travail utile. Situation imaginaire : cinq tâches lancées, trois agents demandent une décision. Que vérifier personnellement ? Lou, Loïc : passez-vous davantage de temps à faire, à expliquer ou à vérifier ?',
      },
      {
        title: '3. Le temps gagné devient-il du temps de lecture ? · 2 minutes',
        text: 'La demi-semaine est une estimation de lecture des sorties, pas un temps observé. Nico : raconter un exemple réel sur Sillage où une réponse a aidé ou ralenti une décision. Que devrait montrer un agent : résultat, doutes, preuves ? Qui contrôle l’agent vérificateur ? À quel moment valide-t-on sans lire ?',
      },
      {
        title: '4. Comment former les futurs seniors ? · 3 minutes',
        text: '27 % à 9 % décrit une proportion d’embauches techniques, pas des licenciements. Quelles tâches nous ont appris notre métier ? Les déléguerions-nous aujourd’hui ? Peut-on reconnaître une mauvaise solution sans en avoir construit ? Un junior avec une IA et un mentor apprendrait-il plus vite ? Demain, recruterions-nous un senior seul avec des agents, ou un senior et un junior équipé ?',
      },
      {
        title: '5. Est-ce transposable ailleurs ? · 1 à 2 minutes',
        text: 'Anthropic étudie sa propre organisation et vend les outils concernés ; l’adoption n’est pas randomisée. Imaginons une agence de dix personnes, une mairie ou un commerce. Qu’est-ce qui serait utile demain ? Qui configurerait et contrôlerait les outils ? Quelles décisions garder collectives ? Ces questions sont des pistes de débat, pas des conclusions de l’étude.',
      },
      {
        title: '6. Terminer sur un choix · 1 minute',
        text: 'Si l’IA vous faisait gagner deux heures par jour, voudriez-vous produire davantage, apprendre autre chose ou travailler moins ? Qui déciderait ? Aux auditeurs : quelle tâche délégueriez-vous immédiatement et laquelle garderiez-vous pour continuer à apprendre ?',
      },
    ],
  },
  {
    id: 'voxtral-3',
    kind: 'radar-story',
    chapter: 'Radar',
    title: 'Voxtral 3 : Mistral assemble écoute, raisonnement et parole',
    date: '20 octobre 2026',
    illustration: './assets/radar-v1.webp',
    sourceImage: './assets/voxtral-3-pipeline.svg',
    sourceImageAlt:
      'Schéma du SDK Voice Agents : transcription Voxtral, raisonnement par un modèle de langage avec outils, puis synthèse vocale Voxtral.',
    figureCaption:
      'Le SDK Voice Agents relie transcription, raisonnement et réponse parlée en temps réel.',
    figureAside: 'Modèles audio en préversion publique',
    question: 'Dans une entreprise, quelles tâches vocales laisseriez-vous un agent accomplir ?',
    sources: [
      {
        label: 'Annonce Mistral · 20/10',
        url: 'https://mistral.ai/news/voxtral-3/',
      },
      {
        label: 'Documentation Mistral · Audio',
        url: 'https://docs.mistral.ai/studio/audio/overview',
      },
    ],
  },
  {
    id: 'talk',
    kind: 'lobby',
    chapter: 'Talk',
    title: 'Talk',
    sequence: 3,
    illustration: './assets/talk-lobby-v1.webp',
  },
  {
    id: 'talk-case',
    kind: 'talk-case',
    chapter: 'Talk',
    title: 'J’ai intégré l’ensemble de notre catalogue produits dans un agent.',
    question: 'Qu’est-ce que ça permet aux équipes ?',
    illustration: './assets/talk-case-v1.webp',
  },
  {
    id: 'clash',
    kind: 'lobby',
    chapter: 'Clash',
    title: 'Clash',
    sequence: 4,
    illustration: './assets/clash-lobby-v1.webp',
  },
  {
    id: 'clash-question',
    kind: 'clash-question',
    chapter: 'Clash',
    title:
      'En entreprise, peut-on vraiment mettre en production un produit développé en vibe coding ?',
    illustration: './assets/clash-question-v1.webp',
  },
];

export function sceneIndex(hash, slides = scenes) {
  const anchor = hash.replace(/^#/, '');
  const index = slides.findIndex((slide) => slide.id === anchor);
  if (index >= 0) return index;
  const numeric = Number(anchor) - 1;
  return Number.isInteger(numeric) && numeric >= 0 && numeric < slides.length ? numeric : 0;
}
