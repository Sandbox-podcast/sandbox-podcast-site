import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  enabled: true,
  read: vi.fn(async () => ({ items: [], next: null })),
  complete: vi.fn(async () => ({ updated: 1 })),
  revalidate: vi.fn(),
}));
vi.mock('@/lib/news-store', () => ({
  newsPublicEnabled: () => state.enabled,
  readNewsTranslationBacklog: state.read,
  completeNewsTranslations: state.complete,
}));
vi.mock('next/cache', () => ({ revalidatePath: state.revalidate }));
import { GET, POST } from '../src/app/api/cron/news-translations/route.ts';
beforeEach(() => {
  vi.clearAllMocks();
  state.enabled = true;
  vi.stubEnv('CRON_SECRET', 'translation-test-secret-long-enough');
});
afterEach(() => vi.unstubAllEnvs());
const request = (method: string, body?: string, authorized = true) =>
  new Request('https://sandboxpodcast.fr/api/cron/news-translations', {
    method,
    ...(body === undefined ? {} : { body }),
    headers: authorized ? { authorization: 'Bearer translation-test-secret-long-enough' } : {},
  });
describe('reprise authentifiée des traductions News', () => {
  it('refuse toute lecture ou écriture sans secret et quand News est désactivé', async () => {
    expect((await GET(request('GET', undefined, false))).status).toBe(401);
    expect((await POST(request('POST', '[]', false))).status).toBe(401);
    state.enabled = false;
    expect((await GET(request('GET'))).status).toBe(404);
    expect(state.read).not.toHaveBeenCalled();
    expect(state.complete).not.toHaveBeenCalled();
  });
  it('borne le corps et réactualise les quatre pages après complément', async () => {
    expect((await POST(request('POST', ' '.repeat(256001)))).status).toBe(413);
    expect((await POST(request('POST', '[]'))).status).toBe(200);
    expect(state.complete).toHaveBeenCalledWith([]);
    expect(state.revalidate.mock.calls).toEqual([
      ['/news'],
      ['/en/news'],
      ['/es-es/news'],
      ['/de-de/news'],
    ]);
    expect((await GET(request('GET'))).status).toBe(200);
  });
});
