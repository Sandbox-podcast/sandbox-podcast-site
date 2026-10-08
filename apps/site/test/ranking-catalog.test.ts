import { describe, expect, it } from 'vitest';
import {
  hreflangAlternates,
  isIndexableRankingLocalization,
  rankingCollectionLocalizationSchema,
  rankingCollectionSchema,
  rankingEvidenceSchema,
} from '../src/domain/ranking-catalog.ts';

const collection = rankingCollectionSchema.parse({
  key: 'best-skills-claude-code',
  sourceChart: 'skills',
  entityKind: 'skill',
  intent: 'editorial_best',
  method: 'editorial_review',
  target: { platform: 'claude-code', task: 'code-review' },
  minimumCandidates: 10,
  minimumPublicEditions: 2,
  active: true,
});

function localization(state: 'draft' | 'reviewed' | 'published' = 'published') {
  return rankingCollectionLocalizationSchema.parse({
    collectionKey: 'best-skills-claude-code',
    locale: 'fr-FR',
    slug: 'meilleurs-skills-claude-code',
    path: '/charts/skills/claude-code',
    title: 'Les meilleurs skills pour Claude Code',
    metaTitle: 'Meilleurs skills Claude Code : sélection testée',
    metaDescription:
      'Découvrez une sélection de skills Claude Code évalués sur leur utilité, leur compatibilité et leurs limites.',
    heading: 'Les meilleurs skills pour Claude Code',
    introduction:
      'Une sélection testée de skills pour Claude Code, avec compatibilité, usages et critères de choix.',
    methodologySummary:
      'Chaque skill est évalué avec le même protocole documenté ; les sources et limites sont indiquées.',
    state,
    sourceLocale: 'fr-FR',
    sourceHash: '0123456789abcdef0123456789abcdef',
    reviewedAt: state === 'draft' ? undefined : '2026-10-08T10:00:00Z',
    publishedAt: state === 'published' ? '2026-10-08T11:00:00Z' : undefined,
  });
}

describe('catalogue sémantique et localisation des classements', () => {
  it('refuse de confondre intention “meilleur” et score de popularité', () => {
    expect(() =>
      rankingCollectionSchema.parse({
        key: 'best-skills',
        sourceChart: 'skills',
        entityKind: 'skill',
        intent: 'editorial_best',
        method: 'popularity',
      }),
    ).toThrow();
  });

  it('exige une vraie édition, une couverture suffisante et une traduction publiée', () => {
    expect(
      isIndexableRankingLocalization(collection, localization(), {
        liveData: true,
        publishedEditions: 2,
        candidateCount: 10,
      }),
    ).toBe(true);
    expect(
      isIndexableRankingLocalization(collection, localization(), {
        liveData: false,
        publishedEditions: 2,
        candidateCount: 10,
      }),
    ).toBe(false);
    expect(
      isIndexableRankingLocalization(collection, localization(), {
        liveData: true,
        publishedEditions: 1,
        candidateCount: 10,
      }),
    ).toBe(false);
    expect(
      isIndexableRankingLocalization(collection, localization('draft'), {
        liveData: true,
        publishedEditions: 2,
        candidateCount: 10,
      }),
    ).toBe(false);
  });

  it('crée des hreflang réciproques uniquement pour les versions indexables', () => {
    expect(
      hreflangAlternates(
        [
          { locale: 'fr-FR', path: '/charts/skills/claude-code', indexable: true },
          { locale: 'en', path: '/en/charts/skills/claude-code', indexable: true },
          { locale: 'de', path: '/de/charts/skills/claude-code', indexable: false },
        ],
        'https://www.sandboxpodcast.fr',
      ),
    ).toEqual({
      'fr-FR': 'https://www.sandboxpodcast.fr/charts/skills/claude-code',
      en: 'https://www.sandboxpodcast.fr/en/charts/skills/claude-code',
      'x-default': 'https://www.sandboxpodcast.fr/charts/skills/claude-code',
    });
    expect(
      hreflangAlternates(
        [{ locale: 'fr-FR', path: '/charts/skills', indexable: true }],
        'https://www.sandboxpodcast.fr',
      ),
    ).toEqual({});
  });

  it('n’accepte une preuve vérifiée qu’avec date et évaluateur', () => {
    expect(
      rankingEvidenceSchema.safeParse({
        id: 'evidence-1',
        entityId: 'skill-1',
        factKey: 'platform-compatibility',
        value: 'claude-code',
        sourceKind: 'repository',
        sourceUrl: 'https://github.com/example/skill',
        observedAt: '2026-10-08T09:00:00Z',
        state: 'verified',
      }).success,
    ).toBe(false);
    expect(
      rankingEvidenceSchema.safeParse({
        id: 'evidence-2',
        entityId: 'skill-1',
        factKey: 'platform-compatibility',
        value: 'claude-code',
        sourceKind: 'repository',
        sourceUrl: 'https://github.com/example/skill',
        observedAt: '2026-10-08T09:00:00Z',
        verifiedAt: '2026-10-08T09:30:00Z',
        reviewer: 'editor',
        state: 'verified',
      }).success,
    ).toBe(true);
  });
});
