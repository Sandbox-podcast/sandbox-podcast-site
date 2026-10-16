import type { ExternalEntity } from './external-charts.ts';

export interface KnownExternalIdentity {
  slug: string;
  active: boolean;
  sources: { provider: string; externalId: string }[];
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
    const direct = known.find((item) => item.slug === slug);
    if (
      entity.type === 'model' &&
      direct &&
      entity.sources.some((incoming) =>
        direct.sources.some(
          (source) =>
            source.provider === incoming.provider && source.externalId !== incoming.externalId,
        ),
      )
    )
      throw new Error(
        `Variante Models contradictoire : ${entity.slug}. Aucun rapprochement automatique.`,
      );
    if (entity.type === 'model' && !known.some((item) => item.slug === slug)) {
      const matches = known.filter(
        (item) =>
          item.active &&
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
      }
    }
    if (used.has(slug))
      throw new Error(`Plusieurs variantes Models visent ${slug}. Revue des références requise.`);
    used.add(slug);
    result.set(entity.slug, slug);
  }
  return result;
}
