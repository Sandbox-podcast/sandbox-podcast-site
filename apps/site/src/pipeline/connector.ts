import type { ChartDef, Entity, Provenance } from '../domain/schema.ts';
import type { Candidate } from '../domain/scoring.ts';

/**
 * Contrat d'un connecteur de données : il rapporte des métriques brutes pour les candidats d'un classement,
 * sans les noter ni les classer (c'est le rôle du domaine). Le pipeline hebdomadaire ne connaît que cette interface.
 *
 * Connecteurs prévus (aucun n'est branché à ce jour, voir docs/site/data-strategy.md) :
 * - `github`      : API REST GitHub (stars, forks, contributeurs, commits) et historique d'étoiles ;
 * - `huggingface` : API Hub (téléchargements, likes, licence) pour les modèles open weights ;
 * - `leaderboard` : exports de classements publics de benchmarks ;
 * - `mock`        : données de démonstration, seul connecteur actif.
 */
export interface WeekContext {
  week: string;
  chart: ChartDef;
  entities: readonly Entity[];
}

export interface CandidateBatch {
  provenance: Provenance;
  retrievedAt: string;
  candidates: Candidate[];
  /** Candidats pour lesquels la source n'a rien rendu : signalés, jamais complétés par une valeur inventée. */
  missing: string[];
}

export interface Connector {
  readonly id: string;
  fetchCandidates(context: WeekContext): Promise<CandidateBatch> | CandidateBatch;
}
