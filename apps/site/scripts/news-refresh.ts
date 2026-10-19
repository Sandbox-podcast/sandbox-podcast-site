import { z } from 'zod';
import { NEWS_MEDIA } from '../src/domain/news-media.ts';
import {
  newsPendingSchema,
  newsRequestBatches,
  newsPublicationFromQueue,
} from '../src/domain/news-queue.ts';
import { drainNewsQueue } from '../src/domain/news-worker.ts';
import { collectMediaNewsPreview } from '../src/pipeline/news-media-preview.ts';
import {
  generateAndTranslateNews,
  newsSourceExcerptHash,
} from '../src/pipeline/news-generation.ts';

const originValue = process.env['SANDBOX_NEWS_ORIGIN'] ?? 'https://www.sandboxpodcast.fr';
const secret = process.env['CRON_SECRET'] ?? '';
const responseSchema = z.object({ inserted: z.number().int().nonnegative() });
function endpoint(path: string): string {
  const origin = new URL(originValue);
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  )
    throw new Error('SANDBOX_NEWS_ORIGIN doit être une origine HTTPS sans identifiant.');
  return new URL(path, origin).href;
}
async function request(path: string, method: 'GET' | 'POST', payload?: unknown): Promise<unknown> {
  const response = await fetch(endpoint(path), {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(method === 'GET' ? 30_000 : 60_000),
  });
  if (!response.ok) throw new Error(`API SANDBOX News : HTTP ${response.status}.`);
  return response.json() as Promise<unknown>;
}
async function collect(): Promise<void> {
  const feed = await collectMediaNewsPreview({ checkedAt: null, sources: [], items: [] });
  const sources = feed.sources.map((status, index) => {
    const source = NEWS_MEDIA[index];
    if (!source) throw new Error('Source hors registre.');
    return {
      id: source.id,
      name: source.name,
      url: source.url,
      ok: status.ok,
      ...(status.reason ? { reason: status.reason } : {}),
    };
  });
  await request('/api/cron/news-ingest', 'POST', { checkedAt: feed.checkedAt, sources, items: [] });
  let queued = 0;
  for (const items of newsRequestBatches(feed.items)) {
    queued += responseSchema.parse(
      await request('/api/cron/news-candidates', 'POST', { action: 'collect', items }),
    ).inserted;
  }
  console.log(
    JSON.stringify({
      phase: 'collect',
      sources: `${sources.filter((source) => source.ok).length}/${sources.length}`,
      detected: feed.items.length,
      queued,
      sourceFailures: sources
        .filter((source) => !source.ok)
        .map(({ id, reason }) => ({ id, reason })),
    }),
  );
  if (!sources.some((source) => source.ok))
    throw new Error('Aucune source SANDBOX News accessible.');
}
async function processPending(): Promise<{
  candidates: number;
  published: number;
  skipped: number;
}> {
  const pending = newsPendingSchema.parse(
    await request('/api/cron/news-candidates', 'POST', { action: 'claim' }),
  );
  console.log(JSON.stringify({ phase: 'queue', ...pending.backlog }));
  if (!pending.items.length) {
    console.log(JSON.stringify({ phase: 'process', pending: 0 }));
    return { candidates: 0, published: 0, skipped: 0 };
  }
  if (!pending.leaseId) throw new Error('Réservation News absente.');
  const hashes = new Map(
    pending.items.flatMap((item) =>
      item.sourceExcerpt ? [[item.url, newsSourceExcerptHash(item.sourceExcerpt)] as const] : [],
    ),
  );
  const generated = await generateAndTranslateNews(pending.items);
  let inserted = 0;
  for (const items of newsRequestBatches(generated.items)) {
    const payload = newsPublicationFromQueue(
      pending,
      items.map((item) => ({
        item,
        ...(hashes.has(item.url) ? { sourceExcerptHash: hashes.get(item.url) } : {}),
      })),
    );
    inserted += responseSchema.parse(
      await request('/api/cron/news-ingest', 'POST', payload),
    ).inserted;
  }
  const published = generated.items.map((item) => item.url);
  const skipped = pending.items
    .filter((item) => !published.includes(item.url))
    .map((item) => item.url);
  await request('/api/cron/news-candidates', 'POST', {
    action: 'complete',
    leaseId: pending.leaseId,
    published,
    skipped,
  });
  console.log(
    JSON.stringify({
      phase: 'process',
      candidates: pending.items.length,
      generated: generated.generated,
      skipped: skipped.length,
      published: inserted,
    }),
  );
  return { candidates: pending.items.length, published: inserted, skipped: skipped.length };
}
async function main() {
  if (secret.length < 16) throw new Error('CRON_SECRET SANDBOX News absent ou trop court.');
  // Refuse de lancer le collecteur à 105 sources contre une API de génération précédente.
  newsPendingSchema.parse(await request('/api/cron/news-candidates', 'GET'));
  if (!process.argv.includes('--process-only')) await collect();
  if (!process.argv.includes('--collect-only')) {
    const report = await drainNewsQueue(processPending, {
      onError: (error) => {
        console.error(error instanceof Error ? error.message : 'Échec du traitement News.');
      },
    });
    console.log(JSON.stringify({ phase: 'drain', ...report }));
    if (
      report.failures ||
      (report.candidates > 0 && report.published === 0 && report.skipped === report.candidates)
    )
      throw new Error('Le traitement News comporte des échecs ou aucun candidat accepté.');
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Échec du rafraîchissement SANDBOX News.');
  process.exitCode = 1;
});
