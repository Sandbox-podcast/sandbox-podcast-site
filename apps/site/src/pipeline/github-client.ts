import { z } from 'zod';
import { githubRepositorySchema, type GithubRepository } from '../domain/github-charts.ts';

export class GithubRateLimitError extends Error {
  readonly resetAt: string;
  constructor(resetAt: string) {
    super(`Quota GitHub atteint. Reprise après ${resetAt}.`);
    this.resetAt = resetAt;
    this.name = 'GithubRateLimitError';
  }
}
const repositoryGraphSchema = z.object({
  databaseId: z.number().int().positive(),
  name: z.string(),
  nameWithOwner: z.string(),
  owner: z.object({ login: z.string() }),
  description: z.string().nullable(),
  homepageUrl: z.string().nullable(),
  url: z.url(),
  primaryLanguage: z.object({ name: z.string() }).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  pushedAt: z.iso.datetime().nullable(),
  defaultBranchRef: z
    .object({
      name: z.string(),
      target: z.object({
        history: z.object({ totalCount: z.number().int().nonnegative() }).optional(),
      }),
    })
    .nullable(),
  isArchived: z.boolean(),
  isFork: z.boolean(),
  isDisabled: z.boolean(),
  isPrivate: z.boolean(),
  stargazerCount: z.number().int().nonnegative(),
  forkCount: z.number().int().nonnegative(),
  watchers: z.object({ totalCount: z.number().int().nonnegative() }),
  issues: z.object({ totalCount: z.number().int().nonnegative() }),
  pullRequests: z.object({ totalCount: z.number().int().nonnegative() }),
  repositoryTopics: z.object({
    nodes: z.array(z.object({ topic: z.object({ name: z.string() }) })),
  }),
});
const graphResponseSchema = z.object({
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  errors: z
    .array(
      z.object({
        message: z.string(),
        type: z.string().optional(),
        path: z.array(z.union([z.string(), z.number()])).optional(),
      }),
    )
    .default([]),
});
export interface GithubBatchResult {
  fullName: string;
  repository: GithubRepository | null;
  commits7d: number | null;
  error: string | null;
}
export class GithubClient {
  private blockedUntil = 0;
  private readonly options: {
    token?: string | undefined;
    fetch?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
  };
  constructor(
    options: {
      token?: string | undefined;
      fetch?: typeof fetch;
      sleep?: (ms: number) => Promise<void>;
      now?: () => number;
    } = {},
  ) {
    this.options = options;
  }
  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
  private async sleep(ms: number): Promise<void> {
    return this.options.sleep
      ? this.options.sleep(ms)
      : new Promise((resolve) => setTimeout(resolve, ms));
  }
  private async request(path: string, init?: RequestInit): Promise<unknown> {
    if (this.now() < this.blockedUntil)
      throw new GithubRateLimitError(new Date(this.blockedUntil).toISOString());
    const token = this.options.token ?? process.env['GITHUB_TOKEN'];
    const headers = new Headers({
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
      'User-Agent': 'SANDBOX-CHARTS',
    });
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init?.body) headers.set('Content-Type', 'application/json');
    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response;
      try {
        response = await (this.options.fetch ?? fetch)(`https://api.github.com${path}`, {
          ...init,
          headers,
          signal: AbortSignal.timeout(15000),
          cache: 'no-store',
          redirect: 'error',
        });
      } catch (error) {
        if (attempt === 2)
          throw new Error(
            `GitHub indisponible : ${error instanceof Error ? error.name : 'connexion'}`,
            { cause: error },
          );
        await this.sleep(500 * 2 ** attempt);
        continue;
      }
      const forbidden =
        response.status === 403
          ? z.object({ message: z.string().max(10000) }).safeParse(
              await response
                .clone()
                .json()
                .catch(() => null),
            )
          : null;
      const secondaryLimit =
        forbidden?.success === true && /rate limit|abuse detection/i.test(forbidden.data.message);
      if (
        response.status === 429 ||
        (response.status === 403 &&
          (response.headers.get('x-ratelimit-remaining') === '0' ||
            response.headers.has('retry-after') ||
            secondaryLimit))
      ) {
        this.blockedUntil = Math.max(
          this.now() + Math.max(60, Number(response.headers.get('retry-after') ?? 0)) * 1000,
          Number(response.headers.get('x-ratelimit-reset') ?? 0) * 1000,
        );
        throw new GithubRateLimitError(new Date(this.blockedUntil).toISOString());
      }
      if (response.status >= 500 && attempt < 2) {
        await this.sleep(500 * 2 ** attempt);
        continue;
      }
      if (!response.ok)
        throw new Error(`GitHub HTTP ${response.status.toString()} (${path.split('?')[0] ?? ''}).`);
      if (response.headers.get('x-ratelimit-remaining') === '0')
        this.blockedUntil = Math.max(
          this.now() + 60000,
          Number(response.headers.get('x-ratelimit-reset') ?? 0) * 1000,
        );
      return (await response.json()) as unknown;
    }
    throw new Error('GitHub ne répond pas après trois tentatives.');
  }
  async repository(fullName: string): Promise<GithubRepository> {
    if (!/^[\w.-]+\/[\w.-]+$/.test(fullName)) throw new Error('Identifiant GitHub invalide.');
    return githubRepositorySchema.parse(await this.request(`/repos/${fullName}`));
  }
  async search(
    topic: string,
    page = 1,
  ): Promise<{ repositories: GithubRepository[]; next: boolean }> {
    const query = new URLSearchParams({
      q: `topic:${topic} fork:false archived:false is:public`,
      sort: 'updated',
      order: 'desc',
      per_page: '100',
      page: String(page),
    });
    const parsed = z
      .object({
        total_count: z.number(),
        incomplete_results: z.boolean(),
        items: z.array(githubRepositorySchema),
      })
      .parse(await this.request(`/search/repositories?${query}`));
    return { repositories: parsed.items, next: page * 100 < Math.min(parsed.total_count, 1000) };
  }
  /** Vingt dépôts par appel, sans pagination des commits ou N+1 réseau. */
  async batch(fullNames: readonly string[], since: string): Promise<GithubBatchResult[]> {
    if (fullNames.length > 20 || fullNames.some((name) => !/^[\w.-]+\/[\w.-]+$/.test(name)))
      throw new Error('Lot GitHub invalide (20 dépôts maximum).');
    if (!(this.options.token ?? process.env['GITHUB_TOKEN']))
      throw new Error('GITHUB_TOKEN requis pour la collecte GraphQL.');
    const fields = `databaseId name nameWithOwner owner { login } description homepageUrl url primaryLanguage { name } createdAt updatedAt pushedAt defaultBranchRef { name target { ... on Commit { history(since: $since) { totalCount } } } } isArchived isFork isDisabled isPrivate stargazerCount forkCount watchers { totalCount } issues(states: OPEN) { totalCount } pullRequests(states: OPEN) { totalCount } repositoryTopics(first: 20) { nodes { topic { name } } }`;
    const repos = fullNames
      .map((name, index) => {
        const [owner, repo] = name.split('/');
        return `r${index.toString()}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}) { ${fields} }`;
      })
      .join('\n');
    const parsed = graphResponseSchema.parse(
      await this.request('/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: `query($since: GitTimestamp!) { ${repos} rateLimit { remaining resetAt cost } }`,
          variables: { since },
        }),
      }),
    );
    const rate = z
      .object({ remaining: z.number(), resetAt: z.iso.datetime() })
      .safeParse(parsed.data?.['rateLimit']);
    if (rate.success && rate.data.remaining <= 0) this.blockedUntil = Date.parse(rate.data.resetAt);
    if (parsed.errors.some((error) => error.type === 'RATE_LIMITED'))
      throw new GithubRateLimitError(
        rate.success ? rate.data.resetAt : new Date(this.now() + 60000).toISOString(),
      );
    return fullNames.map((fullName, index) => {
      const alias = `r${index.toString()}`;
      const errors = parsed.errors.filter((error) => !error.path || error.path[0] === alias);
      const result = repositoryGraphSchema.safeParse(parsed.data?.[alias]);
      if (!result.success || errors.length > 0)
        return {
          fullName,
          repository: null,
          commits7d: null,
          error: errors[0]?.message ?? 'Dépôt absent, privé ou réponse invalide.',
        };
      const repo = result.data;
      return {
        fullName,
        commits7d: repo.defaultBranchRef?.target.history?.totalCount ?? null,
        error: null,
        repository: githubRepositorySchema.parse({
          id: repo.databaseId,
          name: repo.name,
          full_name: repo.nameWithOwner,
          owner: repo.owner,
          description: repo.description,
          homepage: repo.homepageUrl,
          html_url: repo.url,
          language: repo.primaryLanguage?.name ?? null,
          created_at: repo.createdAt,
          updated_at: repo.updatedAt,
          pushed_at: repo.pushedAt,
          default_branch: repo.defaultBranchRef?.name ?? '',
          archived: repo.isArchived,
          fork: repo.isFork,
          disabled: repo.isDisabled,
          private: repo.isPrivate,
          stargazers_count: repo.stargazerCount,
          forks_count: repo.forkCount,
          subscribers_count: repo.watchers.totalCount,
          open_issues_count: repo.issues.totalCount + repo.pullRequests.totalCount,
          topics: repo.repositoryTopics.nodes.map((node) => node.topic.name),
        }),
      };
    });
  }
}
