import { afterEach, describe, expect, it, vi } from 'vitest';
import { newsWorkerPlan } from '../scripts/news-worker-plan';
import { NEWS_MEDIA } from '../src/domain/news-media';

const env = {
  SANDBOX_NEWS_ORIGIN: 'https://sandbox.test',
  CRON_SECRET: 'fixture-news-worker-secret',
};
const queue = {
  protocolVersion: 2,
  items: [],
  leaseId: null,
  checkedAt: new Date().toISOString(),
  backlog: { pending: 500, ready: 200, oldestPendingAt: null },
  sources: NEWS_MEDIA.map((source) => ({
    id: source.id,
    name: source.name,
    url: source.url,
    ok: true,
  })),
};
afterEach(() => vi.unstubAllGlobals());

describe('planification privée du volume News', () => {
  it('refuse un compteur vide si la file renvoie un candidat prêt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          ...queue,
          backlog: { ...queue.backlog, ready: 0 },
          items: [
            {
              id: 'rundown:/articles/fixture',
              url: 'https://www.therundown.ai/articles/fixture',
              project: 'The Rundown AI',
              repository: 'www.therundown.ai',
              version: 'article',
              kind: 'article',
              headline: 'Fixture',
              publishedAt: new Date().toISOString(),
              category: 'models',
              prerelease: false,
            },
          ],
        }),
      ),
    );
    await expect(newsWorkerPlan(env)).rejects.toThrow('contredit');
  });
  it('lit la file sans réserver de candidat et transmet le secret au seul endpoint prévu', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(queue));
    vi.stubGlobal('fetch', request);
    expect(await newsWorkerPlan(env)).toMatchObject({
      count: 8,
      matrix: { worker: [1, 2, 3, 4, 5, 6, 7, 8] },
    });
    const [url, options] = request.mock.calls[0] ?? [];
    expect(url).toEqual(new URL('https://sandbox.test/api/cron/news-candidates'));
    expect(options).toMatchObject({
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
      redirect: 'error',
      cache: 'no-store',
    });
    expect(options?.method).toBeUndefined();
  });
  it('refuse un accès refusé ou un volume absent sans lancer de traitement', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(newsWorkerPlan(env)).rejects.toThrow('HTTP 401');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ ...queue, backlog: undefined })),
    );
    await expect(newsWorkerPlan(env)).rejects.toThrow('Volume');
  });
  it('refuse les origines non sûres avant tout envoi du secret', async () => {
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    for (const origin of [
      'http://sandbox.test',
      'https://user:pass@sandbox.test',
      'https://sandbox.test/path',
    ])
      await expect(newsWorkerPlan({ ...env, SANDBOX_NEWS_ORIGIN: origin })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
