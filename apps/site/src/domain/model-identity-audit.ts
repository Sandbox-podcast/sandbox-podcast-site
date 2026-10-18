import { z } from 'zod';

const identitySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  organization: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  sources: z.array(z.object({ provider: z.string(), externalId: z.string(), url: z.url() })),
  snapshots: z.number().int().nonnegative(),
  firstObservedOn: z.string().nullable(),
  lastObservedOn: z.string().nullable(),
  publishedRanks: z.number().int().nonnegative(),
});

export const modelIdentityAuditRowsSchema = z.array(
  z.object({
    provider: z.string(),
    externalId: z.string(),
    identities: z.array(identitySchema).min(2),
  }),
);

/** Une proposition conserve l'identité publiée, uniquement si toutes les références concordent. */
export function modelIdentityAudit(value: unknown) {
  return modelIdentityAuditRowsSchema.parse(value).map((conflict) => {
    const signatures = new Set(
      conflict.identities.map((identity) =>
        JSON.stringify(
          identity.sources
            .map(({ provider, externalId }) => JSON.stringify([provider, externalId]))
            .sort(),
        ),
      ),
    );
    const published = conflict.identities.filter((identity) => identity.publishedRanks > 0);
    const excluded = conflict.identities.some((identity) => !identity.active);
    const sameSources = signatures.size === 1;
    return {
      ...conflict,
      classification: sameSources ? 'same_source_sets' : 'overlapping_source_sets',
      proposedCanonicalSlug:
        sameSources && !excluded && published.length === 1 ? (published[0]?.slug ?? null) : null,
      reviewReason: excluded
        ? 'Une exclusion existe : relire la décision de modération avant tout raccordement.'
        : !sameSources
          ? 'Les références diffèrent : vérifier version, fournisseur et variante pour chaque fiche.'
          : published.length === 1
            ? 'Les références concordent : conserver en priorité la fiche déjà publiée, après revue des variantes.'
            : 'Les références concordent mais l’historique public ne désigne pas une seule fiche canonique.',
      approved: false,
    };
  });
}
