import { describe, expect, it, vi } from 'vitest';
import {
  externalEntitySchema,
  scoreModels,
  scoreSkills,
  type ExternalEntity,
  type ModelScoreInput,
  type SkillScoreInput,
} from '../src/domain/external-charts.ts';
import {
  ArenaClient,
  HuggingFaceClient,
  OpenRouterClient,
  SkillsClient,
} from '../src/pipeline/external-clients.ts';

function entity(slug: string): ExternalEntity {
  return externalEntitySchema.parse({
    slug,
    type: 'model',
    name: slug,
    organization: 'sandbox',
    description: null,
    category: 'Models',
    license: null,
    openWeights: null,
    sourceUrl: 'https://example.com/model',
    websiteUrl: null,
    sources: [
      {
        provider: 'huggingface',
        externalId: slug,
        url: `https://huggingface.co/${slug}`,
        label: 'Hugging Face',
      },
    ],
  });
}

function skill(slug: string, installs7d: number, stars7d: number): SkillScoreInput {
  return {
    entity: externalEntitySchema.parse({
      ...entity(slug),
      type: 'skill',
      category: 'Coding',
    }),
    metrics: {
      installs: installs7d * 10,
      installs7d,
      stars: stars7d * 10,
      stars7d,
      forks: 5,
      freshness: 50,
    },
    sourceObservedAt: ['2026-10-08T02:30:00.000Z'],
  };
}

function model(slug: string, metrics: ModelScoreInput['metrics']): ModelScoreInput {
  return {
    entity: entity(slug),
    metrics,
    sourceObservedAt: ['2026-10-08T02:30:00.000Z'],
  };
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
}

describe('classements externes', () => {
  it('croise la croissance des installations et celle des stars pour noter les skills', () => {
    const rows = scoreSkills([skill('skill-alpha', 100, 10), skill('skill-beta', 10, 100)]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.rank).toBe(1);
    expect(rows[0]?.entity.slug).toBe('skill-alpha');
    expect(rows[0]?.dimensions['growth']).toBe(100);
    expect(rows[0]?.dimensions['githubGrowth']).toBe(0);
    expect(rows[0]?.dimensions['freshness']).toBe(50);
  });

  it('normalise chaque benchmark séparément et conserve le prix gratuit comme meilleur prix', () => {
    const common = {
      arenaQuality: 1400,
      artificialAnalysisIntelligence: null,
      arenaCoding: null,
      artificialAnalysisCoding: null,
      arenaAgent: null,
      artificialAnalysisAgentic: null,
      arenaVision: null,
      arenaSearch: null,
      downloads30d: null,
      likes: null,
      openRouterWeeklyRank: null,
      openRouterThroughputRank: null,
      contextLength: null,
    };
    const ranked = scoreModels([
      model('model-alpha', {
        ...common,
        verifiedReasoning: { gpqa: 90, humanitysLastExam: 0.1 },
        verifiedMaths: {},
        promptPricePerMillion: 0,
        completionPricePerMillion: 0,
      }),
      model('model-beta', {
        ...common,
        verifiedReasoning: { gpqa: 10, humanitysLastExam: 0.9 },
        verifiedMaths: {},
        promptPricePerMillion: 1,
        completionPricePerMillion: 1,
      }),
      model('model-unrated', {
        ...common,
        arenaQuality: null,
        verifiedReasoning: {},
        verifiedMaths: {},
        promptPricePerMillion: null,
        completionPricePerMillion: null,
      }),
    ]);
    expect(ranked).toHaveLength(2);
    expect(ranked.find((row) => row.entity.slug === 'model-alpha')?.dimensions['reasoning']).toBe(
      50,
    );
    expect(ranked.find((row) => row.entity.slug === 'model-beta')?.dimensions['reasoning']).toBe(
      50,
    );
    expect(ranked.find((row) => row.entity.slug === 'model-alpha')?.dimensions['price']).toBe(100);
    expect(ranked.find((row) => row.entity.slug === 'model-unrated')).toBeUndefined();
  });
});

describe('clients de sources', () => {
  it('appelle Skills.sh avec le jeton et écarte les doublons', async () => {
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      expect(url.searchParams.get('view')).toBe('trending');
      expect(url.searchParams.get('per_page')).toBe('500');
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer skill-token');
      return jsonResponse({
        data: [
          {
            id: 'owner/repo/skill',
            slug: 'skill',
            name: 'Skill',
            source: 'owner/repo',
            installs: 100,
            sourceType: 'github',
            url: 'https://skills.sh/owner/repo/skill',
          },
          {
            id: 'owner/repo/duplicate',
            slug: 'duplicate',
            name: 'Duplicate',
            source: 'owner/repo',
            installs: 90,
            sourceType: 'github',
            isDuplicate: true,
            url: 'https://skills.sh/owner/repo/duplicate',
          },
        ],
        pagination: { page: 0, hasMore: false },
      });
    };
    const result = await new SkillsClient({ token: 'skill-token', fetch: fetcher }).list(
      'trending',
    );
    expect(result.map((item) => item.id)).toEqual(['owner/repo/skill']);
  });

  it('ne lit que les modèles publics du Hub et conserve les colonnes de licence', async () => {
    const fetcher: typeof fetch = vi.fn(async (input) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe('/api/models');
      expect(url.searchParams.get('sort')).toBe('downloads');
      expect(url.searchParams.getAll('expand')).toContain('downloads');
      expect(url.searchParams.get('expand')).toBe('author');
      return jsonResponse([
        { id: 'org/model', author: 'org', downloads: 100, likes: 10, tags: ['license:apache-2.0'] },
        { id: 'org/private', private: true, downloads: 200, tags: [] },
      ]);
    });
    const result = await new HuggingFaceClient({ fetch: fetcher }).listModels(20);
    expect(result).toHaveLength(1);
    expect(result[0]?.tags).toContain('license:apache-2.0');
  });

  it('récupère les lignes Arena par configuration et garde la provenance de catégorie', async () => {
    const fetcher: typeof fetch = vi.fn(async (input) => {
      const url = new URL(String(input));
      expect(url.searchParams.get('dataset')).toBe('lmarena-ai/leaderboard-dataset');
      expect(url.searchParams.get('config')).toBe('text_style_control');
      return jsonResponse({
        rows: [
          {
            row: {
              model_name: 'Model A',
              organization: 'Example',
              rating: 1400,
              rank: 1,
              category: 'overall',
              vote_count: 1200,
            },
          },
        ],
      });
    });
    const result = await new ArenaClient({ fetch: fetcher }).latest('text_style_control');
    expect(result[0]?.rating).toBe(1400);
    expect(result[0]?.config).toBe('text_style_control');
  });

  it('distingue le tri hebdomadaire du tri de débit OpenRouter', async () => {
    const sorts: string[] = [];
    const fetcher: typeof fetch = vi.fn(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/models')) {
        sorts.push(url.searchParams.get('sort') ?? '');
        return jsonResponse({
          data: [
            {
              id: 'org/model',
              canonical_slug: 'org/model',
              name: 'Model',
              context_length: 8192,
              pricing: { prompt: '0', completion: '0' },
            },
          ],
        });
      }
      return jsonResponse({ data: [] });
    });
    const result = await new OpenRouterClient({ token: 'router-token', fetch: fetcher }).catalog();
    expect(sorts.toSorted()).toEqual(['throughput-high-to-low', 'top-weekly']);
    expect(result[0]?.topWeeklyRank).toBe(1);
    expect(result[0]?.throughputRank).toBe(1);
  });
});
