import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/admin-persistence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/admin-persistence')>()),
  preparePublicEditorialContent: async () => undefined,
}));
import { generateMetadata } from '../src/app/[locale]/[[...path]]/page';
import sitemap from '../src/app/sitemap';
import { sourceAllowsIndexing, sharedPageAlternates } from '../src/i18n/indexing';
import { pageMetadata } from '../src/lib/seo';
import { siteDictionary } from '../src/i18n/dictionaries';
import { translateText } from '../src/i18n/translation';
import { personalProjects } from '../src/lib/personal-projects';
import { setSiteSettingsOverride } from '../src/config/site';
import { loadContent } from '../src/lib/load';

describe('ouverture des pages traduites', () => {
  it.each([
    ['en', 'what AI changes for products and tech teams'],
    ['es-es', 'lo que la IA cambia para los productos y los equipos de tecnología'],
    ['de-de', 'was KI für Produkte und Tech-Teams verändert'],
  ])(
    "traduit les métadonnées de l'accueil en %s, même si son nom change",
    async (locale, suffix) => {
      for (const name of ['Sandbox TalkShow', 'Sandbox Studio']) {
        setSiteSettingsOverride({ ...loadContent().site, name });
        try {
          const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
          const title = `${name}: ${suffix}`;
          expect(metadata.title).toBe(title);
          expect(metadata.openGraph?.title).toBe(title);
          expect(metadata.twitter?.title).toBe(title);
          expect(metadata.alternates?.canonical).toContain(`/${locale}`);
          expect(metadata.description).not.toContain('Chaque semaine');
        } finally {
          setSiteSettingsOverride(undefined);
        }
      }
    },
  );
  it.each(['en', 'es-es', 'de-de'])(
    'localise les titres composés des fiches projet en %s sans traduire leurs noms',
    async (locale) => {
      const dictionary = await siteDictionary(
        locale === 'es-es' ? 'es-ES' : locale === 'de-de' ? 'de-DE' : locale,
      );
      for (const project of personalProjects) {
        const title = `${project.name}: ${translateText(project.tagline, dictionary)}`;
        const metadata = await generateMetadata({
          params: Promise.resolve({ locale, path: ['nos-projets', project.slug] }),
        });
        expect(metadata.title).toBe(title);
        expect(metadata.openGraph?.title).toBe(title);
        expect(metadata.twitter?.title).toBe(title);
        expect(metadata.alternates?.canonical).toContain(`/${locale}/nos-projets/${project.slug}`);
        expect(metadata.robots).toMatchObject({ index: true });
      }
    },
  );

  it.each(['en', 'es-ES', 'de-DE'])(
    'dispose des traductions des fonctionnalités pour les 34 projets en %s',
    async (locale) => {
      const dictionary = await siteDictionary(locale);
      for (const project of personalProjects)
        for (const feature of project.features) {
          expect(dictionary[feature], `${locale}: ${project.slug}: ${feature}`).toBeTruthy();
          expect(translateText(feature, dictionary, locale)).not.toBe(feature);
        }
    },
  );

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
    'conserve les données %s sans annoncer de variante étrangère pendant la suspension',
    async (locale) => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale, path: ['about'] }),
      });
      expect(metadata.robots).toMatchObject({ index: true, googleBot: { index: true } });
      expect(metadata.alternates?.canonical).toContain(`/${locale}/about`);
      expect(metadata.alternates?.languages).toEqual({});
      expect(metadata.alternates?.languages?.en).toBeUndefined();
      expect(metadata.alternates?.languages?.['es-ES']).toBeUndefined();
      expect(metadata.alternates?.languages?.['de-DE']).toBeUndefined();
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

  it('annonce uniquement les pages françaises dans le sitemap pendant la suspension', async () => {
    const entries = await sitemap();
    for (const prefix of ['en', 'es-es', 'de-de']) {
      expect(
        entries.some(({ url }) => new RegExp(`^/${prefix}(?:/|$)`).exec(new URL(url).pathname)),
      ).toBe(false);
      expect(entries.some(({ url }) => url.endsWith(`/${prefix}/search`))).toBe(false);
      expect(entries.some(({ url }) => url.endsWith(`/${prefix}/time-machine`))).toBe(false);
    }
    expect(entries.some(({ url }) => url.endsWith('/about'))).toBe(true);
    expect(sharedPageAlternates('/about')).toEqual([
      { locale: 'fr-FR', path: '/about', indexable: true },
    ]);
    expect(new Set(entries.map(({ url }) => url)).size).toBe(entries.length);
  });
});
