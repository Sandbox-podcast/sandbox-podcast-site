import { describe, expect, it } from 'vitest';
import { externalEntitySchema } from '../src/domain/external-charts.ts';
import {
  stableExternalSlugs,
  type KnownExternalIdentity,
} from '../src/domain/external-identity.ts';

const source = {
  provider: 'arena',
  externalId: 'publisher/model-high',
  url: 'https://example.test/model',
  label: 'Arena',
};
const entity = (slug: string) =>
  externalEntitySchema.parse({
    slug,
    type: 'model',
    name: 'Model High',
    category: 'Models',
    organization: 'publisher',
    description: null,
    license: null,
    openWeights: null,
    sourceUrl: source.url,
    websiteUrl: null,
    sources: [source],
  });
const known: KnownExternalIdentity = { slug: 'original-slug', active: true, sources: [source] };

describe('identités stables des modèles collectés', () => {
  it('conserve le slug historique lorsque la présence des fournisseurs change', () => {
    expect(stableExternalSlugs([entity('new-slug')], [known]).get('new-slug')).toBe(
      'original-slug',
    );
  });
  it('ne fusionne ni des homonymes ni des références contradictoires', () => {
    expect(
      stableExternalSlugs(
        [entity('new-slug')],
        [{ ...known, sources: [{ ...source, externalId: 'publisher/model-low' }] }],
      ).get('new-slug'),
    ).toBe('new-slug');
    expect(() =>
      stableExternalSlugs(
        [entity('original-slug')],
        [{ ...known, sources: [{ ...source, externalId: 'publisher/model-low' }] }],
      ),
    ).toThrow('Variante');
    expect(() =>
      stableExternalSlugs([entity('new-slug')], [known, { ...known, slug: 'duplicate' }]),
    ).toThrow('contradictoire');
  });
  it('refuse deux partitions qui réutiliseraient la même identité dans un lot', () => {
    expect(() => stableExternalSlugs([entity('one'), entity('two')], [known])).toThrow(
      'Plusieurs variantes',
    );
  });
  it('conserve une exclusion manuelle quand le slug change mais pas la source', () => {
    expect(
      stableExternalSlugs([entity('new-slug')], [{ ...known, active: false }]).get('new-slug'),
    ).toBe('original-slug');
  });
  it('refuse une source partagée entre une identité active et une identité exclue', () => {
    expect(() =>
      stableExternalSlugs(
        [entity('new-slug')],
        [known, { ...known, slug: 'excluded-duplicate', active: false }],
      ),
    ).toThrow('contradictoire');
  });
});
