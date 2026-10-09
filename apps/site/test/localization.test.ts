import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocalizationProvider } from '../src/components/localization';
import HomePage from '../src/app/(fr)/page';
import SearchPage from '../src/app/(fr)/search/page';
import EpisodesPage from '../src/app/(fr)/episodes/page';
import { EntityScreen } from '../src/components/entity-screen';
import { EUROPEAN_LOCALE_TARGETS } from '../src/i18n/locales';
import { siteDictionary } from '../src/i18n/dictionaries';
import sourceCatalog from '../src/i18n/dictionaries/source-catalog.json';
import { localizedHref, sourcePath, localeCountry, localeDirection } from '../src/i18n/routing';
import { matchSharedPage, SHARED_PAGE_ROUTES } from '../src/i18n/page-routes';
import { interpolateText, translateText } from '../src/i18n/translation';
import { allEpisodes } from '../src/lib/repository';
import {
  chartSelectionQuery,
  chartSelectionSchema,
  hasChartSelectionQuery,
} from '../src/domain/chart-selection';
import { episodeSelectionSchema, episodeSelectionQuery } from '../src/domain/episode-selection';

describe('langue et ressource', () => {
  it('conserve les filtres des podcasts et ignore les valeurs invalides', () => {
    const selection = episodeSelectionSchema.parse({
      q: 'agent',
      topic: 'coding',
      sort: 'shortest',
    });
    expect(new URLSearchParams(episodeSelectionQuery('utm_source=mail', selection)).get('q')).toBe(
      'agent',
    );
    expect(
      episodeSelectionQuery(
        'utm_source=mail&q=agent&topic=coding&sort=shortest',
        episodeSelectionSchema.parse({}),
      ),
    ).toBe('utm_source=mail');
    expect(
      episodeSelectionSchema.parse({ q: ['bad'], sort: 'invalid', topic: '<script>' }),
    ).toEqual({ q: '', topic: 'all', sort: 'newest' });
  });
  it('rend la recherche des podcasts dans la même langue et avec la sélection de l’URL', async () => {
    const dictionary = await siteDictionary('en');
    const page = await EpisodesPage({
      searchParams: Promise.resolve({ q: 'protocol', topic: 'coding', sort: 'oldest' }),
    });
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, { locale: 'en', dictionary, children: page }),
    );
    expect(html).toContain('value="protocol"');
    expect(html).toContain('value="oldest" selected=""');
    expect(html).toContain('0 episodes found');
    expect(html).toContain('Upcoming episodes will appear here.');
    expect(html).not.toContain('aria-label="Voir l’épisode');
  });
  it('conserve la ressource, la requête et les ancres pour les 115 langues', () => {
    const path = '/episodes?q=Claude%20Code&type=resources#main';
    for (const { locale } of EUROPEAN_LOCALE_TARGETS) {
      const href = localizedHref('/en' + path, locale);
      expect(sourcePath(href)).toBe(path);
      expect(localizedHref(href, 'fr-FR')).toBe(path);
    }
    expect(localizedHref('/en?q=test#main', 'de-DE')).toBe('/de-de?q=test#main');
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
  it('résout les variantes, le pays et le sens de lecture', () => {
    expect(localizedHref('/charts', 'sr-Cyrl-RS')).toBe('/sr-cyrl-rs/charts');
    expect(localeCountry('en')).toBe('gb');
    expect(localeCountry('ca-ES-valencia')).toBe('es');
    expect(localeCountry('yi')).toBeUndefined();
    expect(localeDirection('yi')).toBe('rtl');
    expect(localeDirection('ary-ES')).toBe('rtl');
    expect(localeDirection('sr-Cyrl-RS')).toBe('ltr');
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
  it('charge un dictionnaire pour chaque langue proposée', async () => {
    for (const { locale } of EUROPEAN_LOCALE_TARGETS) {
      const dictionary = await siteDictionary(locale);
      if (locale !== 'fr-FR') expect(dictionary['Classements']).toBeTruthy();
    }
  });
  it('conserve les paramètres de chaque traduction locale et couvre le catalogue anglais', async () => {
    const placeholders = (source: string) =>
      [
        ...new Set([...source.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((match) => match[1])),
      ].sort();
    for (const { locale } of EUROPEAN_LOCALE_TARGETS) {
      for (const [source, translation] of Object.entries(await siteDictionary(locale)))
        expect(placeholders(translation), `${locale}: ${source}`).toEqual(placeholders(source));
    }
    const english = await siteDictionary('en');
    for (const source of Object.keys(sourceCatalog)) expect(english[source], source).toBeTruthy();
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
    const page = await HomePage();
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
    expect(english).toContain('Upcoming episodes will appear here.');
    expect(english).toContain('No episodes published yet.');
    expect(english).toContain('href="/en/episodes"');
    expect(english).not.toContain('Quatre classements');
  });
  it('garde la bibliothèque podcast vide traduite sans fiche de démonstration', async () => {
    const page = await EpisodesPage({ searchParams: Promise.resolve({}) });
    const dictionary = await siteDictionary('en');
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, { locale: 'en', dictionary, children: page }),
    );
    expect(html).toContain('All podcasts.');
    expect(html).toContain('Upcoming episodes will appear here.');
    expect(html).not.toContain('href="/en/episodes/40"');
    expect(html).not.toContain('href="/en/episodes/41"');
    expect(html).not.toContain('href="/en/episodes/42"');
  });
  it('traduit aussi les légendes et les textes conditionnels des fiches', async () => {
    const dictionary = await siteDictionary('en');
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary,
        children: createElement(EntityScreen, { slug: 'anthropic-skills' }),
      }),
    );
    expect(html).toContain('weeks at this rank');
    expect(html).toContain('in a row');
    expect(html).toContain('History of Skills Top 20. W26: no.7');
    expect(html).toContain('Position unchanged; Install growth');
    expect(html).toContain('About its position in');
    expect(html).toContain('Oct 6, 2026');
    expect(html).toContain('<title>W26: no.7</title>');
    expect(html).not.toContain('[object Object]');
    for (const french of [
      'sem. à ce rang',
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
