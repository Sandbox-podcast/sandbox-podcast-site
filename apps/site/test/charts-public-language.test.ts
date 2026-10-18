import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChartsExperience } from '../src/components/charts-experience.tsx';
import { LocalizationProvider } from '../src/components/localization.tsx';
import { siteDictionary } from '../src/i18n/dictionaries.ts';
import { interpolateText, translateText } from '../src/i18n/translation.ts';
import {
  CHART_LABELS,
  CHART_PERIODS,
  chartFilterLabel,
  type ChartsData,
} from '../src/domain/sandbox-charts.ts';

const pending: ChartsData = {
  mode: 'pending',
  week: '2026-W41',
  weeks: [],
  entities: [],
  series: [],
  takes: [],
  episodes: [],
  newsletterUrl: null,
  progress: {
    databaseReady: true,
    trackedRepositories: 12,
    snapshotsToday: 0,
    distinctSnapshotDays: 3,
    requiredHistoryDays: 7,
    lastSuccessfulCollectAt: '2026-10-08T02:00:00.000Z',
    earliestPossibleEditionWeek: '2026-W42',
  },
};

describe('classements publics en français', () => {
  it('affiche un état d’attente exact et les commandes en français', () => {
    const html = renderToStaticMarkup(
      createElement(ChartsExperience, { data: pending, pageKind: 'collection' }),
    );
    expect(html).toContain('Classements de projets open source, de skills et de modèles IA');
    expect(html).toContain('Éditions datées et sourcées');
    expect(html).toContain('Période');
    expect(html).toContain('Cette édition');
    expect(html).toContain('Catégorie');
    expect(html).not.toContain('Options');
    expect(html).not.toContain('Partager');
    expect(html).toContain('Aucune édition publiée pour ce classement.');
    expect(html).toContain('12 dépôts suivis');
    expect(html).toContain('Historique : ');
    expect(html).toContain('3');
    expect(html).toContain(' / ');
    expect(html).toContain('7');
    expect(html).toContain('Archives');
    expect(html).not.toContain('>Édition</span>');
    expect(html).not.toContain('sc-newsletter');
    expect(html).not.toContain('sc-podium');
    expect(html).not.toContain('sc-watchlist');
    expect(html).not.toContain('sc-market');
    expect(html).not.toContain('THE WEEKLY RANKING');
    expect(html).not.toContain('BUILDING THE HISTORY');
    expect(html).not.toContain('Get SANDBOX CHARTS');
  });

  it('traduit les libellés sans modifier les valeurs des filtres', () => {
    expect(CHART_PERIODS.map((period) => period.label)).toEqual([
      'CETTE SEMAINE',
      'CE MOIS',
      '3 MOIS',
      'DEPUIS LE DÉBUT',
    ]);
    expect(CHART_LABELS.github.subtitle).toContain('Les projets open source');
    expect(chartFilterLabel('All')).toBe('Toutes');
    expect(chartFilterLabel('Coding')).toBe('Code');
    expect(chartFilterLabel('MCP')).toBe('MCP');
  });
});

it('traduit les titres du hub, des archives et de chaque classement dans les quatre langues', async () => {
  const locales = [
    {
      locale: 'fr-FR',
      headings: {
        collection: 'Classements de projets open source, de skills et de modèles IA',
        archive: 'Archives des classements de projets open source, de skills et de modèles IA',
        github: 'Classement de projets open source sur GitHub',
        skills: 'Classement des skills, agents et MCP',
        models: "Classement de modèles d'IA",
        rising: 'Projets GitHub en progression',
      },
    },
    {
      locale: 'en',
      headings: {
        collection: 'Rankings of open-source projects, skills and AI models',
        archive: 'Archives of open-source project, skill and AI model rankings',
        github: 'Open-source project rankings on GitHub',
        skills: 'Rankings of skills, agents and MCP tools',
        models: 'AI model rankings',
        rising: 'GitHub projects on the rise',
      },
    },
    {
      locale: 'es-ES',
      headings: {
        collection: 'Clasificaciones de proyectos de código abierto, skills y modelos de IA',
        archive:
          'Archivos de clasificaciones de proyectos de código abierto, skills y modelos de IA',
        github: 'Clasificación de proyectos de código abierto en GitHub',
        skills: 'Clasificación de skills, agentes y herramientas MCP',
        models: 'Clasificación de modelos de IA',
        rising: 'Proyectos de GitHub en crecimiento',
      },
    },
    {
      locale: 'de-DE',
      headings: {
        collection: 'Ranglisten für Open-Source-Projekte, Skills und KI-Modelle',
        archive: 'Archive der Ranglisten für Open-Source-Projekte, Skills und KI-Modelle',
        github: 'Rangliste der Open-Source-Projekte auf GitHub',
        skills: 'Rangliste der Skills, Agenten und MCP-Tools',
        models: 'Rangliste der KI-Modelle',
        rising: 'GitHub-Projekte im Aufschwung',
      },
    },
  ] as const;

  const pages = [
    { pageKind: 'collection', chart: 'github', key: 'collection' },
    { pageKind: 'archive', chart: 'github', key: 'archive' },
    { pageKind: 'ranking', chart: 'github', key: 'github' },
    { pageKind: 'ranking', chart: 'skills', key: 'skills' },
    { pageKind: 'ranking', chart: 'models', key: 'models' },
    { pageKind: 'ranking', chart: 'rising', key: 'rising' },
  ] as const;

  for (const { locale, headings } of locales) {
    const dictionary = locale === 'fr-FR' ? {} : await siteDictionary(locale);
    for (const { pageKind, chart, key } of pages) {
      const html = renderToStaticMarkup(
        createElement(LocalizationProvider, {
          locale,
          dictionary,
          children: createElement(ChartsExperience, {
            data: pending,
            initialChart: chart,
            pageKind,
          }),
        }),
      );
      const expectedHeading = headings[key].replaceAll("'", '&#x27;');
      expect(html).toContain(`<h1>${expectedHeading}</h1>`);
    }
  }
});

describe('classements publics en anglais', () => {
  it('traduit les titres et l’état vide sans mélanger les deux langues', async () => {
    const dictionary = await siteDictionary('en');
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary,
        children: createElement(ChartsExperience, { data: pending, pageKind: 'collection' }),
      }),
    );
    expect(html).toContain('Rankings of open-source projects, skills and AI models');
    expect(html).toContain('Dated, sourced editions');
    expect(html).toContain('Period');
    expect(html).toContain('This edition');
    expect(html).toContain('Category');
    expect(html).toContain('No edition has been published for this ranking.');
    expect(html).not.toContain('LES CLASSEMENTS TECH');
    expect(html).not.toContain('Aucune édition publiée pour ce classement.');
  });

  it('traduit les explications chiffrées complètes', async () => {
    const dictionary = await siteDictionary('en');
    const sentence = translateText(
      '{count} étoiles gagnées sur les relevés de cette période.',
      dictionary,
      'en',
    );
    expect(interpolateText(sentence, { count: 14 })).toBe(
      '14 stars gained in the observations for this period.',
    );
  });
});
