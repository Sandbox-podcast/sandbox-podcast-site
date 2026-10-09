import { z } from 'zod';

const jsonResponse = z.unknown();

async function getJson(
  url: URL,
  headers: HeadersInit = {},
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const requestHeaders = new Headers(headers);
      requestHeaders.set('Accept', 'application/json');
      const response = await fetcher(url, {
        headers: requestHeaders,
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Source HTTP ${response.status.toString()}.`);
        if (attempt < 2) {
          const retryHeader = response.headers.get('retry-after');
          const retrySeconds = Number(retryHeader);
          const retryDate = retryHeader ? Date.parse(retryHeader) - Date.now() : 0;
          const retryAfter =
            Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds * 1000 : retryDate;
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(5000, Math.max(250, retryAfter || 500 * 2 ** attempt))),
          );
          continue;
        }
      }
      if (!response.ok) throw new Error(`Source HTTP ${response.status.toString()}.`);
      return jsonResponse.parse(await response.json());
    } catch (error) {
      lastError = error;
      if (attempt < 2 && !(error instanceof Error && error.message.startsWith('Source HTTP 4')))
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw new Error(
    `Source indisponible (${lastError instanceof Error ? lastError.message : 'réseau'}).`,
  );
}

const skillsPageSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
      slug: z.string().min(1),
      name: z.string().min(1),
      source: z.string().min(1),
      installs: z.number().int().nonnegative(),
      sourceType: z.enum(['github', 'well-known']),
      installUrl: z.string().nullable().optional(),
      url: z.url(),
      isDuplicate: z.boolean().optional(),
    }),
  ),
  pagination: z.object({ page: z.number().int().nonnegative(), hasMore: z.boolean() }),
});
export type SkillsItem = z.infer<typeof skillsPageSchema>['data'][number];

export class SkillsClient {
  private readonly options: { token?: string | undefined; fetch?: typeof fetch };

  constructor(options: { token?: string | undefined; fetch?: typeof fetch } = {}) {
    this.options = options;
  }

  async list(view: 'all-time' | 'trending', page = 0): Promise<SkillsItem[]> {
    const token = this.options.token ?? process.env['VERCEL_OIDC_TOKEN'];
    if (!token) throw new Error('VERCEL_OIDC_TOKEN requis pour l’API Skills.sh.');
    const url = new URL('https://skills.sh/api/v1/skills');
    url.searchParams.set('view', view);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', '500');
    const result = skillsPageSchema.parse(
      await getJson(url, { Authorization: `Bearer ${token}` }, this.options.fetch),
    );
    return result.data.filter((skill) => skill.sourceType === 'github' && !skill.isDuplicate);
  }
}

const hfModelSchema = z.object({
  id: z.string().min(1),
  modelId: z.string().optional(),
  author: z.string().nullable().optional(),
  downloads: z.number().nonnegative().nullable().optional(),
  downloadsAllTime: z.number().nonnegative().nullable().optional(),
  likes: z.number().nonnegative().nullable().optional(),
  private: z.boolean().optional(),
  gated: z.union([z.boolean(), z.string()]).optional(),
  tags: z.array(z.string()).default([]),
  pipeline_tag: z.string().nullable().optional(),
  library_name: z.string().nullable().optional(),
  createdAt: z.iso.datetime().nullable().optional(),
  lastModified: z.iso.datetime().nullable().optional(),
  safetensors: z
    .object({ total: z.number().nonnegative().nullable().optional() })
    .nullable()
    .optional(),
});
export type HuggingFaceModel = z.infer<typeof hfModelSchema>;

export class HuggingFaceClient {
  private readonly options: { token?: string | undefined; fetch?: typeof fetch };

  constructor(options: { token?: string | undefined; fetch?: typeof fetch } = {}) {
    this.options = options;
  }

  async listModels(limit = 500): Promise<HuggingFaceModel[]> {
    const url = new URL('https://huggingface.co/api/models');
    url.searchParams.set('pipeline_tag', 'text-generation');
    url.searchParams.set('sort', 'downloads');
    url.searchParams.set('direction', '-1');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set(
      'expand',
      'author,createdAt,downloads,downloadsAllTime,gated,lastModified,likes,pipeline_tag,safetensors,tags',
    );
    const headers = new Headers();
    const token = this.options.token ?? process.env['HUGGINGFACE_TOKEN'] ?? process.env['HF_TOKEN'];
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const result = z.array(hfModelSchema).parse(await getJson(url, headers, this.options.fetch));
    return result.filter((model) => !model.private);
  }
}

const arenaRowSchema = z.object({
  model_name: z.string().min(1),
  organization: z.string().nullable().optional(),
  license: z.string().nullable().optional(),
  rating: z.number().optional(),
  score: z.number().optional(),
  rank: z.number().int().positive().optional(),
  category: z.string().nullable().optional(),
  vote_count: z.number().nonnegative().optional(),
  observation_count: z.number().nonnegative().optional(),
  leaderboard_publish_date: z.iso.date().optional(),
});
export type ArenaModelResult = z.infer<typeof arenaRowSchema> & { config: string };
const arenaResponseSchema = z.object({
  rows: z.array(z.object({ row: arenaRowSchema })),
});

export const ARENA_CONFIGS = [
  'text_style_control',
  'webdev',
  'agent',
  'vision_style_control',
  'search',
] as const;

export class ArenaClient {
  private readonly options: { fetch?: typeof fetch };

  constructor(options: { fetch?: typeof fetch } = {}) {
    this.options = options;
  }

  async latest(config: (typeof ARENA_CONFIGS)[number]): Promise<ArenaModelResult[]> {
    const url = new URL('https://datasets-server.huggingface.co/rows');
    url.searchParams.set('dataset', 'lmarena-ai/leaderboard-dataset');
    url.searchParams.set('config', config);
    url.searchParams.set('split', 'latest');
    url.searchParams.set('offset', '0');
    url.searchParams.set('length', '100');
    const result = arenaResponseSchema.parse(await getJson(url, {}, this.options.fetch));
    return result.rows.map(({ row }) => ({ ...row, config }));
  }
}

const openRouterModelSchema = z.object({
  id: z.string().min(1),
  canonical_slug: z.string().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  context_length: z.number().int().positive().nullable().optional(),
  pricing: z
    .object({ prompt: z.string().optional(), completion: z.string().optional() })
    .optional(),
  architecture: z
    .object({
      input_modalities: z.array(z.string()).optional(),
      output_modalities: z.array(z.string()).optional(),
    })
    .optional(),
});
export type OpenRouterModel = z.infer<typeof openRouterModelSchema> & {
  topWeeklyRank: number | null;
  throughputRank: number | null;
};
const openRouterModelsSchema = z.object({
  data: z.array(openRouterModelSchema),
  total_count: z.number().int().nonnegative().optional(),
});
const artificialAnalysisSchema = z.object({
  source: z.string(),
  model_permaslug: z.string().min(1),
  display_name: z.string().nullable().optional(),
  intelligence_index: z.number().nullable().optional(),
  coding_index: z.number().nullable().optional(),
  agentic_index: z.number().nullable().optional(),
});
const openRouterBenchmarksSchema = z.object({ data: z.array(artificialAnalysisSchema) });
export type ArtificialAnalysisResult = z.infer<typeof artificialAnalysisSchema>;

export class OpenRouterClient {
  private readonly options: { token?: string | undefined; fetch?: typeof fetch };

  constructor(options: { token?: string | undefined; fetch?: typeof fetch } = {}) {
    this.options = options;
  }

  private headers(): Headers {
    const token = this.options.token ?? process.env['OPENROUTER_API_KEY'];
    if (!token) throw new Error('OPENROUTER_API_KEY requis pour les mesures OpenRouter.');
    return new Headers({ Authorization: `Bearer ${token}` });
  }

  private async models(sort: 'top-weekly' | 'throughput-high-to-low'): Promise<OpenRouterModel[]> {
    const tokenHeaders = this.headers();
    const url = new URL('https://openrouter.ai/api/v1/models');
    url.searchParams.set('sort', sort);
    url.searchParams.set('output_modalities', 'all');
    const page = openRouterModelsSchema.parse(await getJson(url, tokenHeaders, this.options.fetch));
    return page.data.map((model, index) => ({
      ...model,
      topWeeklyRank: sort === 'top-weekly' ? index + 1 : null,
      throughputRank: sort === 'throughput-high-to-low' ? index + 1 : null,
    }));
  }

  async catalog(): Promise<OpenRouterModel[]> {
    const [weekly, throughput] = await Promise.all([
      this.models('top-weekly'),
      this.models('throughput-high-to-low'),
    ]);
    const merged = new Map<string, OpenRouterModel>();
    for (const model of weekly) merged.set(model.canonical_slug ?? model.id, model);
    for (const model of throughput) {
      const key = model.canonical_slug ?? model.id;
      const previous = merged.get(key);
      merged.set(key, {
        ...model,
        topWeeklyRank: previous?.topWeeklyRank ?? null,
        throughputRank: model.throughputRank,
      });
    }
    return [...merged.values()];
  }

  async artificialAnalysis(): Promise<ArtificialAnalysisResult[]> {
    const url = new URL('https://openrouter.ai/api/v1/benchmarks');
    url.searchParams.set('source', 'artificial-analysis');
    url.searchParams.set('max_results', '1000');
    const result = openRouterBenchmarksSchema.parse(
      await getJson(url, this.headers(), this.options.fetch),
    );
    return result.data;
  }
}
