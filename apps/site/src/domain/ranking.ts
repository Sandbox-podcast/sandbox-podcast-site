import type { Provenance, ScoringProfile, Snapshot, SnapshotEntry } from './schema.ts';
import { scorePool, type Candidate, type ScoredCandidate } from './scoring.ts';

/** Classe des candidats notés : note principale décroissante, puis métrique de départage, puis identifiant. */
export function rankScored(scored: readonly ScoredCandidate[], tiebreak: string): SnapshotEntry[] {
  const sorted = [...scored].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const tb = (b.metrics[tiebreak] ?? 0) - (a.metrics[tiebreak] ?? 0);
    if (tb !== 0) return tb;
    return a.entity < b.entity ? -1 : a.entity > b.entity ? 1 : 0;
  });
  return sorted.map((c, i) => ({
    entity: c.entity,
    rank: i + 1,
    score: Math.round(c.score * 10) / 10,
    dimensions: c.dimensions,
    metrics: c.metrics,
  }));
}

export interface BuildSnapshotInput {
  chart: string;
  week: string;
  publishedAt: string;
  retrievedAt: string;
  provenance: Provenance;
  candidates: readonly Candidate[];
  profile: ScoringProfile;
  tiebreak: string;
}

/** Recalcule un classement complet à partir des candidats de la semaine. */
export function buildSnapshot(input: BuildSnapshotInput): Snapshot {
  const scored = scorePool(input.candidates, input.profile);
  return {
    chart: input.chart,
    week: input.week,
    publishedAt: input.publishedAt,
    retrievedAt: input.retrievedAt,
    provenance: input.provenance,
    entries: rankScored(scored, input.tiebreak),
  };
}
