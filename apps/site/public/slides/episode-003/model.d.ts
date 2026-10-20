export interface Slide {
  id: string;
  kind: 'lobby' | 'radar-story' | 'talk-case' | 'clash-question';
  chapter: string;
  title: string;
  sequence?: number;
  question?: string;
  illustration: string;
  subtitle?: string;
  date?: string;
  points?: string[][];
  availability?: string;
  upcoming?: string;
  sourceImage?: string;
  sourceImageAlt?: string;
  sources?: { label: string; url: string }[];
}

export const scenes: Slide[];
export function sceneIndex(hash: string, slides?: Slide[]): number;
