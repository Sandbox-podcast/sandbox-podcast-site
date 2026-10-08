import { describe, expect, it } from 'vitest';
import {
  bcp47LocaleSchema,
  DEFAULT_SITE_LOCALE,
  EUROPEAN_LOCALE_TARGETS,
  localeRouteSegment,
  localeTagFromRouteSegment,
  localizedPathMatchesLocale,
} from '../src/i18n/locales.ts';
import { isLocaleUiReviewed } from '../src/i18n/messages.ts';
import { siteContentLocalizationSchema } from '../src/domain/site-localization.ts';

describe('routage i18n BCP 47', () => {
  it('couvre les langues officielles européennes et un ensemble régional élargi', () => {
    expect(EUROPEAN_LOCALE_TARGETS.length).toBe(115);
    expect(
      EUROPEAN_LOCALE_TARGETS.every(({ locale }) => bcp47LocaleSchema.safeParse(locale).success),
    ).toBe(true);
    expect(new Set(EUROPEAN_LOCALE_TARGETS.map(({ locale }) => locale)).size).toBe(
      EUROPEAN_LOCALE_TARGETS.length,
    );
  });

  it('préserve les URLs françaises et distingue les écritures d’une langue', () => {
    expect(localeRouteSegment(DEFAULT_SITE_LOCALE)).toBeNull();
    expect(localeRouteSegment('en')).toBe('en');
    expect(localeRouteSegment('sr-Cyrl-RS')).toBe('sr-cyrl-rs');
    expect(localeRouteSegment('sr-Latn-RS')).toBe('sr-latn-rs');
    expect(localeRouteSegment('fr-CA')).toBe('fr-ca');
    expect(localeRouteSegment('de-DE')).toBe('de-de');
    expect(localeTagFromRouteSegment('sr-cyrl-rs')).toBe('sr-Cyrl-RS');
    expect(localeTagFromRouteSegment('de-de')).toBe('de-DE');
    expect(localeTagFromRouteSegment('charts')).toBeUndefined();
    expect(localeTagFromRouteSegment('fr-fr')).toBeUndefined();
    expect(localeTagFromRouteSegment('en-us-u-ca-gregory')).toBe('en-US-u-ca-gregory');
  });

  it('refuse d’associer le mauvais préfixe à une traduction', () => {
    expect(localizedPathMatchesLocale('/charts/skills/claude-code', 'fr-FR')).toBe(true);
    expect(localizedPathMatchesLocale('/en/charts/skills/claude-code', 'fr-FR')).toBe(false);
    expect(localizedPathMatchesLocale('/en/charts/skills/claude-code', 'en')).toBe(true);
    expect(localizedPathMatchesLocale('/sr-cyrl-rs/charts/skills', 'sr-Cyrl-RS')).toBe(true);
    expect(localizedPathMatchesLocale('/de-de/charts/skills', 'fr-FR')).toBe(false);
    expect(localizedPathMatchesLocale('/fr-fr/charts/skills', 'fr-FR')).toBe(false);
    expect(localizedPathMatchesLocale('/charts/skills/claude-code', 'fr-FR')).toBe(true);
  });

  it('n’autorise l’indexation qu’aux langues dont l’interface est actuellement relue', () => {
    expect(isLocaleUiReviewed('fr-FR')).toBe(true);
    expect(isLocaleUiReviewed('en')).toBe(true);
    expect(isLocaleUiReviewed('de-DE')).toBe(false);
    expect(isLocaleUiReviewed('ca-ES')).toBe(false);
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
