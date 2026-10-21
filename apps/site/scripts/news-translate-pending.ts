import { z } from 'zod';
import { publishedNewsItemSchema } from '../src/domain/news-publishing.ts';
import {
  translateNewsEditorialItems,
  newsEditorialTranslationsComplete,
} from '../src/pipeline/news-translation.ts';
import type { NewsEditorialRecord } from '../src/pipeline/news-editorial.ts';
const pageSchema = z.object({
  items: z.array(publishedNewsItemSchema).max(20),
  next: z.string().nullable(),
});
const secret = process.env['CRON_SECRET'] ?? '';
const origin = new URL(process.env['SANDBOX_NEWS_ORIGIN'] ?? 'https://www.sandboxpodcast.fr');
if (
  secret.length < 16 ||
  origin.protocol !== 'https:' ||
  origin.username ||
  origin.password ||
  origin.pathname !== '/' ||
  origin.search ||
  origin.hash
)
  throw new Error('Configuration de reprise des traductions invalide.');
async function request(after?: string, items?: unknown): Promise<unknown> {
  const url = new URL('/api/cron/news-translations', origin);
  if (after) url.searchParams.set('after', after);
  const response = await fetch(url, {
    method: items ? 'POST' : 'GET',
    redirect: 'error',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    ...(items ? { body: JSON.stringify(items) } : {}),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Reprise des traductions : HTTP ${response.status}.`);
  return response.json() as Promise<unknown>;
}
async function main() {
  const deadline = Date.now() + 22 * 60_000;
  let after: string | undefined;
  let incomplete = 0;
  do {
    const page = pageSchema.parse(await request(after));
    for (const item of page.items) {
      if (Date.now() + 7 * 60_000 >= deadline) {
        console.log(JSON.stringify({ phase: 'translation', deferred: true, incomplete }));
        return;
      }
      const editorial: Record<string, NewsEditorialRecord> = {
        [item.url]: {
          title: item.titles['fr-FR'],
          sentences: item.synopses['fr-FR'],
          category: item.category,
        },
      };
      const translated = await translateNewsEditorialItems(
        [item],
        undefined,
        editorial,
        {},
        AbortSignal.timeout(7 * 60_000),
        true,
      );
      await request(undefined, translated);
      if (!newsEditorialTranslationsComplete(translated, editorial)) incomplete++;
    }
    after = page.next ?? undefined;
  } while (after);
  console.log(JSON.stringify({ phase: 'translation', incomplete }));
  if (incomplete) throw new Error(`${incomplete} article(s) attendent encore une traduction.`);
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Reprise des traductions impossible.');
  process.exitCode = 1;
});
