import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  enabled: false,
  knownNewsUrls: vi.fn(async () => ['https://www.therundown.ai/articles/test']),
  publishNewsBatch: vi.fn(async () => ({ inserted: 1 })),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/news-store', () => ({
  newsPublicEnabled: () => state.enabled,
  knownNewsUrls: state.knownNewsUrls,
  publishNewsBatch: state.publishNewsBatch,
}));
vi.mock('next/cache', () => ({ revalidatePath: state.revalidatePath }));

import { GET, POST } from '../src/app/api/cron/news-ingest/route.ts';

afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  state.enabled = false;
  state.knownNewsUrls.mockClear();
  state.publishNewsBatch.mockClear();
  state.revalidatePath.mockClear();
});

function request(method: 'GET' | 'POST', body?: string, authorization?: string): Request {
  return new Request('https://sandboxpodcast.fr/api/cron/news-ingest', {
    method,
    ...(body === undefined ? {} : { body }),
    ...(authorization ? { headers: { authorization, 'content-type': 'application/json' } } : {}),
  });
}

describe('API du collecteur automatique SANDBOX News', () => {
  it('reste fermée tant que la publication News est désactivée', async () => {
    const response = await GET(request('GET'));
    expect(response.status).toBe(404);
    expect(state.knownNewsUrls).not.toHaveBeenCalled();
  });

  it('exige le secret cron avant de lire les URL déjà traitées', async () => {
    state.enabled = true;
    vi.stubEnv('CRON_SECRET', 'a-secret-long-enough-for-the-test');
    const denied = await GET(request('GET'));
    const allowed = await GET(
      request('GET', undefined, 'Bearer a-secret-long-enough-for-the-test'),
    );

    expect(denied.status).toBe(401);
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ urls: ['https://www.therundown.ai/articles/test'] });
    expect(state.knownNewsUrls).toHaveBeenCalledTimes(1);
  });

  it('borne le corps et réactualise les quatre pages après publication', async () => {
    state.enabled = true;
    vi.stubEnv('CRON_SECRET', 'a-secret-long-enough-for-the-test');
    const authorization = 'Bearer a-secret-long-enough-for-the-test';
    const oversized = await POST(request('POST', ' '.repeat(256_001), authorization));
    const published = await POST(request('POST', '{"items":[]}', authorization));

    expect(oversized.status).toBe(413);
    expect(state.publishNewsBatch).toHaveBeenCalledWith({ items: [] });
    expect(published.status).toBe(200);
    expect(state.revalidatePath).toHaveBeenNthCalledWith(1, '/news');
    expect(state.revalidatePath).toHaveBeenNthCalledWith(2, '/en/news');
    expect(state.revalidatePath).toHaveBeenNthCalledWith(3, '/es-es/news');
    expect(state.revalidatePath).toHaveBeenNthCalledWith(4, '/de-de/news');
    expect(state.revalidatePath).toHaveBeenNthCalledWith(5, '/', 'layout');
  });
});
