import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseYouTubePage } from '../src/domain/youtube-page.ts';
import { fetchYouTubePageMetadata } from '../src/lib/youtube-page.ts';
import { youtubePlayerFixture, youtubeVideoId, youtubeWatchHtml } from './fixtures/youtube-page.ts';

afterEach(() => vi.unstubAllGlobals());

describe('métadonnées de la page publique YouTube', () => {
  it('lit la date de publication, la durée et la description de la vidéo demandée', () => {
    const metadata = parseYouTubePage(youtubeWatchHtml(), youtubeVideoId);
    expect(metadata).toMatchObject({
      videoId: youtubeVideoId,
      title: 'Épisode public',
      publishedAt: '2026-10-12T19:52:24.000Z',
      durationSec: 4702,
      source: 'youtube-page',
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
      chapters: [
        { at: 0, title: 'Introduction' },
        { at: 312, title: 'Démonstration' },
      ],
    });
    expect(metadata?.resources).toContainEqual({
      kind: 'repo',
      label: 'Code',
      url: 'https://github.com/sandbox/demo',
    });
  });

  it('respecte les accolades, guillemets et antislashs dans les chaînes JSON', () => {
    const player = youtubePlayerFixture();
    player.videoDetails.shortDescription =
      'Un exemple { "texte": "C:\\video" } et une autre } accolade.';
    const html = youtubeWatchHtml(player).replace(
      'var ytInitialPlayerResponse',
      'window["ytInitialPlayerResponse"]',
    );
    expect(parseYouTubePage(html, youtubeVideoId)?.description).toBe(
      player.videoDetails.shortDescription,
    );
  });

  it('conserve une date fournie sans heure et refuse les dates invalides ou absentes', () => {
    const player = youtubePlayerFixture();
    player.microformat.playerMicroformatRenderer.publishDate = '2026-10-12';
    expect(parseYouTubePage(youtubeWatchHtml(player), youtubeVideoId)?.publishedAt).toBe(
      '2026-10-12T00:00:00.000Z',
    );
    for (const date of ['', '2026-02-30', '12 octobre 2026']) {
      player.microformat.playerMicroformatRenderer.publishDate = date;
      expect(
        parseYouTubePage(youtubeWatchHtml(player), youtubeVideoId)?.publishedAt,
      ).toBeUndefined();
    }
  });

  it.each(['0', '-1', 'NaN', '4702.5', '9007199254740992'])(
    'ne fabrique pas de durée depuis %s',
    (duration) => {
      const player = youtubePlayerFixture();
      player.videoDetails.lengthSeconds = duration;
      const metadata = parseYouTubePage(youtubeWatchHtml(player), youtubeVideoId);
      expect(metadata?.durationSec).toBeUndefined();
      expect(metadata?.publishedAt).toBe('2026-10-12T19:52:24.000Z');
    },
  );

  it('refuse une vidéo différente, privée, programmée ou en direct', () => {
    expect(parseYouTubePage(youtubeWatchHtml(), 'dQw4w9WgXcQ')).toBeUndefined();
    const player = youtubePlayerFixture();
    expect(
      parseYouTubePage(
        youtubeWatchHtml({ ...player, playabilityStatus: { status: 'LOGIN_REQUIRED' } }),
        youtubeVideoId,
      ),
    ).toBeUndefined();
    for (const flag of ['isLive', 'isUpcoming']) {
      expect(
        parseYouTubePage(
          youtubeWatchHtml({ ...player, videoDetails: { ...player.videoDetails, [flag]: true } }),
          youtubeVideoId,
        ),
      ).toBeUndefined();
    }
    expect(
      parseYouTubePage(
        youtubeWatchHtml({
          ...player,
          microformat: { playerMicroformatRenderer: { liveBroadcastDetails: { isLiveNow: true } } },
        }),
        youtubeVideoId,
      ),
    ).toBeUndefined();
  });

  it.each([
    '<html>Consentement requis</html>',
    '<script>var ytInitialPlayerResponse = {"videoDetails":',
    '<script>var ytInitialPlayerResponse = {malformed: true};</script>',
    youtubeWatchHtml({ videoDetails: { videoId: youtubeVideoId } }),
  ])('ignore les pages sans données valides', (html) => {
    expect(parseYouTubePage(html, youtubeVideoId)).toBeUndefined();
  });
});

describe('lecture réseau de la page YouTube', () => {
  it('utilise seulement une URL YouTube fixe, sans redirection, avec un délai borné', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(youtubeWatchHtml()));
    vi.stubGlobal('fetch', fetchMock);
    expect((await fetchYouTubePageMetadata(youtubeVideoId))?.durationSec).toBe(4702);
    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(`https://www.youtube.com/watch?v=${youtubeVideoId}&hl=fr`);
    expect(options).toMatchObject({
      cache: 'no-store',
      redirect: 'error',
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    await expect(fetchYouTubePageMetadata('../evil')).rejects.toThrow('Identifiant');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('borne les réponses même sans Content-Length', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(5_000_001));
      },
      cancel,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    expect(await fetchYouTubePageMetadata(youtubeVideoId)).toBeUndefined();
    expect(cancel).toHaveBeenCalledOnce();
  });
});
