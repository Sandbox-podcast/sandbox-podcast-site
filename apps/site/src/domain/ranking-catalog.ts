import { z } from 'zod';
import { httpsUrlSchema, slugSchema } from './schema.ts';
import { bcp47LocaleSchema, localizedPathMatchesLocale } from '../i18n/locales.ts';

export const rankingEntityKindSchema = z.enum(['github_project', 'skill', 'mcp', 'model', 'agent']);
export type RankingEntityKind = z.infer<typeof rankingEntityKindSchema>;

export const rankingIntentSchema = z.enum(['popular', 'trending', 'benchmark', 'editorial_best']);
export type RankingIntent = z.infer<typeof rankingIntentSchema>;

export const rankingMethodSchema = z.enum([
  'popularity',
  'momentum',
  'benchmark',
  'editorial_review',
]);
export type RankingMethod = z.infer<typeof rankingMethodSchema>;

export const rankingReviewStateSchema = z.enum(['draft', 'needs_review', 'reviewed', 'published']);
export type RankingReviewState = z.infer<typeof rankingReviewStateSchema>;

export const rankingTargetSchema = z
  .object({
    platform: slugSchema.optional(),
    task: slugSchema.optional(),
    category: slugSchema.optional(),
    capability: slugSchema.optional(),
    audience: slugSchema.optional(),
  })
  .strict();
export type RankingTarget = z.infer<typeof rankingTargetSchema>;

export const rankingCollectionSchema = z
  .object({
    key: slugSchema,
    sourceChart: slugSchema,
    entityKind: rankingEntityKindSchema,
    intent: rankingIntentSchema,
    method: rankingMethodSchema,
    target: rankingTargetSchema.default({}),
    cadence: z.enum(['weekly', 'monthly', 'release']).default('weekly'),
    minimumCandidates: z.number().int().min(1).max(1000).default(10),
    minimumPublicEditions: z.number().int().min(1).max(100).default(1),
    active: z.boolean().default(false),
  })
  .refine(
    ({ intent, method }) =>
      (intent === 'popular' && method === 'popularity') ||
      (intent === 'trending' && method === 'momentum') ||
      (intent === 'benchmark' && method === 'benchmark') ||
      (intent === 'editorial_best' && method === 'editorial_review'),
    'L’intention de recherche et la méthode de classement doivent correspondre.',
  );
export type RankingCollection = z.infer<typeof rankingCollectionSchema>;

const localeSchema = bcp47LocaleSchema;
export { localeSchema as rankingLocaleSchema };

const localizedPathSchema = z
  .string()
  .min(1)
  .refine(
    (path) =>
      path.startsWith('/') &&
      !path.startsWith('//') &&
      !/[?#]/.test(path) &&
      (path === '/' || (!path.endsWith('/') && path === path.toLowerCase())),
    'chemin localisé absolu, en minuscules, sans slash final, paramètre ni fragment requis',
  );

export const rankingCollectionLocalizationSchema = z
  .object({
    collectionKey: slugSchema,
    locale: localeSchema,
    slug: slugSchema,
    path: localizedPathSchema,
    title: z.string().min(10).max(180),
    metaTitle: z.string().min(10).max(180),
    metaDescription: z.string().min(30).max(320),
    heading: z.string().min(5).max(180),
    introduction: z.string().min(30),
    methodologySummary: z.string().min(30),
    state: rankingReviewStateSchema.default('draft'),
    sourceLocale: localeSchema,
    sourceHash: z.string().min(16),
    reviewedAt: z.iso.datetime().optional(),
    publishedAt: z.iso.datetime().optional(),
  })
  .superRefine((translation, ctx) => {
    if (!localizedPathMatchesLocale(translation.path, translation.locale)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Le chemin doit utiliser le préfixe correspondant à la langue.',
        path: ['path'],
      });
    }
    if (translation.state === 'reviewed' && !translation.reviewedAt) {
      ctx.addIssue({ code: 'custom', message: 'Une traduction relue doit avoir reviewedAt.' });
    }
    if (
      translation.state === 'published' &&
      (!translation.reviewedAt || !translation.publishedAt)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Une traduction publiée doit avoir reviewedAt et publishedAt.',
      });
    }
  });
export type RankingCollectionLocalization = z.infer<typeof rankingCollectionLocalizationSchema>;

export const rankingEntityLocalizationSchema = z
  .object({
    entityId: z.string().min(1),
    locale: localeSchema,
    displayName: z.string().min(1).max(180),
    tagline: z.string().min(1).max(240),
    description: z.string().min(30),
    limitations: z.string().min(10),
    state: rankingReviewStateSchema.default('draft'),
    sourceLocale: localeSchema,
    sourceHash: z.string().min(16),
    reviewedAt: z.iso.datetime().optional(),
    publishedAt: z.iso.datetime().optional(),
  })
  .superRefine((translation, ctx) => {
    if (translation.state === 'reviewed' && !translation.reviewedAt) {
      ctx.addIssue({ code: 'custom', message: 'Un profil relu doit avoir reviewedAt.' });
    }
    if (
      translation.state === 'published' &&
      (!translation.reviewedAt || !translation.publishedAt)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Un profil publié doit avoir reviewedAt et publishedAt.',
      });
    }
  });
export type RankingEntityLocalization = z.infer<typeof rankingEntityLocalizationSchema>;

export const rankingEvidenceSchema = z
  .object({
    id: z.string().min(1),
    entityId: z.string().min(1),
    collectionKey: slugSchema.optional(),
    factKey: slugSchema,
    value: z.unknown(),
    unit: z.string().min(1).optional(),
    sourceKind: z.enum(['repository', 'publisher', 'independent_test', 'benchmark', 'editorial']),
    sourceUrl: httpsUrlSchema,
    observedAt: z.iso.datetime(),
    verifiedAt: z.iso.datetime().optional(),
    reviewer: z.string().min(1).optional(),
    state: z.enum(['unreviewed', 'verified', 'rejected']).default('unreviewed'),
  })
  .superRefine((evidence, ctx) => {
    if (evidence.state !== 'unreviewed' && (!evidence.verifiedAt || !evidence.reviewer)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Une preuve vérifiée ou rejetée doit porter une date et un évaluateur.',
      });
    }
  });
export type RankingEvidence = z.infer<typeof rankingEvidenceSchema>;

export interface RankingIndexReadiness {
  liveData: boolean;
  publishedEditions: number;
  candidateCount: number;
}

/** Gate commune sitemap/robots : une traduction non relue ou une édition de démonstration reste fermée. */
export function isIndexableRankingLocalization(
  collection: RankingCollection,
  localization: RankingCollectionLocalization,
  readiness: RankingIndexReadiness,
): boolean {
  return (
    collection.active &&
    collection.key === localization.collectionKey &&
    localization.state === 'published' &&
    readiness.liveData &&
    readiness.candidateCount >= collection.minimumCandidates &&
    readiness.publishedEditions >= collection.minimumPublicEditions
  );
}

export interface HreflangPage {
  locale: string;
  path: string;
  indexable: boolean;
}

/** Ne lie que les versions localisées effectivement publiées et indexables. */
export function hreflangAlternates(
  pages: readonly HreflangPage[],
  origin: string,
  defaultLocale = 'fr-FR',
): Record<string, string> {
  const base = new URL(origin);
  const alternates: Record<string, string> = {};
  for (const page of pages) {
    if (!page.indexable) continue;
    const locale = localeSchema.safeParse(page.locale);
    const path = localizedPathSchema.safeParse(page.path);
    if (!locale.success || !path.success) continue;
    alternates[locale.data] = new URL(path.data, base).toString();
  }
  if (Object.keys(alternates).length < 2) return {};
  const defaultUrl = alternates[defaultLocale];
  if (defaultUrl) alternates['x-default'] = defaultUrl;
  return alternates;
}
