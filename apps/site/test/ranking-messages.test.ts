import { describe, expect, it } from 'vitest';
import { EUROPEAN_LOCALE_TARGETS } from '../src/i18n/locales.ts';
import { isLocaleUiReviewed } from '../src/i18n/messages.ts';
import {
  formatRankingCount,
  hasRankingUiTranslation,
  rankingMessages,
  RANKING_UI_TRANSLATION_LOCALES,
} from '../src/i18n/ranking-messages.ts';

describe('libellés localisés des classements', () => {
  it('prépare les interfaces de classement des 24 langues officielles de l’UE', () => {
    const officialEuLocales = EUROPEAN_LOCALE_TARGETS.filter(({ group }) => group === 'eu');
    expect(officialEuLocales).toHaveLength(24);
    for (const { locale } of officialEuLocales) {
      expect(hasRankingUiTranslation(locale), locale).toBe(true);
      expect(rankingMessages(locale).hubTitle.length, locale).toBeGreaterThan(2);
    }
  });

  it('couvre les langues nationales ajoutées et les deux écritures serbes', () => {
    for (const locale of [
      'sq-AL',
      'be-BY',
      'bs-BA',
      'is-IS',
      'mk-MK',
      'nb-NO',
      'nn-NO',
      'ru-RU',
      'sr-Cyrl-RS',
      'sr-Latn-RS',
      'uk-UA',
      'tr-TR',
      'hy-AM',
      'az-AZ',
      'ka-GE',
      'lb-LU',
      'ca-ES',
    ]) {
      expect(hasRankingUiTranslation(locale), locale).toBe(true);
      expect(RANKING_UI_TRANSLATION_LOCALES).toContain(locale);
    }
    expect(rankingMessages('sr-Cyrl-RS').sourceLocale).toBe('sr-Cyrl-RS');
    expect(rankingMessages('sr-Latn-ME').sourceLocale).toBe('sr-Latn-RS');
    expect(rankingMessages('ca-ES-valencia').sourceLocale).toBe('ca-ES');
  });

  it('renseigne toutes les chaînes et les compteurs de chaque brouillon', () => {
    expect(RANKING_UI_TRANSLATION_LOCALES).toHaveLength(109);
    for (const locale of RANKING_UI_TRANSLATION_LOCALES) {
      const messages = rankingMessages(locale);
      const labels = [
        messages.hubTitle,
        messages.hubDescription,
        messages.hubIntroduction,
        messages.openRanking,
        messages.emptyHub,
        messages.rankings,
        messages.week,
        messages.rankedEntries,
        messages.publishedEditions,
        messages.updated,
        messages.availableLanguages,
        messages.rank,
        messages.name,
        messages.score,
        messages.movement,
        messages.source,
        messages.profile,
        messages.limitations,
        messages.evidence,
        messages.methodology,
        messages.newEntry,
        messages.sourceRepository,
        messages.sourcePublisher,
        messages.sourceIndependentTest,
        messages.sourceBenchmark,
        messages.sourceEditorial,
      ];
      expect(
        labels.every((label) => label.trim().length > 0),
        locale,
      ).toBe(true);
      expect(messages.rankedEntries, locale).toContain('{{count}}');
      expect(messages.publishedEditions, locale).toContain('{{count}}');
      expect(messages.evidence, locale).toContain('{{count}}');
    }
  });

  it('couvre les 115 locales de classement avec des brouillons sans les approuver pour indexation', () => {
    expect(EUROPEAN_LOCALE_TARGETS).toHaveLength(115);
    for (const { locale } of EUROPEAN_LOCALE_TARGETS) {
      expect(hasRankingUiTranslation(locale), locale).toBe(true);
      expect(rankingMessages(locale).hubTitle.length, locale).toBeGreaterThan(2);
      if (locale !== 'fr-FR' && locale !== 'en') {
        expect(isLocaleUiReviewed(locale), locale).toBe(false);
      }
    }
    expect(rankingMessages('rm-CH').sourceLocale).toBe('rm-CH');
    expect(rankingMessages('nds-NL').sourceLocale).toBe('nds-DE');
    expect(rankingMessages('ro-MD').sourceLocale).toBe('ro-RO');
    for (const locale of RANKING_UI_TRANSLATION_LOCALES) {
      if (locale === 'fr-FR' || locale === 'en') continue;
      expect(isLocaleUiReviewed(locale), locale).toBe(false);
    }
    expect(isLocaleUiReviewed('fr-FR')).toBe(true);
    expect(isLocaleUiReviewed('en')).toBe(true);
  });

  it('formate les nombres avec les conventions de la langue de la page', () => {
    expect(formatRankingCount('{{count}} entrées', 1200, 'fr-FR')).toBe('entrées: 1 200');
    expect(formatRankingCount('Evidence ({{count}})', 1200, 'en')).toBe('Evidence (1,200)');
  });
});
