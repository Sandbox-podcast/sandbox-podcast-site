import type { Component, DerivedMetricDef, Dimension, Scale, ScoringProfile } from './schema.ts';

/**
 * Scoring : des métriques brutes à des sous-scores de 0 à 100, puis à une note principale.
 * Fonctions pures : la même entrée donne toujours le même classement, c'est ce qui permet de rejouer une semaine.
 */

export type Metrics = Record<string, number>;

export interface Candidate {
  entity: string;
  metrics: Metrics;
}

export interface ScoredCandidate extends Candidate {
  /** Métriques brutes + dérivées. */
  metrics: Metrics;
  /** Un score de 0 à 100 par dimension du profil. */
  dimensions: Record<string, number>;
  score: number;
}

const round = (n: number, decimals: number): number => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Ajoute les métriques dérivées. Une valeur manquante rend la dérivée absente, jamais 0. */
export function withDerived(metrics: Metrics, derived: readonly DerivedMetricDef[]): Metrics {
  const out: Metrics = { ...metrics };
  for (const def of derived) {
    if (def.kind === 'ratio') {
      const num = out[def.numerator];
      const den = out[def.denominator];
      if (num === undefined || den === undefined || den === 0) continue;
      out[def.key] = round((num / den) * def.scale, def.decimals);
    } else {
      let sum = 0;
      let complete = true;
      for (const term of def.terms) {
        const v = out[term.metric];
        if (v === undefined) {
          complete = false;
          break;
        }
        sum += v * term.weight;
      }
      if (complete) out[def.key] = round(sum / def.divisor, def.decimals);
    }
  }
  return out;
}

const transformed = (value: number, transform: 'linear' | 'log'): number =>
  transform === 'log' ? Math.log10(Math.max(value, 0) + 1) : value;

function scaleValue(value: number, scale: Scale, poolValues: readonly number[]): number {
  switch (scale.kind) {
    case 'identity':
      return clamp(value, 0, 100);
    case 'range': {
      const lo = transformed(scale.min, scale.transform);
      const hi = transformed(scale.max, scale.transform);
      const t = hi === lo ? 0.5 : (transformed(value, scale.transform) - lo) / (hi - lo);
      return clamp((scale.invert ? 1 - t : t) * 100, 0, 100);
    }
    case 'pool': {
      const values = poolValues.map((v) => transformed(v, scale.transform));
      const lo = Math.min(...values);
      const hi = Math.max(...values);
      const t = hi === lo ? 0.5 : (transformed(value, scale.transform) - lo) / (hi - lo);
      return clamp((scale.invert ? 1 - t : t) * 100, 0, 100);
    }
  }
}

interface Resolved {
  dimensions: Record<string, number>;
  /** Composants ignorés faute de donnée : la note est alors calculée sur les composants présents. */
  missing: string[];
}

function evaluateDimension(
  dimension: Dimension,
  candidate: Candidate,
  pool: readonly Candidate[],
  already: Record<string, number>,
): { score: number | null; missing: string[] } {
  let weighted = 0;
  let weights = 0;
  const missing: string[] = [];
  for (const component of dimension.components) {
    const value = componentScore(component, candidate, pool, already);
    if (value === undefined) {
      missing.push(component.type === 'metric' ? component.metric : component.dimension);
      continue;
    }
    weighted += value * component.weight;
    weights += component.weight;
  }
  // Aucune donnée pour cette dimension : elle est absente, pas égale à 0 (un modèle sans vision n'a pas 0 en multimodal).
  return { score: weights === 0 ? null : weighted / weights, missing };
}

function componentScore(
  component: Component,
  candidate: Candidate,
  pool: readonly Candidate[],
  already: Record<string, number>,
): number | undefined {
  if (component.type === 'dimension') return already[component.dimension];
  const value = candidate.metrics[component.metric];
  if (value === undefined) return undefined;
  const poolValues = pool.flatMap((c) => {
    const v = c.metrics[component.metric];
    return v === undefined ? [] : [v];
  });
  return scaleValue(value, component.scale, poolValues);
}

/** Évalue toutes les dimensions d'un candidat. */
export function scoreCandidate(
  candidate: Candidate,
  pool: readonly Candidate[],
  profile: ScoringProfile,
): Resolved {
  const dimensions: Record<string, number> = {};
  const missing: string[] = [];
  for (const dimension of profile.dimensions) {
    const result = evaluateDimension(dimension, candidate, pool, dimensions);
    if (result.score !== null) dimensions[dimension.id] = round(result.score, 1);
    missing.push(...result.missing);
  }
  return { dimensions, missing };
}

/** Note tous les candidats d'un pool. Les dérivées sont calculées ici, une seule fois. */
export function scorePool(
  candidates: readonly Candidate[],
  profile: ScoringProfile,
): ScoredCandidate[] {
  const enriched = candidates.map((c) => ({
    entity: c.entity,
    metrics: withDerived(c.metrics, profile.derived),
  }));
  return enriched.map((candidate) => {
    const { dimensions } = scoreCandidate(candidate, enriched, profile);
    const score = dimensions[profile.primary];
    if (score === undefined) {
      throw new Error(
        `Note principale (${profile.primary}) indisponible pour ${candidate.entity} : données manquantes`,
      );
    }
    return { ...candidate, dimensions, score };
  });
}

/** Libellés lisibles de tous les composants d'une dimension, pour la page « méthodologie ». */
export function describeDimension(
  dimension: Dimension,
  profile: ScoringProfile,
): { label: string; weightPct: number; detail: string }[] {
  const total = dimension.components.reduce((s, c) => s + c.weight, 0);
  return dimension.components.map((c) => {
    const weightPct = Math.round((c.weight / total) * 100);
    if (c.type === 'dimension') {
      const ref = profile.dimensions.find((d) => d.id === c.dimension);
      return { label: ref?.label ?? c.dimension, weightPct, detail: 'sous-score composite' };
    }
    const def =
      profile.metrics.find((m) => m.key === c.metric) ??
      profile.derived.find((m) => m.key === c.metric);
    return { label: def?.label ?? c.metric, weightPct, detail: describeScale(c.scale) };
  });
}

export function describeScale(scale: Scale): string {
  switch (scale.kind) {
    case 'identity':
      return 'valeur telle quelle (déjà sur 100)';
    case 'range': {
      const how = scale.transform === 'log' ? 'échelle logarithmique' : 'échelle linéaire';
      const dir = scale.invert ? ', inversée (plus bas = mieux)' : '';
      return `${how} entre ${String(scale.min)} (0) et ${String(scale.max)} (100)${dir}`;
    }
    case 'pool': {
      const how = scale.transform === 'log' ? 'logarithmique' : 'linéaire';
      const dir = scale.invert ? ', inversée' : '';
      return `relatif aux candidats de la semaine (min–max ${how}${dir})`;
    }
  }
}
