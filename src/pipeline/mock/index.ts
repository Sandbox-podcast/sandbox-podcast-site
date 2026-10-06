import type { Candidate } from '../../domain/scoring.ts';
import { addWeeks, compareWeeks, weekStart } from '../../domain/weeks.ts';
import type { CandidateBatch, Connector, WeekContext } from '../connector.ts';
import { GITHUB_POOLS, REPO_SERIES, repoMetricsAt } from './github.ts';
import { MODEL_SERIES, modelMetricsAt } from './models.ts';

/** Première semaine de l'historique de démonstration. */
export const MOCK_FIRST_WEEK = '2026-W26';

const DAY_MS = 86_400_000;

export function mockWeekIndex(week: string): number {
  return Math.round(
    (weekStart(week).getTime() - weekStart(MOCK_FIRST_WEEK).getTime()) / (7 * DAY_MS),
  );
}

/** Relevé simulé : le mardi à 06 h UTC, une heure avant la publication. */
export function mockRetrievedAt(week: string): string {
  return new Date(weekStart(week).getTime() + DAY_MS + 6 * 3_600_000).toISOString();
}

export function mockPublishedAt(week: string): string {
  return new Date(weekStart(week).getTime() + DAY_MS + 7 * 3_600_000).toISOString();
}

/**
 * Connecteur de démonstration : produit les mêmes candidats qu'un vrai connecteur le ferait, depuis des séries
 * déterministes. Il est le seul connecteur actif tant que `dataMode` vaut `mock`.
 */
export const mockConnector: Connector = {
  id: 'mock',
  fetchCandidates(context: WeekContext): CandidateBatch {
    const index = mockWeekIndex(context.week);
    if (index < 0) throw new Error(`Pas de données de démonstration avant ${MOCK_FIRST_WEEK}`);
    const candidates: Candidate[] = [];

    if (context.chart.entityKind === 'project') {
      const pool = GITHUB_POOLS[context.chart.slug];
      if (!pool) throw new Error(`Pas de pool de démonstration pour ${context.chart.slug}`);
      for (const entity of pool) {
        const series = REPO_SERIES.find((s) => s.entity === entity);
        if (!series) throw new Error(`Série GitHub manquante : ${entity}`);
        candidates.push({ entity, metrics: repoMetricsAt(series, index) });
      }
    } else {
      for (const entity of context.entities) {
        if (entity.kind !== 'model') continue;
        if (context.chart.pool === 'openWeights' && !entity.openWeights) continue;
        const series = MODEL_SERIES.find((s) => s.entity === entity.slug);
        if (!series) throw new Error(`Série de modèle manquante : ${entity.slug}`);
        if (series.since > index) continue;
        candidates.push({ entity: entity.slug, metrics: modelMetricsAt(series, index) });
      }
    }

    return {
      provenance: 'mock',
      retrievedAt: mockRetrievedAt(context.week),
      candidates,
      missing: [],
    };
  },
};

/** Semaines à générer : de la première semaine de démonstration (ou `from`) à `to` inclus. */
export function mockWeeks(to: string, from: string = MOCK_FIRST_WEEK): string[] {
  const out: string[] = [];
  for (let w = from; compareWeeks(w, to) <= 0; w = addWeeks(w, 1)) out.push(w);
  return out;
}
