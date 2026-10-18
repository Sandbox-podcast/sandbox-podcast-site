import { z } from 'zod';
import { NEWS_MEDIA } from '../src/domain/news-media.ts';
import { knownNewsUrlsSchema } from '../src/domain/news-publishing.ts';
import { collectMediaNewsPreview } from '../src/pipeline/news-media-preview.ts';
import {
  generateAndTranslateNews,
  newsSourceExcerptHash,
} from '../src/pipeline/news-generation.ts';

const originValue = process.env['SANDBOX_NEWS_ORIGIN'] ?? 'https://www.sandboxpodcast.fr';
const secret = process.env['CRON_SECRET'] ?? '';
const responseSchema = z.object({ inserted: z.number().int().nonnegative() });

function endpoint(): string {
  const origin = new URL(originValue);
  if (origin.protocol !== 'https:' || origin.username || origin.password)
    throw new Error('SANDBOX_NEWS_ORIGIN doit être une origine HTTPS sans identifiant.');
  return new URL('/api/cron/news-ingest', origin).href;
}

async function request(url: string, method: 'GET' | 'POST', body?: string): Promise<unknown> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body } : {}),
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(method === 'GET' ? 30_000 : 60_000),
  });
  if (!response.ok) throw new Error(`API SANDBOX News : HTTP ${response.status}.`);
  return response.json() as Promise<unknown>;
}

async function main(): Promise<void> {
  if (secret.length < 16) throw new Error('CRON_SECRET SANDBOX News absent ou trop court.');
  const api = endpoint();
  const known = knownNewsUrlsSchema.parse(await request(api, 'GET'));
  const knownUrls = new Set(known.urls);
  const collected = await collectMediaNewsPreview({ checkedAt: null, sources: [], items: [] });
  const candidates = collected.items.filter((item) => !knownUrls.has(item.url)).slice(0, 20);
  const excerptHashes = new Map(
    candidates.flatMap((item) =>
      item.sourceExcerpt ? [[item.url, newsSourceExcerptHash(item.sourceExcerpt)] as const] : [],
    ),
  );
  const generated = await generateAndTranslateNews(candidates);
  const sourceByUrl = new Map<string, (typeof NEWS_MEDIA)[number]>(
    NEWS_MEDIA.map((source) => [source.url, source]),
  );
  const sources = collected.sources.map((source) => {
    const definition = sourceByUrl.get(source.url ?? '');
    if (!definition) throw new Error('Le collecteur News a renvoyé une source inconnue.');
    return {
      id: definition.id,
      name: source.name,
      url: source.url ?? definition.url,
      ok: source.ok,
      ...(source.reason ? { reason: source.reason } : {}),
    };
  });
  const payload = {
    checkedAt: collected.checkedAt,
    sources,
    items: generated.items.map((item) => ({
      item,
      ...(excerptHashes.has(item.url) ? { sourceExcerptHash: excerptHashes.get(item.url) } : {}),
    })),
  };
  const published = responseSchema.parse(await request(api, 'POST', JSON.stringify(payload)));
  const availableSources = sources.filter((source) => source.ok).length;
  console.log(
    JSON.stringify({
      sources: `${availableSources}/${sources.length}`,
      candidates: candidates.length,
      generated: generated.generated,
      skipped: generated.skipped,
      published: published.inserted,
    }),
  );
  if (availableSources === 0) throw new Error('Aucune source SANDBOX News accessible.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Échec du rafraîchissement SANDBOX News.');
  process.exitCode = 1;
});
