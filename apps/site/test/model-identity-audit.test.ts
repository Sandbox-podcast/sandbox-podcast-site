import { describe, expect, it } from 'vitest';
import { modelIdentityAudit } from '../src/domain/model-identity-audit.ts';

const source = {
  provider: 'arena',
  externalId: 'publisher/model',
  url: 'https://example.com/model',
};
const identity = (slug: string, publishedRanks = 0, active = true) => ({
  id: slug,
  slug,
  name: slug,
  organization: 'publisher',
  active,
  createdAt: '2026-10-01',
  sources: [source],
  snapshots: 3,
  firstObservedOn: '2026-10-01',
  lastObservedOn: '2026-10-18',
  publishedRanks,
});

describe('revue des identités Models', () => {
  it('propose uniquement la fiche publiée dont toutes les références concordent', () => {
    const report = modelIdentityAudit([
      {
        provider: source.provider,
        externalId: source.externalId,
        identities: [identity('published', 2), identity('duplicate')],
      },
    ]);
    expect(report[0]).toMatchObject({
      classification: 'same_source_sets',
      proposedCanonicalSlug: 'published',
      approved: false,
    });
  });
  it('laisse une exclusion et deux historiques publiés à la revue manuelle', () => {
    for (const identities of [
      [identity('first', 2), identity('second', 0, false)],
      [identity('first', 2), identity('second', 1)],
    ]) {
      expect(
        modelIdentityAudit([
          { provider: source.provider, externalId: source.externalId, identities },
        ])[0]?.proposedCanonicalSlug,
      ).toBeNull();
    }
  });
  it('ne propose pas de fusion quand une variante possède une autre référence', () => {
    const other = {
      ...identity('variant'),
      sources: [
        source,
        { ...source, provider: 'huggingface', externalId: 'publisher/other-version' },
      ],
    };
    expect(
      modelIdentityAudit([
        {
          provider: source.provider,
          externalId: source.externalId,
          identities: [identity('published', 2), other],
        },
      ])[0],
    ).toMatchObject({ classification: 'overlapping_source_sets', proposedCanonicalSlug: null });
  });
});
