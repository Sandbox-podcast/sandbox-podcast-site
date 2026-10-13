import { verifyReferenceArtifact, type ReferenceArtifact } from './reference-artifact.ts';
import { isCalendarEdition, isoWeekOf } from '../domain/weeks.ts';

export function reviewedReferenceVersion(
  version: string,
  configured = process.env['CHARTS_REVIEWED_PROFILE_VERSIONS'] ?? '',
): boolean {
  return configured
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(version);
}

export function validateReferenceEdition(
  config: Record<string, unknown>,
  chart: string,
  date: string,
  version: string,
  entries: readonly { entity: string; rank: number; score: number }[],
): ReferenceArtifact {
  const artifact = verifyReferenceArtifact(config['referenceRanking']);
  const dateMatchesEdition = isCalendarEdition(date)
    ? artifact.input.date === date.slice(0, 10)
    : /^\d{4}-W\d{2}$/.test(date)
      ? isoWeekOf(new Date(artifact.input.date + 'T00:00:00Z')) === date
      : artifact.input.date === date;
  if (
    artifact.input.profile.chart !== chart ||
    !dateMatchesEdition ||
    artifact.input.profile.version !== version ||
    !artifact.report.publishable
  )
    throw new Error('Preuve incompatible avec cette édition ou gel bloqué.');
  const frozen = entries
    .toSorted((a, b) => a.rank - b.rank)
    .map(({ entity, rank, score }) => ({ entity, rank, score }));
  const computed = artifact.report.rows.map(({ entity, rank, score }) => ({ entity, rank, score }));
  if (JSON.stringify(frozen) !== JSON.stringify(computed))
    throw new Error('Les positions ne correspondent pas à la preuve de calcul.');
  return artifact;
}
