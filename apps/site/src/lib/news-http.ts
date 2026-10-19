import type { NewsMedia } from '../domain/news-media.ts';

/** Redirections publiques bornées aux origines inscrites pour ce seul éditeur. */
export async function requestNewsPage(
  url: string,
  source: NewsMedia,
  transport: typeof fetch,
): Promise<Response> {
  const origins = new Set([new URL(source.url).origin, ...(source.articleOrigins ?? [])]);
  if (source.fetchUrl) origins.add(new URL(source.fetchUrl).origin);
  let target = new URL(url);
  for (let hop = 0; hop < 4; hop += 1) {
    if (
      target.protocol !== 'https:' ||
      target.username ||
      target.password ||
      target.port ||
      !origins.has(target.origin)
    )
      throw new Error('Redirection hors registre');
    const response = await transport(target.href, {
      headers: { Accept: 'text/html', 'User-Agent': 'SANDBOX-News-Local/1.0' },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) throw new Error('Redirection sans destination');
    target = new URL(location, target);
  }
  throw new Error('Trop de redirections');
}
