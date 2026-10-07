import { formatByUnit, formatDelta, ordinal } from './format.ts';
import type { Movement, ScoringProfile, SnapshotEntry } from './schema.ts';

/**
 * « Pourquoi ça bouge » : explication générée à partir des chiffres, rien d'autre.
 * C'est de la DATA (provenance dérivée), à ne jamais confondre avec OUR TAKE qui est écrit par l'équipe.
 */

export interface ExplanationFact {
  label: string;
  value: string;
  /** Variation par rapport à la semaine précédente, déjà formatée. */
  change?: string;
  direction?: 'up' | 'down' | 'flat';
}

export interface Explanation {
  headline: string;
  facts: ExplanationFact[];
}

interface ExplainInput {
  profile: ScoringProfile;
  entry: SnapshotEntry;
  previous: SnapshotEntry | undefined;
  movement: Movement;
  /** Toutes les entrées de la semaine, pour situer l'entité dans le pool. */
  pool: readonly SnapshotEntry[];
}

const NNBSP = String.fromCharCode(0x202f);

const sign = (n: number): 'up' | 'down' | 'flat' => (n > 0.05 ? 'up' : n < -0.05 ? 'down' : 'flat');

export function explainMovement({
  profile,
  entry,
  previous,
  movement,
  pool,
}: ExplainInput): Explanation {
  const dims = profile.dimensions.filter((d) => d.id !== profile.primary);
  const labelOf = (id: string): string => profile.dimensions.find((d) => d.id === id)?.label ?? id;

  const deltas = dims.flatMap((d) => {
    const now = entry.dimensions[d.id];
    const before = previous?.dimensions[d.id];
    return now === undefined || before === undefined
      ? []
      : [{ id: d.id, now, delta: now - before }];
  });

  // Le moteur d'un mouvement : la dimension qui a le plus bougé dans le sens du mouvement.
  let driver: { id: string; now: number; delta: number } | undefined;
  if (previous && deltas.length > 0) {
    const pick = (cmp: (a: number, b: number) => boolean) =>
      deltas.reduce((best, d) => (cmp(d.delta, best.delta) ? d : best));
    driver =
      movement.kind === 'down'
        ? pick((a, b) => a < b)
        : movement.kind === 'stable'
          ? deltas.reduce((best, d) => (Math.abs(d.delta) > Math.abs(best.delta) ? d : best))
          : pick((a, b) => a > b);
  }

  const bestDim = dims
    .flatMap((d) => {
      const v = entry.dimensions[d.id];
      return v === undefined ? [] : [{ id: d.id, v }];
    })
    .sort((a, b) => b.v - a.v)[0];

  const poolRank = (dimension: string): number => {
    const value = entry.dimensions[dimension] ?? 0;
    return 1 + pool.filter((e) => (e.dimensions[dimension] ?? 0) > value).length;
  };

  const facts: ExplanationFact[] = [];
  if (driver) {
    const dimension = dims.find((d) => d.id === driver.id);
    // Les métriques qui composent la dimension, de la plus lourde à la plus légère.
    const metricKeys = (dimension?.components ?? [])
      .flatMap((c) => (c.type === 'metric' ? [{ key: c.metric, weight: c.weight }] : []))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2);
    for (const { key } of metricKeys) {
      const def = [...profile.metrics, ...profile.derived].find((m) => m.key === key);
      const now = entry.metrics[key];
      const before = previous?.metrics[key];
      if (!def || now === undefined) continue;
      const fact: ExplanationFact = {
        label: def.label,
        value: formatByUnit(now, def.unit, def.decimals),
      };
      if (before !== undefined && before !== 0) {
        const pct = ((now - before) / Math.abs(before)) * 100;
        fact.change = `${formatDelta(Math.round(pct))}${NNBSP}%`;
        fact.direction = sign(pct);
      }
      facts.push(fact);
    }
  }

  const placeWord = (n: number): string => `${String(n)} place${n > 1 ? 's' : ''}`;
  switch (movement.kind) {
    case 'new': {
      const best = bestDim
        ? `${labelOf(bestDim.id)} (${ordinal(poolRank(bestDim.id))} du pool)`
        : null;
      return {
        headline: best
          ? `Première entrée au Top, à la ${ordinal(movement.rank)} place. Point fort : ${best}.`
          : `Première entrée au Top, à la ${ordinal(movement.rank)} place.`,
        facts,
      };
    }
    case 're':
      return {
        headline: `Retour au Top à la ${ordinal(movement.rank)} place${
          movement.previousRank
            ? ` (${ordinal(movement.previousRank)} du pool la semaine passée)`
            : ''
        }.`,
        facts,
      };
    case 'up':
      return {
        headline: driver
          ? `+${placeWord(movement.delta)}, porté par ${labelOf(driver.id)} : ${String(Math.round(driver.now))} (${formatDelta(Math.round(driver.delta))} pts).`
          : `+${placeWord(movement.delta)}.`,
        facts,
      };
    case 'down':
      return {
        headline: driver
          ? `−${placeWord(-movement.delta)}, freiné par ${labelOf(driver.id)} : ${String(Math.round(driver.now))} (${formatDelta(Math.round(driver.delta))} pts).`
          : `−${placeWord(-movement.delta)}.`,
        facts,
      };
    case 'stable':
      return {
        headline: driver
          ? `Place inchangée ; ${labelOf(driver.id)} ${String(Math.round(driver.now))} (${formatDelta(Math.round(driver.delta))} pts).`
          : 'Place inchangée.',
        facts,
      };
  }
}
