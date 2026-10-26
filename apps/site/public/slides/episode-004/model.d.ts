export interface Source {
  label: string;
  title: string;
  url: string;
}

export interface Slide {
  id: string;
  chapter: 'Talk' | 'Radar';
  kind:
    | 'opening'
    | 'prototype'
    | 'handoff'
    | 'agents'
    | 'tickets'
    | 'debate'
    | 'radar-context'
    | 'radar-workflow'
    | 'radar-results';
  label: string;
  title: string;
  subtitle: string;
  sources: Source[];
  notes: string[];
}

export const scenes: Slide[];
export const talkScenes: Slide[];
export const radarScenes: Slide[];
export function sceneIndex(hash: string, slides?: Slide[]): number;
