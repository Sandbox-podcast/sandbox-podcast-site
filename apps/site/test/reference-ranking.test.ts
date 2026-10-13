import { describe, expect, it } from 'vitest';
import {
  calculateReferenceRanking,
  referenceInputSchema,
  referencePercentiles,
  referenceProfileSchema,
  referenceWeights,
  type ReferenceInput,
  type ReferenceObservation,
} from '../src/domain/reference-ranking.ts';
import { REFERENCE_PROFILES } from '../src/domain/reference-profiles.ts';
import { createReferenceArtifact, verifyReferenceArtifact } from '../src/lib/reference-artifact.ts';
import {
  reviewedReferenceVersion,
  validateReferenceEdition,
} from '../src/lib/reference-publication.ts';
import {
  modelsReferenceInput,
  skillsReferenceInput,
  conflictingModelIdentities,
} from '../src/domain/reference-adapters.ts';
import {
  externalEntitySchema,
  modelVariantSignature,
  type ModelScoreInput,
  type SkillScoreInput,
} from '../src/domain/external-charts.ts';

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Fixture de test manquante.');
  return value;
}
function profile() {
  return referenceProfileSchema.parse({
    ...REFERENCE_PROFILES.skills,
    size: 2,
    minimumCandidates: 2,
  });
}
function observation(entity: string, source: string, score: number): ReferenceObservation {
  return {
    entity,
    source,
    score,
    observedOn: '2026-10-13',
    evidenceUrl: 'https://example.com/evidence',
  };
}
function input(): ReferenceInput {
  return {
    profile: profile(),
    date: '2026-10-13',
    candidates: ['alpha', 'beta'],
    observations: [
      observation('alpha', 'skills-installs', 100),
      observation('alpha', 'skill-repository', 0),
      observation('beta', 'skills-installs', 0),
      observation('beta', 'skill-repository', 100),
    ],
  };
}

describe('classement de référence', () => {
  it('donne davantage de puissance au signal pertinent et explique chaque point', () => {
    const report = calculateReferenceRanking(input());
    expect(report.publishable).toBe(true);
    expect(report.rows.map((row) => row.entity)).toEqual(['alpha', 'beta']);
    expect(report.rows[0]?.score).toBeCloseTo(61.6);
    const row = required(report.rows[0]);
    expect(
      row.contributions.reduce((sum, entry) => sum + entry.points, 0) - row.disagreement * 0.2,
    ).toBeCloseTo(row.score);
    expect(row.contributions.map((entry) => entry.weight)).toEqual([0.7, 0.3]);
  });
  it('garde le budget de famille quand plusieurs sources ont une puissance différente', () => {
    const current = profile();
    current.sources.push({
      ...required(current.sources[0]),
      id: 'other-installs',
      upstream: 'other',
      dataset: 'independent',
      rigor: 0.4,
    });
    const weights = referenceWeights(referenceProfileSchema.parse(current));
    expect(weights['skills-installs']).toBeCloseTo(2 * required(weights['other-installs']));
    expect(required(weights['skills-installs']) + required(weights['other-installs'])).toBeCloseTo(
      0.7,
    );
    expect(weights['skill-repository']).toBeCloseTo(0.3);
  });
  it('refuse de compter un miroir du même jeu de données et les budgets invalides', () => {
    const current = profile();
    current.sources.push({ ...required(current.sources[0]), id: 'mirror' });
    expect(referenceProfileSchema.safeParse(current).success).toBe(false);
    expect(
      referenceProfileSchema.safeParse({
        ...profile(),
        families: [
          { id: 'adoption', label: 'Adoption', weight: 0.9 },
          { id: 'maintenance', label: 'Dépôt', weight: 0.3 },
        ],
      }).success,
    ).toBe(false);
  });
  it('bloque un candidat sans source qui pourrait entrer, même si vingt autres seraient complets', () => {
    const data = input();
    data.candidates.push('unknown');
    data.observations.push(observation('unknown', 'skills-installs', 100));
    const report = calculateReferenceRanking(data);
    expect(report.eligibleCount).toBe(2);
    expect(report.publishable).toBe(false);
    expect(report.blockers).toContain('unresolved-contenders');
    expect(report.excluded[0]).toMatchObject({
      entity: 'unknown',
      canEnterTop: true,
      upperBound: 100,
    });
  });
  it('autorise le Top si la borne haute du candidat incomplet est sous la dernière place', () => {
    const data = input();
    data.observations = data.observations.map((row) => ({ ...row, score: 80 }));
    data.candidates.push('outside');
    data.observations.push(observation('outside', 'skills-installs', 0));
    const report = calculateReferenceRanking(data);
    expect(report.excluded[0]?.upperBound).toBeLessThan(80);
    expect(report.publishable).toBe(true);
  });
  it('la borne haute couvre les valeurs possibles de la source manquante', () => {
    const data = input();
    data.candidates.push('unknown');
    data.observations.push(observation('unknown', 'skills-installs', 23));
    const upper = required(calculateReferenceRanking(data).excluded[0]).upperBound;
    for (const score of [0, 20, 50, 80, 100]) {
      const complete = {
        ...data,
        profile: { ...data.profile, size: 3 },
        observations: [...data.observations, observation('unknown', 'skill-repository', score)],
      };
      expect(
        required(calculateReferenceRanking(complete).rows.find((row) => row.entity === 'unknown'))
          .score,
      ).toBeLessThanOrEqual(upper + 1e-6);
    }
  });
  it('rejette les dates futures, les données périmées et les échantillons insuffisants', () => {
    const data = input();
    required(data.profile.sources[0]).minimumSampleSize = 1000;
    data.observations[0] = { ...required(data.observations[0]), sampleSize: 999 };
    data.observations[1] = { ...required(data.observations[1]), observedOn: '2026-10-14' };
    data.observations[2] = {
      ...required(data.observations[2]),
      observedOn: '2026-10-01',
      sampleSize: 1000,
    };
    expect(
      calculateReferenceRanking(data)
        .rejectedObservations.map((row) => row.reason)
        .toSorted(),
    ).toEqual(['future', 'sample', 'stale']);
  });
  it('rend des rangs de sensibilité, sans les présenter comme probabilités', () => {
    const report = calculateReferenceRanking(input());
    expect(report.sensitivityScenarios).toBe(12);
    expect(report.rows[0]?.sensitivity).toEqual({ bestRank: 1, worstRank: 2 });
  });
  it('ordonne les égalités de manière stable et conserve les rangs moyens en normalisation', () => {
    const data = input();
    data.observations = data.observations.map((row) => ({ ...row, score: 50 }));
    expect(calculateReferenceRanking(data).rows.map((row) => row.entity)).toEqual([
      'alpha',
      'beta',
    ]);
    expect([
      ...referencePercentiles(
        new Map([
          ['a', 10],
          ['b', 10],
          ['c', 20],
        ]),
      ).values(),
    ]).toEqual([25, 25, 100]);
    expect(referencePercentiles(new Map([['only', 8]])).get('only')).toBe(50);
  });
  it('refuse NaN, les observations dupliquées ou étrangères et les candidats répétés', () => {
    const data = input();
    expect(
      referenceInputSchema.safeParse({
        ...data,
        observations: [{ ...data.observations[0], score: Number.NaN }],
      }).success,
    ).toBe(false);
    expect(
      referenceInputSchema.safeParse({
        ...data,
        observations: [...data.observations, data.observations[0]],
      }).success,
    ).toBe(false);
    expect(
      referenceInputSchema.safeParse({
        ...data,
        observations: [observation('foreign', 'skills-installs', 1)],
      }).success,
    ).toBe(false);
    expect(
      referenceInputSchema.safeParse({ ...data, candidates: ['alpha', 'alpha'] }).success,
    ).toBe(false);
  });
  it('rejoue une preuve identique malgré un ordre différent des entrées, et détecte une altération', () => {
    const data = input();
    const proof = createReferenceArtifact(data);
    expect(
      createReferenceArtifact({
        ...data,
        candidates: data.candidates.toReversed(),
        observations: data.observations.toReversed(),
      }).sha256,
    ).toBe(proof.sha256);
    expect(verifyReferenceArtifact(JSON.parse(JSON.stringify(proof)) as unknown)).toEqual(proof);
    expect(() => verifyReferenceArtifact({ ...proof, sha256: '0'.repeat(64) })).toThrow();
    expect(() =>
      verifyReferenceArtifact({ ...proof, report: { ...proof.report, publishable: false } }),
    ).toThrow();
  });
  it('refuse une publication dont les rangs ne correspondent pas au recalcul et exige la version exacte', () => {
    const proof = createReferenceArtifact(input());
    expect(() =>
      validateReferenceEdition(
        { referenceRanking: proof },
        'skills',
        '2026-10-13',
        proof.input.profile.version,
        proof.report.rows,
      ),
    ).not.toThrow();
    expect(() =>
      validateReferenceEdition(
        { referenceRanking: proof },
        'models',
        '2026-10-13',
        proof.input.profile.version,
        proof.report.rows,
      ),
    ).toThrow();
    expect(() =>
      validateReferenceEdition(
        { referenceRanking: proof },
        'skills',
        '2026-10-13',
        proof.input.profile.version,
        proof.report.rows.map((row) => ({ ...row, score: 99 })),
      ),
    ).toThrow();
    expect(reviewedReferenceVersion('skills-reference-v3', '')).toBe(false);
    expect(reviewedReferenceVersion('skills-reference-v3', 'skills-reference-v30')).toBe(false);
    expect(
      reviewedReferenceVersion('skills-reference-v3', 'models-reference-v3, skills-reference-v3'),
    ).toBe(true);
  });
});

function entity(slug: string, type: 'model' | 'skill' = 'model') {
  return externalEntitySchema.parse({
    slug,
    type,
    name: slug,
    organization: 'fixture',
    description: null,
    category: 'Test',
    license: null,
    openWeights: null,
    sourceUrl: 'https://example.com',
    websiteUrl: null,
    sources: [
      { provider: 'arena', externalId: slug, label: 'Fixture', url: 'https://example.com' },
    ],
  });
}
function model(slug: string, arena: number, analysis: number | null): ModelScoreInput {
  return {
    entity: entity(slug),
    sourceObservedAt: ['2026-10-13T00:00:00Z'],
    referenceEvidence: {
      'arena-text': {
        observedOn: '2026-10-13',
        sampleSize: 1000,
        evidenceUrl: 'https://example.com',
      },
      'artificial-analysis': { observedOn: '2026-10-13', evidenceUrl: 'https://example.com' },
    },
    metrics: {
      arenaQuality: arena,
      artificialAnalysisIntelligence: analysis,
      arenaCoding: null,
      artificialAnalysisCoding: null,
      arenaAgent: null,
      artificialAnalysisAgentic: null,
      arenaVision: null,
      arenaSearch: null,
      verifiedReasoning: {},
      verifiedMaths: {},
      downloads30d: null,
      likes: null,
      openRouterWeeklyRank: null,
      openRouterThroughputRank: null,
      contextLength: null,
      promptPricePerMillion: null,
      completionPricePerMillion: null,
    },
  };
}
describe('adaptateurs v3', () => {
  it('met en attente deux entités qui revendiquent le même identifiant chez un évaluateur', () => {
    const sources = [{ ref: { provider: 'arena', externalId: 'same-checkpoint' } }];
    expect(
      [
        ...conflictingModelIdentities([
          { entity: { slug: 'a' }, sources },
          { entity: { slug: 'b' }, sources },
        ]),
      ].toSorted(),
    ).toEqual(['a', 'b']);
    expect(
      conflictingModelIdentities([
        { entity: { slug: 'a' }, sources },
        { entity: { slug: 'a' }, sources },
      ]).size,
    ).toBe(0);
  });
  it('normalise chaque source avant intersection et conserve les modèles à une seule évaluation comme candidats', () => {
    const data = modelsReferenceInput(
      [model('a', 10, 1), model('b', 20, 2), model('c', 100, null)],
      '2026-10-13',
    );
    expect(
      data.observations.find((row) => row.entity === 'b' && row.source === 'arena-text')?.score,
    ).toBe(50);
    expect(calculateReferenceRanking(data).excluded.map((row) => row.entity)).toContain('c');
  });
  it('un échantillon Arena trop petit ne déforme pas les percentiles des autres modèles', () => {
    const unqualified = model('c', 100, 99);
    required(required(unqualified.referenceEvidence)['arena-text']).sampleSize = 2;
    const data = modelsReferenceInput(
      [model('a', 10, 1), model('b', 20, 2), unqualified],
      '2026-10-13',
    );
    expect(
      data.observations.find((row) => row.entity === 'b' && row.source === 'arena-text')?.score,
    ).toBe(100);
    expect(data.observations.some((row) => row.entity === 'c' && row.source === 'arena-text')).toBe(
      false,
    );
  });
  it('ne remplace pas la dynamique des skills par leur nombre cumulé à la première collecte', () => {
    const row: SkillScoreInput = {
      entity: entity('skill', 'skill'),
      metrics: {
        installs: 10000,
        installs7d: null,
        stars: 1000,
        stars7d: null,
        forks: 12,
        freshness: 80,
      },
      sourceObservedAt: ['2026-10-13T00:00:00Z'],
      referenceEvidence: {
        'skills-installs': { observedOn: '2026-10-13', evidenceUrl: 'https://example.com' },
        'skill-repository': { observedOn: '2026-10-13', evidenceUrl: 'https://example.com' },
      },
    };
    expect(skillsReferenceInput([row], '2026-10-13').observations).toEqual([]);
  });
  it('ne confond pas versions numériques, budgets de raisonnement et quantifications', () => {
    expect(modelVariantSignature('org/model-4.1')).not.toBe(modelVariantSignature('org/model-41'));
    expect(modelVariantSignature('model (high)')).not.toBe(modelVariantSignature('model (low)'));
    expect(modelVariantSignature('model-q4')).not.toBe(modelVariantSignature('model-q8'));
  });
});
