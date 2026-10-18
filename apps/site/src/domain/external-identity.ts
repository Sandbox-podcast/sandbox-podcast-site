import { createHash } from 'node:crypto';
import type { ExternalEntity } from './external-charts.ts';

export interface KnownExternalIdentity {
  slug: string;
  active: boolean;
  sources: { provider: string; externalId: string }[];
}

export interface ExternalIdentityConflict {
  slug: string;
  reason: string;
  knownSlugs: string[];
  sources: { provider: string; externalId: string }[];
}

/** Isole chaque ambiguïté ; toutes les partitions visant la même fiche restent en attente. */
export function planExternalIdentities(
  entities: readonly ExternalEntity[],
  known: readonly KnownExternalIdentity[],
): { slugs: Map<string, string>; conflicts: ExternalIdentityConflict[] } {
  const slugs = new Map<string, string>();
  const reasons = new Map<string, string>();
  for (const entity of entities) {
    try {
      const resolved = stableExternalSlugs([entity], known).get(entity.slug);
      if (resolved) slugs.set(entity.slug, resolved);
    } catch (error) {
      reasons.set(entity.slug, error instanceof Error ? error.message : 'Identité indéterminée.');
    }
  }
  const targets = new Map<string, Set<string>>();
  const modelSources = new Map<string, Set<string>>();
  for (const entity of entities) {
    const target = slugs.get(entity.slug);
    if (target) {
      const incoming = targets.get(target) ?? new Set<string>();
      incoming.add(entity.slug);
      targets.set(target, incoming);
    }
    if (entity.type !== 'model') continue;
    for (const source of entity.sources) {
      const key = JSON.stringify([source.provider, source.externalId]);
      const incoming = modelSources.get(key) ?? new Set<string>();
      incoming.add(entity.slug);
      modelSources.set(key, incoming);
    }
  }
  for (const incoming of [...targets.values(), ...modelSources.values()]) {
    if (incoming.size < 2) continue;
    for (const slug of incoming)
      reasons.set(
        slug,
        `Plusieurs variantes Models partagent une identité : ${[...incoming].sort().join(', ')}. Revue requise.`,
      );
  }
  const conflicts = entities.flatMap((entity) => {
    const reason = reasons.get(entity.slug);
    if (!reason) return [];
    slugs.delete(entity.slug);
    const knownSlugs = known
      .filter(
        (item) =>
          item.slug === entity.slug ||
          item.sources.some((source) =>
            entity.sources.some(
              (incoming) =>
                incoming.provider === source.provider && incoming.externalId === source.externalId,
            ),
          ),
      )
      .map((item) => item.slug)
      .sort();
    return [
      {
        slug: entity.slug,
        reason,
        knownSlugs,
        sources: entity.sources.map(({ provider, externalId }) => ({ provider, externalId })),
      },
    ];
  });
  return { slugs, conflicts };
}

/** Preserve a known identity when the set of available providers changes its generated slug. */
export function stableExternalSlugs(
  entities: readonly ExternalEntity[],
  known: readonly KnownExternalIdentity[],
): Map<string, string> {
  const result = new Map<string, string>();
  const used = new Set<string>();
  for (const entity of entities) {
    let slug = entity.slug;
    if (entity.type === 'model') {
      // Excluded identities must still match: a generated slug must not bypass moderation.
      const matches = known.filter((item) =>
        item.sources.some((source) =>
          entity.sources.some(
            (incoming) =>
              source.provider === incoming.provider && source.externalId === incoming.externalId,
          ),
        ),
      );
      if (matches.length > 1)
        throw new Error(
          `Identité Models contradictoire : ${entity.slug}. Revue des références requise.`,
        );
      const match = matches[0];
      if (match) {
        const conflict = entity.sources.some((incoming) =>
          match.sources.some(
            (source) =>
              source.provider === incoming.provider && source.externalId !== incoming.externalId,
          ),
        );
        if (conflict)
          throw new Error(
            `Variante Models contradictoire : ${entity.slug}. Aucun rapprochement automatique.`,
          );
        slug = match.slug;
      } else if (known.some((item) => item.slug === slug)) {
        // Un nom normalisé n'est pas une identité. Deux éditeurs peuvent publier
        // des variantes homonymes ; garder leurs mesures et historiques séparés.
        const direct = known.find((item) => item.slug === slug);
        if (!direct?.sources.length)
          throw new Error(`Identité Models sans référence : ${slug}. Revue requise.`);
        const identity = entity.sources
          .map(({ provider, externalId }) => JSON.stringify([provider, externalId]))
          .sort();
        const fingerprint = createHash('sha256').update(JSON.stringify(identity)).digest('hex');
        slug = `${entity.slug}-${fingerprint.slice(0, 16)}`;
        if (known.some((item) => item.slug === slug))
          throw new Error(`Collision Models persistante : ${slug}. Revue requise.`);
      }
    }
    if (used.has(slug))
      throw new Error(`Plusieurs variantes Models visent ${slug}. Revue des références requise.`);
    used.add(slug);
    result.set(entity.slug, slug);
  }
  return result;
}
