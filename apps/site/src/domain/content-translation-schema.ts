import { z } from 'zod';
import { SITE_LOCALES, DEFAULT_SITE_LOCALE } from '../i18n/locales.ts';

export const TRANSLATION_LOCALES: readonly string[] = SITE_LOCALES.map(
  (item) => item.locale,
).filter((locale) => locale !== DEFAULT_SITE_LOCALE);
export const translationSourceSchema = z.object({
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  source: z.string().min(1).max(100_000),
  context: z.string(),
});
export const translationSourcePackSchema = z.object({
  version: z.literal(1),
  sourceLocale: z.literal('fr-FR'),
  sources: z.array(translationSourceSchema).max(20_000),
});
export type TranslationSourcePack = z.infer<typeof translationSourcePackSchema>;
export const translatedBundleSchema = z.object({
  version: z.literal(1),
  locale: z
    .string()
    .refine((locale) => TRANSLATION_LOCALES.includes(locale), 'Langue non prise en charge.'),
  translations: z
    .array(
      translationSourceSchema.extend({
        text: z.string().trim().min(1).max(100_000),
        context: z.string().optional(),
      }),
    )
    .min(1)
    .max(20_000),
});
export type TranslatedBundle = z.infer<typeof translatedBundleSchema>;
