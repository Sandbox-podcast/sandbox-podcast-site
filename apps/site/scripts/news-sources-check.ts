import { mkdir, writeFile } from 'node:fs/promises';
import { NEWS_MEDIA } from '../src/domain/news-media.ts';
import { readLimitedBody } from '../src/lib/limited-body.ts';

const folder = new URL('../../../.local/news-sources-2026-10-19/', import.meta.url);
await mkdir(folder, { recursive: true });
const results: {
  id: string;
  requested: string;
  url: string;
  status?: number;
  error?: string;
  redirects: string[];
}[] = [];
let index = 0;
async function worker() {
  while (index < NEWS_MEDIA.length) {
    const source = NEWS_MEDIA[index++];
    if (!source) break;
    let url: string = source.url;
    const redirects: string[] = [];
    try {
      let response: Response | undefined;
      for (let hop = 0; hop < 4; hop += 1) {
        response = await fetch(url, {
          redirect: 'manual',
          signal: AbortSignal.timeout(15_000),
          headers: { Accept: 'text/html', 'User-Agent': 'SANDBOX-News-Local/1.0' },
        });
        const location = response.headers.get('location');
        if (response.status < 300 || response.status >= 400 || !location) break;
        const next = new URL(location, url);
        if (
          next.protocol !== 'https:' ||
          next.username ||
          next.password ||
          next.port ||
          /^(?:localhost|\d|\[)/.test(next.hostname)
        )
          throw new Error('Redirection refusée');
        redirects.push(next.href);
        url = next.href;
        await response.body?.cancel();
      }
      if (!response) throw new Error('Réponse absente');
      const body = await readLimitedBody(response.body, 6_000_000);
      if (body) await writeFile(new URL(`${source.id}.html`, folder), body);
      results.push({
        id: source.id,
        requested: source.url,
        url,
        status: response.status,
        redirects,
      });
    } catch (error) {
      results.push({
        id: source.id,
        requested: source.url,
        url,
        redirects,
        error: error instanceof Error ? error.message : 'Lecture impossible',
      });
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
await writeFile(new URL('http-report.json', folder), JSON.stringify(results, null, 2));
console.log(
  JSON.stringify({
    total: results.length,
    ok: results.filter((row) => row.status === 200).length,
    issues: results.filter((row) => row.status !== 200 || row.redirects.length > 0),
  }),
);
