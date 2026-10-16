import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/admin-persistence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/admin-persistence')>()),
  preparePublishedEditorialContent: async () => undefined,
}));
import { generateMetadata } from '../src/app/[locale]/[[...path]]/page';
import sitemap from '../src/app/sitemap';
import { sourceAllowsIndexing, sharedPageAlternates } from '../src/i18n/indexing';
import { pageMetadata } from '../src/lib/seo';
import { siteDictionary } from '../src/i18n/dictionaries';
import { translateText } from '../src/i18n/translation';

describe('ouverture des pages traduites', () => {
  it.each(['es-ES', 'de-DE'])(
    'traduit les titres calculés et les textes relevés en production en %s',
    async (locale) => {
      const dictionary = await siteDictionary(locale);
      for (const source of [
        "Sandbox : comprendre l'IA en la pratiquant",
        'Épisode 1 : Conclusion',
        'Retrouvez-nous.',
        'Lou, Nicolas et Loïc. Les liens de l’équipe Sandbox, réunis ici.',
        'Le Radar · Impulsion IA 2027 : 80 M€ pour former à l’IA',
        'Le Build · Sillage, une brique au-dessus des harnais (Nicolas)',
        'Conditions commerciales',
      ])
        expect(translateText(source, dictionary, locale)).not.toBe(source);
    },
  );
  it.each(['es-es', 'de-de'])(
    'indexe une page complète en %s avec sa canonique et ses langues réciproques',
    async (locale) => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale, path: ['about'] }),
      });
      expect(metadata.robots).toMatchObject({ index: true, googleBot: { index: true } });
      expect(metadata.alternates?.canonical).toContain(`/${locale}/about`);
      expect(metadata.alternates?.languages?.['fr-FR']).toContain('/about');
      expect(metadata.alternates?.languages?.en).toContain('/en/about');
      expect(metadata.alternates?.languages?.['es-ES']).toContain('/es-es/about');
      expect(metadata.alternates?.languages?.['de-DE']).toContain('/de-de/about');
      expect(metadata.title).not.toBe('Retrouvez l’équipe Sandbox');
    },
  );

  it.each(['es-es', 'de-de'])(
    'garde la recherche %s hors indexation et hors hreflang',
    async (locale) => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale, path: ['search'] }),
      });
      expect(metadata.robots).toMatchObject({ index: false });
      expect(metadata.alternates?.languages).toBeUndefined();
    },
  );

  it('garde les restrictions de la source pour les variantes traduites', () => {
    expect(sourceAllowsIndexing({ index: false })).toBe(false);
    expect(sourceAllowsIndexing('noindex, follow')).toBe(false);
    expect(sourceAllowsIndexing(undefined)).toBe(false);
    expect(sourceAllowsIndexing({ index: true })).toBe(true);
    const metadata = pageMetadata({
      title: 'Recherche',
      description: 'Recherche',
      path: '/search',
      noindex: true,
    });
    expect(metadata.alternates?.languages).toBeUndefined();
    expect(sharedPageAlternates('/admin')).toEqual([]);
    expect(sharedPageAlternates('/time-machine')).toEqual([]);
  });

  it('ajoute les pages ES/DE disponibles au sitemap sans inventer de route', async () => {
    const entries = await sitemap();
    for (const prefix of ['es-es', 'de-de']) {
      expect(entries.some(({ url }) => url.endsWith(`/${prefix}/about`))).toBe(true);
      expect(entries.some(({ url }) => url.endsWith(`/${prefix}/nos-projets`))).toBe(true);
      expect(entries.some(({ url }) => url.endsWith(`/${prefix}/search`))).toBe(false);
      expect(entries.some(({ url }) => url.endsWith(`/${prefix}/time-machine`))).toBe(false);
    }
    expect(new Set(entries.map(({ url }) => url)).size).toBe(entries.length);
  });
});
