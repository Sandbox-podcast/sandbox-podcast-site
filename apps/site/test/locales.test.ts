import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SITE_LOCALE,
  SITE_LOCALES,
  localeRouteSegment,
  localeTagFromRouteSegment,
  localizedPathMatchesLocale,
  siteLocaleSchema,
} from '../src/i18n/locales.ts';
import { isLocaleUiReviewed } from '../src/i18n/messages.ts';
import { siteContentLocalizationSchema } from '../src/domain/site-localization.ts';

describe('routage des quatre langues du site', () => {
  it('ne propose que les langues demandées', () => {
    expect(SITE_LOCALES).toEqual([
      { locale: 'fr-FR', name: 'Français' },
      { locale: 'en', name: 'Anglais' },
      { locale: 'es-ES', name: 'Espagnol' },
      { locale: 'de-DE', name: 'Allemand' },
    ]);
    for (const { locale } of SITE_LOCALES)
      expect(siteLocaleSchema.safeParse(locale).success).toBe(true);
    for (const locale of ['it-IT', 'br-FR', 'fr-CA', 'en-US', 'sr-Cyrl-RS'])
      expect(siteLocaleSchema.safeParse(locale).success).toBe(false);
  });

  it('préserve les URLs françaises et les trois préfixes autorisés', () => {
    expect(localeRouteSegment(DEFAULT_SITE_LOCALE)).toBeNull();
    expect(localeRouteSegment('en')).toBe('en');
    expect(localeRouteSegment('es-ES')).toBe('es-es');
    expect(localeRouteSegment('de-DE')).toBe('de-de');
    expect(localeTagFromRouteSegment('en')).toBe('en');
    expect(localeTagFromRouteSegment('es-es')).toBe('es-ES');
    expect(localeTagFromRouteSegment('de-de')).toBe('de-DE');
    for (const segment of ['charts', 'fr-fr', 'it-it', 'br-fr', 'en-us', 'sr-cyrl-rs'])
      expect(localeTagFromRouteSegment(segment)).toBeUndefined();
    expect(() => localeRouteSegment('it-IT')).toThrow();
  });

  it('refuse d’associer le mauvais préfixe à une traduction', () => {
    expect(localizedPathMatchesLocale('/charts/skills/claude-code', 'fr-FR')).toBe(true);
    expect(localizedPathMatchesLocale('/en/charts/skills/claude-code', 'fr-FR')).toBe(false);
    expect(localizedPathMatchesLocale('/en/charts/skills/claude-code', 'en')).toBe(true);
    expect(localizedPathMatchesLocale('/es-es/charts/skills', 'es-ES')).toBe(true);
    expect(localizedPathMatchesLocale('/de-de/charts/skills', 'fr-FR')).toBe(false);
    expect(localizedPathMatchesLocale('/it-it/charts/skills', 'fr-FR')).toBe(false);
    expect(localizedPathMatchesLocale('/fr-fr/charts/skills', 'fr-FR')).toBe(false);
    expect(localizedPathMatchesLocale('/charts/skills/claude-code', 'fr-FR')).toBe(true);
  });

  it('n’autorise l’indexation qu’aux langues dont l’interface est actuellement relue', () => {
    expect(isLocaleUiReviewed('fr-FR')).toBe(true);
    expect(isLocaleUiReviewed('en')).toBe(true);
    expect(isLocaleUiReviewed('de-DE')).toBe(false);
    expect(isLocaleUiReviewed('es-ES')).toBe(false);
  });

  it('valide le contenu traduit et le statut de relecture', () => {
    const base = {
      contentKind: 'episode',
      contentKey: '12',
      locale: 'en',
      path: '/en/episodes/12',
      title: 'A useful episode about AI rankings',
      metaTitle: 'AI rankings explained in episode 12',
      metaDescription:
        'A translated episode page with reviewed context, resources and chapter names for English-speaking listeners.',
      heading: 'How AI rankings work',
      introduction:
        'This episode explains the evidence and criteria behind a transparent weekly AI ranking.',
      sections: [
        { heading: 'What we measured', paragraphs: ['The translated explanation is reviewed.'] },
      ],
      chapters: [{ startSec: 30, title: 'The scoring method' }],
      state: 'published',
      sourceLocale: 'fr-FR',
      sourceHash: '0123456789abcdef0123456789abcdef',
      reviewedAt: '2026-10-08T12:00:00Z',
      publishedAt: '2026-10-08T13:00:00Z',
    };
    expect(siteContentLocalizationSchema.safeParse(base).success).toBe(true);
    expect(
      siteContentLocalizationSchema.safeParse({ ...base, path: '/de/episodes/12' }).success,
    ).toBe(false);
    expect(
      siteContentLocalizationSchema.safeParse({
        ...base,
        locale: 'it-IT',
        path: '/it-it/episodes/12',
      }).success,
    ).toBe(false);
    expect(
      siteContentLocalizationSchema.safeParse({ ...base, path: '/en/episodes/12/' }).success,
    ).toBe(false);
    expect(
      siteContentLocalizationSchema.safeParse({ ...base, path: '/en/Episodes/12' }).success,
    ).toBe(false);
    expect(
      siteContentLocalizationSchema.safeParse({
        ...base,
        state: 'published',
        reviewedAt: undefined,
      }).success,
    ).toBe(false);
    expect(
      siteContentLocalizationSchema.safeParse({ ...base, contentKey: 'episode-twelve' }).success,
    ).toBe(false);
  });
});
