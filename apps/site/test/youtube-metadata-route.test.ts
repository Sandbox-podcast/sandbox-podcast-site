import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createEpisodeFromYouTube } from '../src/domain/episode-import.ts';
import { youtubePlayerFixture, youtubeVideoId, youtubeWatchHtml } from './fixtures/youtube-page.ts';

const auth = vi.hoisted<{ role: string | undefined }>(() => ({ role: 'admin' }));
vi.mock('../src/lib/admin-auth-db.ts', () => ({
  getAuthenticatedAdmin: async () => (auth.role ? { role: auth.role } : undefined),
  adminCan: (user: { role: string }) => ['admin', 'editor'].includes(user.role),
}));
import { POST } from '../src/app/api/admin/youtube-metadata/route.ts';

const metadataSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  channel: z.string(),
  thumbnailUrl: z.url(),
  publishedAt: z.iso.datetime().optional(),
  durationSec: z.number().int().positive().optional(),
  source: z.enum(['youtube-data-api', 'youtube-page', 'oembed']),
  description: z.string().default(''),
});

function request(url = `https://youtu.be/${youtubeVideoId}`, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/admin/youtube-metadata', {
    method: 'POST',
    headers: { origin, host: 'localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
}

beforeEach(() => {
  auth.role = 'admin';
  vi.stubEnv('YOUTUBE_API_KEY', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('import YouTube authentifié', () => {
  it('permet de construire un épisode publiable sans clé API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(youtubeWatchHtml()));
    vi.stubGlobal('fetch', fetchMock);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const metadata = metadataSchema.parse(await response.json());
    expect(metadata.source).toBe('youtube-page');
    const episode = createEpisodeFromYouTube({
      number: 2,
      metadata,
      description: metadata.description,
      hosts: ['lou'],
      status: 'published',
    });
    expect(episode).toMatchObject({
      publishedAt: '2026-10-12T19:52:24.000Z',
      durationSec: 4702,
      status: 'published',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('www.youtube.com/watch?');
  });

  it('retombe sur la page publique si une clé configurée échoue', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', 'invalid-test-key');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 403 }))
      .mockResolvedValueOnce(new Response(youtubeWatchHtml()));
    vi.stubGlobal('fetch', fetchMock);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(metadataSchema.parse(await response.json()).source).toBe('youtube-page');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('conserve la date publique pour compléter ensuite la durée depuis le lecteur', async () => {
    const player = youtubePlayerFixture();
    player.videoDetails.lengthSeconds = '0';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(youtubeWatchHtml(player))));
    const metadata = metadataSchema.parse(await (await POST(request())).json());
    expect(metadata.publishedAt).toBe('2026-10-12T19:52:24.000Z');
    expect(metadata.durationSec).toBeUndefined();
    const episode = createEpisodeFromYouTube({
      number: 2,
      metadata: { ...metadata, durationSec: 4702 },
      description: metadata.description,
      hosts: ['lou'],
      status: 'draft',
    });
    expect(episode.durationSec).toBe(4702);
  });

  it('garde oEmbed en secours sans inventer une date lorsque la page est inaccessible', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new DOMException('Timeout', 'TimeoutError'))
        .mockResolvedValueOnce(
          Response.json({
            title: 'Épisode public',
            author_name: 'Sandbox',
            thumbnail_url: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
          }),
        ),
    );
    const response = await POST(request());
    const metadata = metadataSchema.parse(await response.json());
    expect(response.status).toBe(200);
    expect(metadata.source).toBe('oembed');
    expect(metadata.publishedAt).toBeUndefined();
    const episode = createEpisodeFromYouTube({
      number: 2,
      metadata,
      description: 'Un épisode.',
      hosts: ['lou'],
      status: 'published',
      addedAt: '2026-10-19T08:15:00.000Z',
    });
    expect(episode.publishedAt).toBe('2026-10-19T08:15:00.000Z');
    expect(episode.durationSec).toBeUndefined();
  });

  it('signale une panne sans exposer de détails techniques', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network secret')));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Les informations YouTube sont momentanément indisponibles.',
    });
  });

  it('refuse une origine externe et les URL hors YouTube avant tout accès réseau', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await POST(request(undefined, 'https://evil.example'))).status).toBe(403);
    expect((await POST(request('https://127.0.0.1/private'))).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, 'viewer'])(
    'refuse un compte sans permission de brouillon (%s)',
    async (role) => {
      auth.role = role;
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      expect((await POST(request())).status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
