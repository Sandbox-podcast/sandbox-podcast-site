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
