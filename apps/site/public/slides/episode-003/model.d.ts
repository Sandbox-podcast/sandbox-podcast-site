export interface Slide {
  id: string;
  kind: 'lobby' | 'talk-case' | 'clash-question';
  chapter: string;
  title: string;
  sequence?: number;
  question?: string;
  illustration: string;
}

export const scenes: Slide[];
export function sceneIndex(hash: string, slides?: Slide[]): number;
