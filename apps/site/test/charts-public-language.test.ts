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
    const html = renderToStaticMarkup(createElement(ChartsExperience, { data: pending }));
    expect(html).toContain('LES CLASSEMENTS IA');
    expect(html).toContain('MISE À JOUR CHAQUE JOUR');
    expect(html).toContain('SEMAINE');
    expect(html).toContain('octobre 2026');
    expect(html).toContain('LE CLASSEMENT HEBDOMADAIRE');
    expect(html).toContain('PARTAGER LE CLASSEMENT');
    expect(html).toContain('Aucune édition publiée pour ce classement.');
    expect(html).toContain('après la collecte des relevés et la publication d’une édition');
    expect(html).toContain('12 dépôts suivis');
    expect(html).toContain('Historique : ');
    expect(html).toContain('3');
    expect(html).toContain(' / ');
    expect(html).toContain('7');
    expect(html).toContain('Première édition possible : ');
    expect(html).toContain('2026-W42');
    expect(html).toContain('LES ARCHIVES');
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
    expect(CHART_LABELS.github.subtitle).toContain('Les projets IA');
    expect(chartFilterLabel('All')).toBe('Toutes');
    expect(chartFilterLabel('Coding')).toBe('Code');
    expect(chartFilterLabel('MCP')).toBe('MCP');
  });
});

describe('classements publics en anglais', () => {
  it('traduit les titres et l’état vide sans mélanger les deux langues', async () => {
    const dictionary = await siteDictionary('en');
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary,
        children: createElement(ChartsExperience, { data: pending }),
      }),
    );
    expect(html).toContain('THE AI CHARTS');
    expect(html).toContain('UPDATED EVERY DAY');
    expect(html).toContain('No edition has been published for this ranking.');
    expect(html).not.toContain('LES CLASSEMENTS IA');
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
