import { describe, expect, it } from 'vitest';
import { externalEntitySchema } from '../src/domain/external-charts.ts';
import {
  stableExternalSlugs,
  planExternalIdentities,
  type KnownExternalIdentity,
} from '../src/domain/external-identity.ts';

const source = {
  provider: 'arena' as const,
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
  it('met les références contradictoires en attente tout en résolvant les fiches distinctes', () => {
    const separate = {
      ...entity('separate'),
      sources: [{ ...source, externalId: 'publisher/separate' }],
    };
    const plan = planExternalIdentities(
      [entity('ambiguous'), separate],
      [known, { ...known, slug: 'duplicate', active: false }],
    );
    expect([...plan.slugs]).toEqual([['separate', 'separate']]);
    expect(plan.conflicts).toMatchObject([
      {
        slug: 'ambiguous',
        knownSlugs: ['duplicate', 'original-slug'],
        sources: [{ provider: 'arena', externalId: source.externalId }],
      },
    ]);
  });
  it('met toutes les partitions réutilisant la même référence en attente sans choisir la première', () => {
    const plan = planExternalIdentities([entity('first'), entity('second')], []);
    expect(plan.slugs.size).toBe(0);
    expect(plan.conflicts.map((conflict) => conflict.slug)).toEqual(['first', 'second']);
  });
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
    const separate = stableExternalSlugs(
      [entity('original-slug')],
      [{ ...known, sources: [{ ...source, externalId: 'publisher/model-low' }] }],
    ).get('original-slug');
    expect(separate).toMatch(/^original-slug-[a-f0-9]{16}$/);
    expect(() =>
      stableExternalSlugs([entity('new-slug')], [known, { ...known, slug: 'duplicate' }]),
    ).toThrow('contradictoire');
  });
  it('priorise la référence historique même si le nom vise un autre modèle', () => {
    expect(
      stableExternalSlugs(
        [entity('homonym')],
        [known, { ...known, slug: 'homonym', sources: [{ ...source, externalId: 'other' }] }],
      ).get('homonym'),
    ).toBe(known.slug);
  });
  it('retrouve la variante isolée lors des collectes suivantes sans changer son historique', () => {
    const previous = { ...known, sources: [{ ...source, externalId: 'other' }] };
    const first = stableExternalSlugs([entity(known.slug)], [previous]).get(known.slug);
    expect(first).toBeDefined();
    if (!first) throw new Error('Identité isolée absente.');
    const isolated = { ...known, slug: first };
    expect(
      stableExternalSlugs([entity('another-name')], [previous, isolated]).get('another-name'),
    ).toBe(first);
    expect(stableExternalSlugs([entity(known.slug)], [previous, isolated]).get(known.slug)).toBe(
      first,
    );
  });
  it('bloque encore les contradictions sur une référence réellement partagée', () => {
    const incoming = {
      ...entity('new-slug'),
      sources: [source, { ...source, provider: 'huggingface' as const, externalId: 'new' }],
    };
    expect(() =>
      stableExternalSlugs(
        [incoming],
        [{ ...known, sources: [source, { provider: 'huggingface', externalId: 'old' }] }],
      ),
    ).toThrow('Variante');
    expect(() => stableExternalSlugs([entity(known.slug)], [{ ...known, sources: [] }])).toThrow(
      'sans référence',
    );
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
