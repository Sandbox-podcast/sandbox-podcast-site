import { parseYouTubePage } from '../domain/youtube-page.ts';
import { readLimitedBody } from './limited-body.ts';

const MAX_PAGE_BYTES = 5_000_000;

export async function fetchYouTubePageMetadata(videoId: string) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error('Identifiant YouTube invalide.');
  const url = new URL('https://www.youtube.com/watch');
  url.searchParams.set('v', videoId);
  url.searchParams.set('hl', 'fr');
  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'error',
    headers: { Accept: 'text/html', 'Accept-Language': 'fr-FR,fr;q=0.9' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok || !response.body) return undefined;
  if (Number(response.headers.get('content-length')) > MAX_PAGE_BYTES) {
    await response.body.cancel();
    return undefined;
  }
  const body = await readLimitedBody(response.body, MAX_PAGE_BYTES);
  return body ? parseYouTubePage(new TextDecoder().decode(body), videoId) : undefined;
}
