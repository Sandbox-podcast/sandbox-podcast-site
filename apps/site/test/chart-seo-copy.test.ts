import { describe, expect, it, vi } from 'vitest';
import {
  chartMetadataCopy,
  chartArchiveMetadataCopy,
  rankedProjectMetadataCopy,
} from '../src/domain/chart-seo-copy';
import { generateMetadata } from '../src/app/[locale]/[[...path]]/page';

vi.mock('../src/lib/admin-persistence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/admin-persistence')>()),
  preparePublicEditorialContent: async () => undefined,
}));

describe('métadonnées descriptives et traduites des classements', () => {
  it.each(['github', 'skills', 'models', 'rising'] as const)(
    'distingue les langues et les éditions de %s',
    (chart) => {
      const locales = ['fr-FR', 'en', 'es-ES', 'de-DE'];
      expect(new Set(locales.map((locale) => chartMetadataCopy(chart, locale).title)).size).toBe(4);
      expect(
        new Set(locales.map((locale) => chartMetadataCopy(chart, locale).description)).size,
      ).toBe(4);
      for (const locale of locales) {
        const archive = chartMetadataCopy(chart, locale, '2026-10-20T12:00Z');
        expect(archive.title).toContain('2026-10-20T12:00Z');
        expect(archive.title).not.toBe(chartMetadataCopy(chart, locale).title);
        expect(archive.description).toContain('2026-10-20T12:00Z');
        expect(archive.description).not.toContain('{');
      }
    },
  );
  it.each(['en', 'es-es', 'de-de'])(
    'fournit une vraie traduction depuis le routeur %s, y compris pour les archives',
    async (routeLocale) => {
      const locale =
        routeLocale === 'es-es' ? 'es-ES' : routeLocale === 'de-de' ? 'de-DE' : routeLocale;
      const page = await generateMetadata({
        params: Promise.resolve({ locale: routeLocale, path: ['charts', 'skills'] }),
      });
      expect(page.title).toBe(chartMetadataCopy('skills', locale).title);
      expect(page.openGraph?.description).toBe(chartMetadataCopy('skills', locale).description);
      const archive = await generateMetadata({
        params: Promise.resolve({ locale: routeLocale, path: ['charts', 'history', '2026-W41'] }),
      });
      expect(archive.title).toBe(chartArchiveMetadataCopy('2026-W41', locale).title);
      expect(archive.description).toBe(chartArchiveMetadataCopy('2026-W41', locale).description);
    },
  );
  it('préserve les identités de projet et évite une description étrangère tronquée au milieu d’un mot', () => {
    for (const locale of ['fr-FR', 'en', 'es-ES', 'de-DE']) {
      const copy = rankedProjectMetadataCopy('Sillage', 'owner/Sillage', locale);
      expect(copy.title).toContain('Sillage');
      expect(copy.description).toContain('owner/Sillage');
      expect(copy.description).not.toContain('{name}');
    }
  });
});
