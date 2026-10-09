import { describe, expect, it } from 'vitest';
import { SITE_LOCALES } from '../src/i18n/locales.ts';
import { isLocaleUiReviewed } from '../src/i18n/messages.ts';
import {
  formatRankingCount,
  hasRankingUiTranslation,
  rankingMessages,
  RANKING_UI_TRANSLATION_LOCALES,
} from '../src/i18n/ranking-messages.ts';

describe('libellés localisés des classements', () => {
  it('couvre uniquement les quatre langues du site', () => {
    expect(RANKING_UI_TRANSLATION_LOCALES).toEqual(SITE_LOCALES.map((item) => item.locale));
    for (const { locale } of SITE_LOCALES) {
      expect(hasRankingUiTranslation(locale)).toBe(true);
      expect(rankingMessages(locale).sourceLocale).toBe(locale);
    }
    for (const locale of ['it-IT', 'br-FR', 'en-US', 'sr-Cyrl-RS']) {
      expect(hasRankingUiTranslation(locale)).toBe(false);
      expect(() => rankingMessages(locale)).toThrow();
    }
  });

  it('renseigne les chaînes et les compteurs des quatre traductions', () => {
    for (const locale of RANKING_UI_TRANSLATION_LOCALES) {
      const messages = rankingMessages(locale);
      for (const key of Object.keys(messages) as (keyof typeof messages)[]) {
        if (key === 'sourceLocale') continue;
        const label = messages[key];
        expect(label.trim().length, `${locale}: ${key}`).toBeGreaterThan(0);
      }
      expect(messages.rankedEntries).toContain('{{count}}');
      expect(messages.publishedEditions).toContain('{{count}}');
      expect(messages.evidence).toContain('{{count}}');
    }
  });

  it('garde allemand et espagnol hors indexation avant relecture', () => {
    expect(isLocaleUiReviewed('fr-FR')).toBe(true);
    expect(isLocaleUiReviewed('en')).toBe(true);
    expect(isLocaleUiReviewed('es-ES')).toBe(false);
    expect(isLocaleUiReviewed('de-DE')).toBe(false);
  });

  it('formate les nombres avec les conventions de la langue de la page', () => {
    expect(formatRankingCount('{{count}} entrées', 1200, 'fr-FR')).toBe('entrées: 1 200');
    expect(formatRankingCount('Evidence ({{count}})', 1200, 'en')).toBe('Evidence (1,200)');
  });
});
