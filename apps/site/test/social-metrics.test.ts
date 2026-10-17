import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshSocialMetrics } from '../src/domain/social-metrics.ts';
import { POST } from '../src/app/api/admin/social-metrics/route.ts';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('actualisation des métriques sociales', () => {
  it('refuse l’actualisation sans origine locale et session admin', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const response = await POST(
      new Request('http://localhost:3000/api/admin/social-metrics', {
        method: 'POST',
        headers: { origin: 'https://example.com', host: 'localhost:3000' },
        body: '{}',
      }),
    );
    expect(response.status).toBe(403);
  });

  it('signale les intégrations manquantes sans fabriquer de valeurs ni appeler les plateformes', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '');
    vi.stubEnv('INSTAGRAM_ACCESS_TOKEN', '');
    vi.stubEnv('INSTAGRAM_USER_ID', '');
    vi.stubEnv('TIKTOK_ACCESS_TOKEN', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshSocialMetrics();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.sources.map(({ platform, state, views }) => [platform, state, views])).toEqual([
      ['youtube', 'not_configured', null],
      ['instagram', 'not_configured', null],
      ['tiktok', 'not_configured', null],
      ['x', 'unavailable', null],
    ]);
    expect(result.refreshedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
  });

  it('récupère et valide les statistiques YouTube publiques de la chaîne', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
    vi.stubEnv('INSTAGRAM_ACCESS_TOKEN', '');
    vi.stubEnv('INSTAGRAM_USER_ID', '');
    vi.stubEnv('TIKTOK_ACCESS_TOKEN', '');
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestedUrl =
        input instanceof URL ? input.toString() : input instanceof Request ? input.url : input;
      expect(requestedUrl).toContain('youtube/v3/channels');
      return new Response(
        JSON.stringify({
          items: [{ statistics: { viewCount: '12345', subscriberCount: '67', videoCount: '8' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await refreshSocialMetrics();

    expect(result.sources[0]).toMatchObject({
      platform: 'youtube',
      state: 'connected',
      followers: 67,
      views: 12345,
      publications: 8,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
