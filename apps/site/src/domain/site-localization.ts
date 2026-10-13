import { z } from 'zod';
import { siteLocaleSchema, localizedPathMatchesLocale } from '../i18n/locales.ts';

export const localizedContentKindSchema = z.enum(['home', 'episode', 'topic', 'entity', 'page']);
export type LocalizedContentKind = z.infer<typeof localizedContentKindSchema>;

const localizedSectionSchema = z.object({
  heading: z.string().min(2).max(180),
  paragraphs: z.array(z.string().min(1)).min(1).max(24),
});

const localizedChapterSchema = z.object({
  startSec: z.number().int().min(0),
  title: z.string().min(1).max(180),
});

export const siteContentLocalizationSchema = z
  .object({
    contentKind: localizedContentKindSchema,
    contentKey: z.string().min(1).max(180),
    locale: siteLocaleSchema,
    path: z
      .string()
      .min(1)
      .regex(/^\/(?!\/)[^?#]*$/)
      .refine(
        (path) => path === '/' || (!path.endsWith('/') && path === path.toLowerCase()),
        'le chemin doit être en minuscules et sans slash final',
      ),
    title: z.string().min(1).max(180),
    metaTitle: z.string().min(10).max(180),
    metaDescription: z.string().min(30).max(320),
    heading: z.string().min(5).max(180),
    introduction: z.string().min(30),
    sections: z.array(localizedSectionSchema).min(1).max(40),
    chapters: z.array(localizedChapterSchema).max(500).default([]),
    state: z.enum(['draft', 'needs_review', 'reviewed', 'published']).default('draft'),
    sourceLocale: siteLocaleSchema,
    sourceHash: z.string().min(16),
    reviewedAt: z.iso.datetime().optional(),
    publishedAt: z.iso.datetime().optional(),
  })
  .superRefine((localization, ctx) => {
    if (!localizedPathMatchesLocale(localization.path, localization.locale)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Le chemin doit utiliser le préfixe correspondant à la langue.',
        path: ['path'],
      });
    }
    if (localization.state === 'reviewed' && !localization.reviewedAt) {
      ctx.addIssue({
        code: 'custom',
        message: 'Une traduction relue doit avoir reviewedAt.',
        path: ['reviewedAt'],
      });
    }
    if (
      localization.state === 'published' &&
      (!localization.reviewedAt || !localization.publishedAt)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Une traduction publiée doit avoir reviewedAt et publishedAt.',
        path: ['publishedAt'],
      });
    }
    if (localization.contentKind === 'episode' && !/^\d{1,6}$/.test(localization.contentKey)) {
      ctx.addIssue({
        code: 'custom',
        message: 'La clé d’épisode doit être son numéro décimal.',
        path: ['contentKey'],
      });
    }
  });

export type SiteContentLocalization = z.infer<typeof siteContentLocalizationSchema>;

export interface SiteLocalizationReadiness {
  sourcePublished: boolean;
  sourceHashCurrent: boolean;
}

export function isIndexableSiteLocalization(
  localization: SiteContentLocalization,
  readiness: SiteLocalizationReadiness,
): boolean {
  return (
    localization.state === 'published' &&
    Boolean(localization.reviewedAt && localization.publishedAt) &&
    readiness.sourcePublished &&
    readiness.sourceHashCurrent
  );
}
