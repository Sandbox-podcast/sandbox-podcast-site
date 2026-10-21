import { z } from 'zod';
import { NEWS_MEDIA } from './news-media.ts';
import { newsItemSchema } from './news-preview.ts';

const articleTitleSchema = z.string().trim().min(1).max(400);
const articleSentenceSchema = z.string().trim().min(1).max(600);
const articleSentencesSchema = z.array(articleSentenceSchema).min(1).max(3);

export const publishedNewsItemSchema = newsItemSchema
  .omit({ sourceExcerpt: true })
  .extend({
    kind: z.literal('article'),
    headline: z.string().trim().min(1).max(500),
    titles: z
      .object({
        'fr-FR': articleTitleSchema.max(200),
        en: articleTitleSchema.optional(),
        'es-ES': articleTitleSchema.optional(),
        'de-DE': articleTitleSchema.optional(),
      })
      .strict(),
    synopses: z
      .object({
        'fr-FR': articleSentencesSchema,
        en: articleSentencesSchema.optional(),
        'es-ES': articleSentencesSchema.optional(),
        'de-DE': articleSentencesSchema.optional(),
      })
      .strict(),
    editorialSourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .superRefine((item, context) => {
    for (const locale of ['en', 'es-ES', 'de-DE'] as const) {
      if (
        !!item.titles[locale] !== !!item.synopses[locale] ||
        (item.synopses[locale] && item.synopses[locale].length !== item.synopses['fr-FR'].length)
      )
        context.addIssue({ code: 'custom', message: `Traduction partielle en ${locale}.` });
    }
  });

export type PublishedNewsItem = z.infer<typeof publishedNewsItemSchema>;

const newsSourceIds = NEWS_MEDIA.map((source) => source.id) as [string, ...string[]];
export const newsSourceStatusSchema = z
  .object({
    id: z.enum(newsSourceIds),
    name: z.string().trim().min(1).max(100),
    url: z.url(),
    ok: z.boolean(),
    reason: z.string().trim().max(180).optional(),
  })
  .strict();

export const newsPublicationEntrySchema = z
  .object({
    item: publishedNewsItemSchema,
    sourceExcerptHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();

export const newsIngestionRequestSchema = z
  .object({
    checkedAt: z.iso.datetime(),
    // Accepte le registre précédent pendant le déploiement du nouveau collecteur.
    sources: z.array(newsSourceStatusSchema).min(1).max(NEWS_MEDIA.length),
    items: z.array(newsPublicationEntrySchema).max(20),
  })
  .strict()
  .superRefine((value, context) => {
    const sourceIdsSeen = new Set<string>(value.sources.map((source) => source.id));
    const allowedSources = new Map<string, (typeof NEWS_MEDIA)[number]>(
      NEWS_MEDIA.map((source) => [source.id, source]),
    );
    if (sourceIdsSeen.size !== value.sources.length)
      context.addIssue({ code: 'custom', message: 'Chaque source doit apparaître une fois.' });
    for (const [index, source] of value.sources.entries()) {
      const expected = allowedSources.get(source.id);
      if (expected === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['sources', index],
          message: 'Source hors registre.',
        });
        continue;
      }
      if (source.name !== expected.name || source.url !== expected.url)
        context.addIssue({
          code: 'custom',
          path: ['sources', index],
          message: 'Source hors registre.',
        });
    }
    const itemUrls = new Set<string>();
    const itemIds = new Set<string>();
    for (const [index, entry] of value.items.entries()) {
      if (itemUrls.has(entry.item.url) || itemIds.has(entry.item.id))
        context.addIssue({
          code: 'custom',
          path: ['items', index],
          message: 'Article répété dans le lot.',
        });
      itemUrls.add(entry.item.url);
      itemIds.add(entry.item.id);
      const sourceId = entry.item.id.split(':', 1)[0];
      if (!sourceIdsSeen.has(sourceId ?? ''))
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'item', 'id'],
          message: 'La source de l’article est inconnue.',
        });
    }
  });

export type NewsIngestionRequest = z.infer<typeof newsIngestionRequestSchema>;

export const knownNewsUrlsSchema = z.object({ urls: z.array(z.url()).max(1000) }).strict();

export function newsItemIsFresh(item: PublishedNewsItem, now = new Date()): boolean {
  const timestamp = Date.parse(item.publishedAt);
  const age = now.getTime() - timestamp;
  return Number.isFinite(timestamp) && age >= -5 * 60_000 && age <= 14 * 86_400_000;
}
