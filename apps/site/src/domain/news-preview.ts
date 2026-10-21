import { z } from 'zod';
import { NEWS_ALLOWED_HOSTS } from './news-media.ts';

export const NEWS_PAGE_SIZE = 30;
export const newsLocaleSchema = z.enum(['fr-FR', 'en', 'es-ES', 'de-DE']);

export const newsCategorySchema = z.enum([
  'development',
  'agents',
  'models',
  'open-source',
  'uses',
  'business',
  'research',
  'society',
]);
export const newsItemSchema = z.object({
  id: z.string(),
  project: z.string(),
  repository: z.string(),
  version: z.string().min(1).max(100),
  url: z.url().refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      NEWS_ALLOWED_HOSTS.has(url.hostname) &&
      !url.port &&
      !url.username &&
      !url.password
    );
  }),
  publishedAt: z.union([z.iso.datetime(), z.iso.date()]),
  category: newsCategorySchema,
  prerelease: z.boolean(),
  kind: z.literal('article').optional(),
  headline: z.string().min(1).max(500).optional(),
  /** Extrait public temporaire, réservé à la génération avant publication. */
  sourceExcerpt: z.string().max(8000).optional(),
  titles: z.record(z.string(), z.string().min(1).max(200).optional()).optional(),
  editorialSourceHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  synopses: z
    .record(z.string(), z.array(z.string().min(1).max(600)).min(1).max(3).optional())
    .optional(),
});
export type NewsItem = z.infer<typeof newsItemSchema>;
export const newsCursorSchema = z
  .object({
    publishedAt: z.union([z.iso.date(), z.iso.datetime()]),
    id: z.string().min(1).max(500),
  })
  .strict();
export type NewsCursor = z.infer<typeof newsCursorSchema>;

export const newsFeedSchema = z.object({
  nextCursor: newsCursorSchema.nullable().optional(),
  checkedAt: z.iso.datetime().nullable(),
  /** Dernière insertion sur le site, distincte de la date publiée par le média. */
  lastPublishedAt: z.iso.datetime().nullable().optional(),
  sources: z.array(
    z.object({
      name: z.string(),
      ok: z.boolean(),
      url: z.url().optional(),
      reason: z.string().max(180).optional(),
    }),
  ),
  items: z.array(newsItemSchema),
});
export type NewsFeed = z.infer<typeof newsFeedSchema>;

export function uniqueNews(items: readonly NewsItem[]): NewsItem[] {
  return [...new Map(items.map((item) => [item.url, item])).values()].sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id),
  );
}

export function newsSentence(item: NewsItem, locale = 'fr-FR'): string {
  if (item.kind === 'article') return item.titles?.[locale] ?? '';
  const version = item.version.replace(/[.!?]+$/, '');
  if (locale === 'en')
    return `${item.project} publishes ${item.prerelease ? 'a preview of' : ''} version ${version}.`.replace(
      / +/g,
      ' ',
    );
  if (locale === 'de-DE')
    return `${item.project} veröffentlicht ${item.prerelease ? 'eine Vorabversion' : 'die Version'} ${version}.`;
  if (locale === 'es-ES')
    return `${item.project} publica ${item.prerelease ? 'una versión preliminar' : 'la versión'} ${version}.`;
  return `${item.project} publie ${item.prerelease ? 'une préversion' : 'la version'} ${version}.`;
}

export function newsSynopsis(item: NewsItem, locale = 'fr-FR'): string[] {
  return item.synopses?.[locale] ?? [];
}

export function selectNews(
  items: readonly NewsItem[],
  options: {
    query?: string;
    category?: string;
    source?: string;
    order?: string;
    limit?: number;
    locale?: string;
  },
) {
  const locale = options.locale ?? 'fr-FR';
  const query = (options.query ?? '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  const matches = items.filter(
    (item) =>
      (item.kind !== 'article' ||
        (!!item.titles?.['fr-FR'] &&
          !!item.synopses?.['fr-FR']?.length &&
          !!item.titles[locale] &&
          !!item.synopses[locale]?.length)) &&
      (!options.source || options.source === 'all' || item.project === options.source) &&
      (!options.category || options.category === 'all' || item.category === options.category) &&
      (!query ||
        `${item.project} ${item.repository} ${item.version} ${item.headline ?? ''} ${newsSentence(item, locale)} ${newsSynopsis(item, locale).join(' ')} ${newsSentence(item)} ${newsSynopsis(item).join(' ')}`
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()
          .includes(query)),
  );
  const sorted = uniqueNews(matches);
  if (options.order === 'source')
    sorted.sort(
      (a, b) => a.project.localeCompare(b.project) || b.publishedAt.localeCompare(a.publishedAt),
    );
  if (options.order === 'balanced') {
    const occurrences = new Map<string, number>();
    const balanced = sorted
      .map((item) => {
        const round = occurrences.get(item.project) ?? 0;
        occurrences.set(item.project, round + 1);
        return { item, round };
      })
      .sort((a, b) => a.round - b.round || b.item.publishedAt.localeCompare(a.item.publishedAt));
    return {
      total: balanced.length,
      items: balanced.slice(0, options.limit ?? NEWS_PAGE_SIZE).map(({ item }) => item),
    };
  }
  // Un tri de lecture pour l'aperçu, sans prétendre à un score éditorial calibré.
  if (options.order === 'stable')
    sorted.sort(
      (a, b) =>
        Number(a.prerelease) - Number(b.prerelease) || b.publishedAt.localeCompare(a.publishedAt),
    );
  return { total: sorted.length, items: sorted.slice(0, options.limit ?? NEWS_PAGE_SIZE) };
}
