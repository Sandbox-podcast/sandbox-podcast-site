import { describe, expect, it, vi } from 'vitest';
import { GithubClient, GithubRateLimitError } from '../src/pipeline/github-client.ts';

describe('client GitHub', () => {
  it('valide un lot GraphQL et conserve les dépôts valides malgré une erreur partielle', async () => {
    const repository = {
      databaseId: 1,
      name: 'one',
      nameWithOwner: 'sandbox/one',
      owner: { login: 'sandbox' },
      description: 'AI project',
      homepageUrl: null,
      url: 'https://github.com/sandbox/one',
      primaryLanguage: { name: 'TypeScript' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-10-05T02:00:00Z',
      pushedAt: '2026-10-05T00:00:00Z',
      defaultBranchRef: { name: 'main', target: { history: { totalCount: 12 } } },
      isArchived: false,
      isFork: false,
      isDisabled: false,
      isPrivate: false,
      stargazerCount: 1000,
      forkCount: 100,
      watchers: { totalCount: 30 },
      issues: { totalCount: 10 },
      pullRequests: { totalCount: 4 },
      repositoryTopics: { nodes: [{ topic: { name: 'ai-agent' } }] },
    };
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            r0: repository,
            r1: null,
            rateLimit: { remaining: 100, resetAt: '2026-10-05T03:00:00Z' },
          },
          errors: [{ path: ['r1'], type: 'NOT_FOUND', message: 'Repository not found' }],
        }),
      ),
    );
    const result = await new GithubClient({ token: 'test-token', fetch: request }).batch(
      ['sandbox/one', 'sandbox/deleted'],
      '2026-09-28T00:00:00Z',
    );
    expect(result[0]?.repository).toMatchObject({
      stargazers_count: 1000,
      subscribers_count: 30,
      open_issues_count: 14,
    });
    expect(result[0]?.commits7d).toBe(12);
    expect(result[1]?.repository).toBeNull();
    expect(result[1]?.error).toBe('Repository not found');
    expect(request).toHaveBeenCalledOnce();
  });
  it('un quota secondaire sans Retry-After interrompt les appels suivants', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: 'You have exceeded a secondary rate limit.' }), {
        status: 403,
      }),
    );
    const client = new GithubClient({
      fetch: request,
      now: () => Date.parse('2026-10-05T02:00:00Z'),
    });
    await expect(client.repository('sandbox/project')).rejects.toBeInstanceOf(GithubRateLimitError);
    await expect(client.repository('sandbox/other')).rejects.toBeInstanceOf(GithubRateLimitError);
    expect(request).toHaveBeenCalledOnce();
  });
  it("arrête les appels jusqu'au reset après un quota épuisé", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', {
        status: 403,
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '2000000000' },
      }),
    );
    const client = new GithubClient({ fetch: fetcher, now: () => 1000000000000 });
    await expect(client.repository('example/repo')).rejects.toBeInstanceOf(GithubRateLimitError);
    await expect(client.repository('example/other')).rejects.toBeInstanceOf(GithubRateLimitError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('borne les tentatives et applique un délai après une erreur serveur', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 503 }));
    const sleep = vi.fn(async () => undefined);
    await expect(
      new GithubClient({ fetch: fetcher, sleep }).repository('example/repo'),
    ).rejects.toThrow('503');
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toHaveLength(2);
  });
  it('valide le contenu externe et refuse les identifiants pouvant injecter une requête', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"stargazers_count":-1}', { status: 200 }));
    const client = new GithubClient({ fetch: fetcher });
    await expect(client.repository('example/repo')).rejects.toThrow();
    await expect(client.repository('example/repo?token=secret')).rejects.toThrow('invalide');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
