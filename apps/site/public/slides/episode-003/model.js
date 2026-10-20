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
