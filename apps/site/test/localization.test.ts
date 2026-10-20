import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LocalizationProvider } from '../src/components/localization';
import HomePage from '../src/app/(fr)/page';
import SearchPage from '../src/components/search-screen';
import PodcastPage from '../src/app/(fr)/podcast/page';
import { EntityScreen } from '../src/components/entity-screen';
import { SITE_LOCALES } from '../src/i18n/locales';
import { siteDictionary } from '../src/i18n/dictionaries';
import sourceCatalog from '../src/i18n/dictionaries/source-catalog.json';
import { localizedHref, sourcePath, localeCountry } from '../src/i18n/routing';
import { matchSharedPage, SHARED_PAGE_ROUTES } from '../src/i18n/page-routes';
import { interpolateText, translateText } from '../src/i18n/translation';
import { allEpisodes } from '../src/lib/repository';
import {
  chartSelectionQuery,
  chartSelectionSchema,
  hasChartSelectionQuery,
} from '../src/domain/chart-selection';

// Ces tests de rendu utilisent le contenu Git ; le serveur HTTP teste séparément la version publiée.
vi.mock(import('../src/lib/admin-persistence'), async (importOriginal) => ({
  ...(await importOriginal()),
  preparePublicEditorialContent: async () => undefined,
}));

describe('langue et ressource', () => {
  it('traduit les textes publiés de la page À propos en anglais', async () => {
    const dictionary = await siteDictionary('en');
    expect(translateText('L’équipe', dictionary, 'en')).toBe('The team');
    expect(translateText('Retrouvez-nous.', dictionary, 'en')).toBe('Find us online.');
    expect(
      translateText(
        'Lou, Nicolas et Loïc. Les liens de l’équipe Sandbox, réunis ici.',
        dictionary,
        'en',
      ),
    ).toBe("Lou, Nicolas and Loïc. The Sandbox team's links, together in one place.");
  });
  it('conserve la ressource, la requête et les ancres pour les quatre langues', () => {
    const path = '/episodes?q=Claude%20Code&type=resources#main';
    for (const { locale } of SITE_LOCALES) {
      const href = localizedHref('/en' + path, locale);
      expect(sourcePath(href)).toBe(path);
      expect(localizedHref(href, 'fr-FR')).toBe(path);
    }
    expect(localizedHref('/en?q=test#main', 'de-DE')).toBe('/de-de?q=test#main');
    expect(sourcePath('/it-it/episodes/42')).toBe('/it-it/episodes/42');
  });
  it('garde les assets, les API et les liens externes à leur adresse', () => {
    for (const path of [
      '/flags/fr.svg',
      '/sandbox-logo.png',
      '/api/charts/github/latest',
      '/admin',
      '/feed.xml',
      'https://example.org/a',
      '//example.org/a',
      '#chapters',
    ]) {
      expect(localizedHref(path, 'en')).toBe(path);
    }
  });
  it('associe chaque langue à son drapeau et refuse les autres', () => {
    expect(localizedHref('/charts', 'es-ES')).toBe('/es-es/charts');
    expect(localeCountry('fr-FR')).toBe('fr');
    expect(localeCountry('en')).toBe('gb');
    expect(localeCountry('es-ES')).toBe('es');
    expect(localeCountry('de-DE')).toBe('de');
    expect(() => localizedHref('/charts', 'it-IT')).toThrow();
    expect(() => localeCountry('it-IT')).toThrow();
  });
});

describe('routes partagées', () => {
  it('garde les routes précises avant les fiches génériques', () => {
    expect(matchSharedPage('/charts/history/2026-W41')).toEqual({
      route: '/charts/history/:week',
      params: { week: '2026-W41' },
    });
    expect(matchSharedPage('/charts/rising/methodology')?.route).toBe('/charts/rising/methodology');
    expect(matchSharedPage('/charts/models/coding')?.route).toBe('/charts/models/:task');
    expect(matchSharedPage('/charts/github/2026-W41')?.route).toBe('/charts/:slug/:week');
    expect(matchSharedPage('/admin')).toBeUndefined();
    expect(matchSharedPage('/episodes/42/extra')).toBeUndefined();
    for (const route of SHARED_PAGE_ROUTES) {
      expect(matchSharedPage(route.replace(/:[a-z]+/g, 'resource'))?.route).toBe(route);
    }
  });
});

describe('textes locaux', () => {
  it('traduit les phrases complètes sans modifier les valeurs et sans HTML', () => {
    const dictionary = {
      'Lire la vidéo : {title}': 'Play video: {title}',
      'Mon épisode': 'My episode',
    };
    expect(translateText(' Lire la vidéo : Mon épisode ', dictionary)).toBe(
      ' Play video: My episode ',
    );
    expect(translateText('Score 94.2 / 100', dictionary)).toBe('Score 94.2 / 100');
    expect(interpolateText('{count} episodes', { count: 3 })).toBe('3 episodes');
    expect(translateText('6 octobre 2026', {}, 'en')).toBe('October 6, 2026');
    expect(translateText('6 octobre 2026', {})).toBe('6 octobre 2026');
    expect(translateText('31 février 2026', {}, 'en')).toBe('31 février 2026');
    expect(
      translateText(
        'Éditeur',
        { Éditeur: 'Publisher', 'category:Éditeur': 'Editor' },
        'en',
        'category',
      ),
    ).toBe('Editor');
  });
  it("traduit le titre public de l'accueil", async () => {
    const source = "Sandbox TalkShow : ce que l'IA change pour les produits et les équipes tech";
    expect(translateText(source, await siteDictionary('en'), 'en')).toBe(
      'Sandbox TalkShow: what AI changes for products and tech teams',
    );
    expect(translateText(source, await siteDictionary('es-ES'), 'es-ES')).toBe(
      'Sandbox TalkShow: lo que la IA cambia para los productos y los equipos de tecnología',
    );
    expect(translateText(source, await siteDictionary('de-DE'), 'de-DE')).toBe(
      'Sandbox TalkShow: was KI für Produkte und Tech-Teams verändert',
    );
  });
  it.each([
    ['en', 'What AI changes for those who build.'],
    ['es-ES', 'Lo que la IA cambia para quienes construyen.'],
    ['de-DE', 'Was KI für alle verändert, die entwickeln.'],
  ])(
    'garde une phrase naturelle entre les deux fragments du titre en %s',
    async (locale, title) => {
      const dictionary = await siteDictionary(locale);
      const fragments = ["Ce que l'IA change", 'pour ceux qui construisent.'];
      expect(
        fragments.map((fragment) => translateText(fragment, dictionary, locale)).join(' '),
      ).toBe(title);
    },
  );
  it('charge un dictionnaire pour chaque langue proposée', async () => {
    for (const { locale } of SITE_LOCALES) {
      const dictionary = await siteDictionary(locale);
      if (locale !== 'fr-FR') expect(dictionary['Classements']).toBeTruthy();
    }
    await expect(siteDictionary('it-IT')).rejects.toThrow();
  });
  it('ne traite pas les libellés déjà localisés de SANDBOX News comme des sources françaises', () => {
    expect(sourceCatalog).not.toHaveProperty('AI news');
    expect(sourceCatalog).not.toHaveProperty('Noticias sobre IA');
    expect(sourceCatalog).not.toHaveProperty('KI-Nachrichten');
  });
  it('conserve les paramètres et couvre le catalogue dans les trois langues', async () => {
    const placeholders = (source: string) =>
      [
        ...new Set([...source.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((match) => match[1])),
      ].sort();
    for (const { locale } of SITE_LOCALES) {
      for (const [source, translation] of Object.entries(await siteDictionary(locale)))
        expect(placeholders(translation), `${locale}: ${source}`).toEqual(placeholders(source));
    }
    for (const locale of ['en', 'es-ES', 'de-DE']) {
      const dictionary = await siteDictionary(locale);
      for (const source of Object.keys(sourceCatalog))
        expect(dictionary[source], `${locale}: ${source}`).toBeTruthy();
    }
  });
  it('traduit les textes éditoriaux des épisodes anglais', async () => {
    const dictionary = await siteDictionary('en');
    for (const episode of allEpisodes()) {
      for (const source of [episode.title, episode.dek, episode.description]) {
        expect(translateText(source, dictionary)).not.toBe(source);
      }
    }
  });
  it('traduit les phrases calculées en gardant les mesures et les noms propres', async () => {
    const dictionary = await siteDictionary('en');
    expect(translateText('+2 places, porté par Croissance : 85 (+12 pts).', dictionary, 'en')).toBe(
      '+2 places, driven by Growth: 85 (+12 pts).',
    );
    expect(translateText('Place inchangée ; Croissance 73 (−18 pts).', dictionary, 'en')).toBe(
      'Position unchanged; Growth 73 (−18 pts).',
    );
    expect(translateText('Superpowers', dictionary, 'en')).toBe('Superpowers');
    expect(translateText('SWE-bench', dictionary, 'en')).toBe('SWE-bench');
    expect(
      translateText('Historique de Skills Top 20. S26 : n°7 ; S27 : n°6', dictionary, 'en'),
    ).toBe('History of Skills Top 20. W26: no.7; W27: no.6');
  });
});

describe('filtres de classement et langue', () => {
  it('conserve la sélection dans un lien de changement de langue', () => {
    const query = chartSelectionQuery('q=Claude', {
      chart: 'skills',
      week: '2026-W40',
      period: 'month',
      filter: 'Coding',
      view: undefined,
    });
    const href = localizedHref(`/en/charts?${query}#sc-chart-title`, 'fr-FR');
    const url = new URL(href, 'https://sandbox.example');
    const parsed = chartSelectionSchema.parse(Object.fromEntries(url.searchParams));
    expect(parsed).toMatchObject({
      chart: 'skills',
      week: '2026-W40',
      period: 'month',
      filter: 'Coding',
    });
    expect(url.searchParams.get('q')).toBe('Claude');
    expect(url.hash).toBe('#sc-chart-title');
    expect(hasChartSelectionQuery(Object.fromEntries(url.searchParams))).toBe(true);
  });
  it('rejette les valeurs inconnues et supprime les filtres remis à zéro', () => {
    expect(
      chartSelectionSchema.parse({
        chart: 'invented',
        week: '2026-W99',
        filter: '<script>',
        view: '<script>',
        period: 'invented',
      }),
    ).toEqual({
      chart: undefined,
      week: undefined,
      filter: undefined,
      view: undefined,
      period: 'week',
    });
    expect(
      chartSelectionQuery('period=month&view=coding&filter=Coding', {
        period: 'week',
        view: 'quality',
        filter: 'All',
      }),
    ).toBe('');
    expect(hasChartSelectionQuery({ utm_source: 'podcast' })).toBe(false);
  });
});

describe('même site en français et en anglais', () => {
  it('garde toutes les illustrations et sections de l’accueil', async () => {
    const page = await HomePage({});
    const dictionary = await siteDictionary('en');
    const french = renderToStaticMarkup(page);
    const english = renderToStaticMarkup(
      createElement(LocalizationProvider, { locale: 'en', dictionary, children: page }),
    );
    const assets = (html: string) =>
      [...html.matchAll(/(?:src|srcSet)="([^"]+)"/g)].map((match) => match[1]);
    const sections = (html: string) => [...html.matchAll(/<section\b/g)].length;
    expect(assets(english)).toEqual(assets(french));
    expect(sections(english)).toBe(sections(french));
    expect(english).not.toContain('Upcoming episodes will appear here.');
    expect(english).not.toContain('Derniers épisodes');
    expect(english).not.toContain('Quatre classements');
    for (const html of [french, english]) {
      expect(html).toContain('id="discovery-title"');
      expect(html).not.toContain('class="sc-chart-tabs"');
      expect(html).not.toContain('empty-library-title');
      expect([...html.matchAll(/<h1\b/g)]).toHaveLength(1);
    }
  });
  it('garde la bibliothèque podcast vide traduite sans fiche de démonstration', async () => {
    const page = await PodcastPage();
    const dictionary = await siteDictionary('en');
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, { locale: 'en', dictionary, children: page }),
    );
    expect(html).toContain('Discussing AI in our work.');
    expect(html).toContain('No replays yet.');
    expect(html).not.toContain('href="/en/episodes/40"');
    expect(html).not.toContain('href="/en/episodes/41"');
    expect(html).not.toContain('href="/en/episodes/42"');
  });
  it('traduit la neutralisation des anciennes fiches et les liens de récupération', async () => {
    const dictionary = await siteDictionary('en');
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary,
        children: createElement(EntityScreen, { slug: 'anthropic-skills' }),
      }),
    );
    expect(html).toContain('Old demo page');
    expect(html).toContain('simulated figures');
    expect(html).toContain('href="/en/charts"');
    expect(html).toContain('href="/en/podcast"');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('Old demo page de');
    expect(html).not.toContain('[object Object]');
    for (const french of [
      'éditions à ce rang',
      'd’affilée',
      'Place inchangée ;',
      'À propos de sa place',
    ])
      expect(html).not.toContain(french);
  });
  it('recherche également dans les titres traduits et garde la langue des résultats', async () => {
    const dictionary = await siteDictionary('en');
    const page = await SearchPage({
      dictionary,
      searchParams: Promise.resolve({ q: 'claude', type: 'entities' }),
    });
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, { locale: 'en', dictionary, children: page }),
    );
    expect(html).toContain('action="/en/search"');
    expect(html).toContain('Projects and models');
    expect(html).not.toContain('Aucun résultat');
  });
});
