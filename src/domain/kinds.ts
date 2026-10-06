import type { MentionKind } from './schema.ts';

/** Ordre et libellés des types de mentions dans les show notes d'un épisode. */
export const MENTION_KINDS: { kind: MentionKind; label: string; tag: string }[] = [
  { kind: 'repo', label: 'Repositories GitHub', tag: 'REPO' },
  { kind: 'model', label: 'Modèles', tag: 'MODEL' },
  { kind: 'tool', label: 'Outils', tag: 'TOOL' },
  { kind: 'product', label: 'Produits', tag: 'PRODUCT' },
  { kind: 'paper', label: 'Papers', tag: 'PAPER' },
  { kind: 'article', label: 'Articles', tag: 'ARTICLE' },
  { kind: 'video', label: 'Vidéos', tag: 'VIDEO' },
  { kind: 'tweet', label: 'Tweets', tag: 'TWEET' },
  { kind: 'benchmark', label: 'Benchmarks', tag: 'BENCH' },
  { kind: 'site', label: 'Sites', tag: 'SITE' },
];

export const mentionTag = (kind: MentionKind): string =>
  MENTION_KINDS.find((k) => k.kind === kind)?.tag ?? kind.toUpperCase();
