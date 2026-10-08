import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChartsExperience } from '../src/components/charts-experience.tsx';
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
};

describe('classements publics en français', () => {
  it('affiche un état d’attente exact et les commandes en français', () => {
    const html = renderToStaticMarkup(createElement(ChartsExperience, { data: pending }));
    expect(html).toContain('LES CLASSEMENTS IA');
    expect(html).toContain('MISE À JOUR CHAQUE LUNDI');
    expect(html).toContain('SEMAINE');
    expect(html).toContain('octobre 2026');
    expect(html).toContain('LE CLASSEMENT HEBDOMADAIRE');
    expect(html).toContain('PARTAGER LE CLASSEMENT');
    expect(html).toContain('Aucune édition publiée pour ce classement.');
    expect(html).toContain('après la collecte des relevés et la publication d’une édition');
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
