import { createHash } from 'node:crypto';
import {
  calculateReferenceRanking,
  referenceInputSchema,
  type ReferenceInput,
} from '../domain/reference-ranking.ts';

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  throw new Error('Valeur non sérialisable dans une preuve de classement.');
}
export function createReferenceArtifact(raw: ReferenceInput) {
  const parsed = referenceInputSchema.parse(raw);
  const input = {
    ...parsed,
    candidates: parsed.candidates.toSorted(),
    observations: parsed.observations.toSorted((a, b) =>
      a.entity < b.entity
        ? -1
        : a.entity > b.entity
          ? 1
          : a.source < b.source
            ? -1
            : a.source > b.source
              ? 1
              : 0,
    ),
  };
  const report = calculateReferenceRanking(input);
  const sha256 = createHash('sha256').update(canonicalJson({ input, report })).digest('hex');
  return { schemaVersion: 1 as const, sha256, input, report };
}
export type ReferenceArtifact = ReturnType<typeof createReferenceArtifact>;
export function verifyReferenceArtifact(raw: unknown): ReferenceArtifact {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('input' in raw) ||
    !('sha256' in raw) ||
    !('report' in raw) ||
    !('schemaVersion' in raw) ||
    raw.schemaVersion !== 1
  )
    throw new Error('Preuve de classement invalide.');
  const rebuilt = createReferenceArtifact(referenceInputSchema.parse(raw.input));
  if (rebuilt.sha256 !== raw.sha256 || canonicalJson(rebuilt.report) !== canonicalJson(raw.report))
    throw new Error('La preuve ne correspond pas au recalcul.');
  return rebuilt;
}
