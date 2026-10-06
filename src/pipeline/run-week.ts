import { buildSnapshot } from '../domain/ranking.ts';
import type { ChartDef, Entity, ScoringProfile, Snapshot } from '../domain/schema.ts';
import { snapshotSchema } from '../domain/schema.ts';
import { previousWeek } from '../domain/weeks.ts';
import type { Connector } from './connector.ts';

/**
 * Mise à jour hebdomadaire d'un classement :
 *   1. récupérer les candidats (connecteur) ;
 *   2. recalculer scores et rangs (domaine) ;
 *   3. produire le snapshot, qui sera écrit tel quel dans `data/snapshots/` puis ne bougera plus.
 * Les mouvements (UP, DOWN, NEW, OUT) ne sont pas stockés : ils se déduisent de deux snapshots consécutifs.
 */
export interface RunWeekInput {
  chart: ChartDef;
  profile: ScoringProfile;
  entities: readonly Entity[];
  week: string;
  connector: Connector;
  publishedAt: string;
}

export interface RunWeekResult {
  snapshot: Snapshot;
  /** Candidats attendus mais absents de la source. */
  missing: string[];
  /** Semaine précédente attendue : le pipeline refuse d'écraser un snapshot déjà publié (voir `assertAppendOnly`). */
  expectedPrevious: string;
}

export async function runWeek(input: RunWeekInput): Promise<RunWeekResult> {
  const batch = await input.connector.fetchCandidates({
    week: input.week,
    chart: input.chart,
    entities: input.entities,
  });
  if (batch.candidates.length < input.chart.size) {
    throw new Error(
      `${input.chart.slug} ${input.week} : ${String(batch.candidates.length)} candidats pour ${String(input.chart.size)} places. Classement non publiable.`,
    );
  }
  const snapshot = buildSnapshot({
    chart: input.chart.slug,
    week: input.week,
    publishedAt: input.publishedAt,
    retrievedAt: batch.retrievedAt,
    provenance: batch.provenance,
    candidates: batch.candidates,
    profile: input.profile,
    tiebreak: input.chart.tiebreak,
  });
  // Le résultat doit respecter le contrat de stockage avant d'être écrit.
  return {
    snapshot: snapshotSchema.parse(snapshot),
    missing: batch.missing,
    expectedPrevious: previousWeek(input.week),
  };
}

/** Un snapshot publié est immuable : on refuse d'en écrire un second pour la même semaine et le même classement. */
export function assertAppendOnly(existingWeeks: readonly string[], week: string): void {
  if (existingWeeks.includes(week)) {
    throw new Error(
      `Le snapshot ${week} existe déjà : un snapshot publié ne se modifie pas. Corrigez par une note éditoriale ou publiez la semaine suivante.`,
    );
  }
}
