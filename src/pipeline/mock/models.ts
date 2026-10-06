import type { Metrics } from '../../domain/scoring.ts';
import { noise } from './util.ts';

/**
 * Données de modèles de DÉMONSTRATION. Aucune de ces valeurs ne vient d'un benchmark ni d'une API :
 * elles servent à montrer la mécanique (scores, tris, mouvements) avec des ordres de grandeur plausibles.
 * `since` est la semaine (depuis la S26) à laquelle le modèle entre dans le pool suivi.
 */
export interface ModelSeries {
  entity: string;
  since: number;
  base: Metrics;
  /** Révisions : à partir de la semaine `from`, ces valeurs remplacent les précédentes. */
  revisions: { from: number; set: Metrics }[];
}

/** swebench, livecodebench, gpqa, hle, aime, terminalbench, taubench, mmmu (null si texte seul), mrcr, contexte (k), tok/s, $ entrée, $ sortie */
const m = (
  swebench: number,
  livecodebench: number,
  gpqa: number,
  hle: number,
  aime: number,
  terminalbench: number,
  taubench: number,
  mmmu: number | null,
  mrcr: number,
  contextK: number,
  tps: number,
  priceIn: number,
  priceOut: number,
): Metrics => ({
  swebench,
  livecodebench,
  gpqa,
  hle,
  aime,
  terminalbench,
  taubench,
  ...(mmmu === null ? {} : { mmmu }),
  mrcr,
  contextK,
  tps,
  priceIn,
  priceOut,
});

// prettier-ignore
export const MODEL_SERIES: readonly ModelSeries[] = [
  { entity: 'claude-opus-5-5', since: 0, base: m(74, 78, 87, 31, 92, 50, 78, 80, 82, 1000, 55, 5, 25), revisions: [{ from: 4, set: { swebench: 80, terminalbench: 55, taubench: 82 } }, { from: 9, set: { swebench: 82, terminalbench: 58, taubench: 84 } }] },
  { entity: 'claude-fable-5-1', since: 11, base: m(85, 80, 89, 35, 94, 62, 87, 82, 85, 1000, 48, 8, 40), revisions: [] },
  { entity: 'claude-sonnet-5-5', since: 0, base: m(72, 75, 84, 26, 88, 48, 76, 77, 78, 1000, 85, 3, 15), revisions: [{ from: 8, set: { swebench: 79, terminalbench: 52, taubench: 82 } }] },
  { entity: 'gpt-5-2', since: 0, base: m(76, 82, 88, 34, 96, 52, 80, 81, 80, 400, 70, 2.5, 20), revisions: [{ from: 9, set: { priceIn: 1.75, priceOut: 14 } }, { from: 13, set: { swebench: 81, terminalbench: 57 } }] },
  { entity: 'gemini-3-pro', since: 0, base: m(64, 80, 88, 36, 94, 44, 70, 86, 88, 1000, 110, 2, 12), revisions: [{ from: 10, set: { swebench: 76, taubench: 78, terminalbench: 49 } }, { from: 15, set: { swebench: 81, terminalbench: 57, taubench: 85 } }] },
  { entity: 'gemini-3-flash', since: 0, base: m(62, 72, 80, 22, 86, 36, 68, 78, 80, 1000, 210, 0.5, 3), revisions: [{ from: 11, set: { swebench: 70, terminalbench: 40, taubench: 72 } }] },
  { entity: 'grok-4', since: 0, base: m(60, 77, 85, 30, 93, 38, 70, 72, 70, 256, 65, 3, 15), revisions: [{ from: 5, set: { swebench: 68, terminalbench: 42 } }] },
  { entity: 'kimi-k2', since: 0, base: m(65, 66, 78, 20, 80, 40, 72, null, 62, 256, 40, 0.6, 2.5), revisions: [{ from: 13, set: { swebench: 70, aime: 86, hle: 24 } }] },
  { entity: 'deepseek-v3-2', since: 3, base: m(66, 71, 82, 23, 89, 41, 68, null, 62, 128, 20, 0.28, 0.42), revisions: [{ from: 12, set: { swebench: 69 } }, { from: 14, set: { tps: 35 } }] },
  { entity: 'deepseek-r1', since: 0, base: m(50, 65, 76, 14, 80, 25, 55, null, 50, 128, 30, 0.55, 2.2), revisions: [] },
  { entity: 'deepseek-v3', since: 0, base: m(42, 56, 68, 7, 55, 18, 52, null, 52, 128, 40, 0.27, 1.1), revisions: [] },
  { entity: 'qwen3-235b', since: 0, base: m(56, 70, 79, 18, 85, 30, 66, null, 60, 256, 55, 0.22, 0.88), revisions: [{ from: 14, set: { swebench: 64, gpqa: 82, aime: 90 } }] },
  { entity: 'qwen3-coder', since: 7, base: m(60, 65, 72, 12, 70, 38, 62, null, 55, 256, 60, 0.3, 1.2), revisions: [{ from: 12, set: { swebench: 67 } }] },
  { entity: 'qwen3-32b', since: 0, base: m(38, 55, 65, 8, 78, 14, 48, null, 45, 128, 80, 0.08, 0.24), revisions: [] },
  { entity: 'glm-4-6', since: 6, base: m(62, 69, 80, 22, 86, 40, 71, null, 58, 200, 50, 0.5, 1.75), revisions: [{ from: 9, set: { swebench: 66 } }] },
  { entity: 'minimax-m2', since: 8, base: m(62, 70, 78, 20, 82, 42, 72, null, 55, 200, 75, 0.3, 1.2), revisions: [{ from: 10, set: { swebench: 68 } }] },
  { entity: 'gpt-oss-120b', since: 4, base: m(58, 68, 80, 19, 90, 32, 60, null, 52, 128, 130, 0.15, 0.6), revisions: [{ from: 15, set: { swebench: 68, terminalbench: 45, taubench: 70 } }] },
  { entity: 'llama-4-maverick', since: 0, base: m(40, 50, 69, 5, 45, 15, 50, 73, 57, 1000, 120, 0.27, 0.85), revisions: [] },
  { entity: 'mistral-large-3', since: 5, base: m(58, 62, 74, 10, 72, 28, 60, 68, 58, 256, 70, 0.5, 1.5), revisions: [] },
  { entity: 'mistral-small-3', since: 0, base: m(33, 42, 46, 3, 35, 10, 42, null, 40, 32, 150, 0.05, 0.08), revisions: [] },
  { entity: 'gemma-3-27b', since: 0, base: m(25, 40, 55, 4, 30, 8, 35, 64, 40, 128, 60, 0.1, 0.2), revisions: [] },
  { entity: 'llama-3-3-70b', since: 0, base: m(28, 40, 50, 4, 30, 8, 40, null, 45, 128, 90, 0.1, 0.32), revisions: [] },
  { entity: 'phi-4', since: 0, base: m(22, 45, 56, 4, 50, 6, 30, null, 30, 16, 60, 0.07, 0.14), revisions: [] },
  { entity: 'olmo-3', since: 12, base: m(30, 45, 58, 4, 55, 10, 38, null, 38, 64, 45, 0.2, 0.5), revisions: [] },
  { entity: 'nemotron-ultra', since: 15, base: m(52, 62, 76, 12, 80, 28, 60, null, 55, 128, 45, 0.6, 1.8), revisions: [] },
];

export function modelMetricsAt(series: ModelSeries, weekIndex: number): Metrics {
  let metrics: Metrics = { ...series.base };
  for (const revision of series.revisions) {
    if (revision.from <= weekIndex) metrics = { ...metrics, ...revision.set };
  }
  // La vitesse mesurée fluctue d'une semaine à l'autre ; les benchmarks, non.
  const tps = metrics['tps'];
  if (tps !== undefined) metrics['tps'] = Math.round(tps * noise(series.entity, weekIndex, 0.04));
  return metrics;
}
