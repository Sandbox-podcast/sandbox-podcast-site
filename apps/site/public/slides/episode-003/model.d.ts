export interface Slide {
  id: string;
  kind: 'lobby' | 'radar-story' | 'talk-case' | 'talk-trend' | 'clash-question';
  chapter: string;
  title: string;
  sequence?: number;
  question?: string;
  takeaway?: string;
  illustration: string;
  subtitle?: string;
  date?: string;
  points?: string[][];
  availability?: string;
  upcoming?: string;
  sourceImage?: string;
  sourceImageAlt?: string;
  figureCaption?: string;
  figureAside?: string;
  sources?: { label: string; url: string }[];
  notes?: { title: string; text: string }[];
}

export const scenes: Slide[];
export function sceneIndex(hash: string, slides?: Slide[]): number;
