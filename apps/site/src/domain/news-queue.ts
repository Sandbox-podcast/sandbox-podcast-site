import { z } from 'zod';
import { newsItemSchema } from './news-preview.ts';
import { NEWS_MEDIA } from './news-media.ts';
import { newsSourceMatches } from './news-source.ts';
import { newsSourceStatusSchema } from './news-publishing.ts';

export const NEWS_PROCESSING_BATCH_SIZE = 20;
export const NEWS_GENERATION_BATCH_SIZE = 5;
export const NEWS_LEASE_MINUTES = 20;
export const newsCandidateSchema = newsItemSchema
  .extend({
    kind: z.literal('article'),
    headline: z.string().min(1).max(500),
  })
  .strict()
  .refine((item) => {
    const source = NEWS_MEDIA.find((entry) => entry.id === item.id.split(':', 1)[0]);
    return !!source && item.project === source.name && newsSourceMatches(source, item.id, item.url);
  }, 'Source de candidat hors registre.');
export type NewsCandidate = z.infer<typeof newsCandidateSchema>;

export const newsQueueRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('claim') }).strict(),
  z
    .object({
      action: z.literal('collect'),
      items: z.array(newsCandidateSchema).max(NEWS_PROCESSING_BATCH_SIZE),
    })
    .strict(),
  z
    .object({
      action: z.literal('complete'),
      leaseId: z.uuid(),
      published: z.array(z.url()).max(NEWS_PROCESSING_BATCH_SIZE),
      skipped: z.array(z.url()).max(NEWS_PROCESSING_BATCH_SIZE),
    })
    .strict(),
]);
export const newsPendingSchema = z
  .object({
    protocolVersion: z.literal(2),
    items: z.array(newsCandidateSchema).max(NEWS_PROCESSING_BATCH_SIZE),
    leaseId: z.uuid().nullable().default(null),
    checkedAt: z.iso.datetime(),
    sources: z.array(newsSourceStatusSchema).length(NEWS_MEDIA.length),
  })
  .strict();

/** Borne aussi les octets UTF-8, pas seulement le nombre d'articles. */
export function newsRequestBatches<T>(items: readonly T[]): T[][] {
  const batches: T[][] = [];
  let batch: T[] = [];
  for (const item of items) {
    if (
      batch.length &&
      (batch.length >= NEWS_PROCESSING_BATCH_SIZE ||
        new TextEncoder().encode(JSON.stringify([...batch, item])).length > 180_000)
    ) {
      batches.push(batch);
      batch = [];
    }
    batch.push(item);
  }
  if (batch.length) batches.push(batch);
  return batches;
}
