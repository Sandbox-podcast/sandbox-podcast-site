import type episode from './content.json';
import type shorts from './shorts.json';
import type rundown from './rundown.json';

export interface Scene {
  id: string;
  kind: string;
  chapter: string;
  title: string;
  image?: string;
  durationMinutes?: number;
  topicId?: string;
}

export type Decision = 'pending' | 'keep' | 'reserve' | 'drop';
export const decisions: Decision[];
export function isSelectable(scene: Scene): boolean;
export function buildShortScenes(content: typeof shorts): Scene[];
export function buildScenes(content: typeof episode): Scene[];
export function buildEpisodeScenes(content: typeof episode, timing: typeof rundown): Scene[];
export function sceneIndex(hash: string, scenes: Scene[]): number;
export function restoreChoices(value: unknown, scenes: Scene[]): Record<string, Decision>;
