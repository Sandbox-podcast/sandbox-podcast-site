import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChartsExperience } from '../src/components/charts-experience.tsx';
import { LocalizationProvider } from '../src/components/localization.tsx';
import { chartSelectionSchema } from '../src/domain/chart-selection.ts';
import { chartEditionSchema, snapshotSchema } from '../src/domain/schema.ts';
import type { ChartsData } from '../src/domain/sandbox-charts.ts';
import { siteDictionary } from '../src/i18n/dictionaries.ts';

function dataset(): ChartsData {
  return {
    mode: 'live',
    week: '2026-10-13',
    weeks: ['2026-10-13'],
    entities: ['a', 'b'].map((slug) => ({
      slug,
      kind: 'project',
      name: `Projet ${slug}`,
      tagline: 'Description',
      description: 'Un projet de test.',
      category: slug === 'a' ? 'Agents' : 'Coding',
      topics: [],
      links: [],
      href: `/charts/project/${slug}`,
    })),
    series: [
      {
        id: 'github',
        slug: 'github',
        primary: 'momentum',
        dimensions: [],
        metrics: [],
        editions: [],
        snapshots: [
          snapshotSchema.parse({
            chart: 'github',
            week: '2026-10-13',
            publishedAt: '2026-10-13T03:00:00Z',
            retrievedAt: '2026-10-13T02:00:00Z',
            provenance: 'auto',
            entries: [
              { entity: 'a', rank: 1, score: 82.3, dimensions: {}, metrics: {} },
              { entity: 'b', rank: 2, score: 72.1, dimensions: {}, metrics: {} },
            ],
          }),
        ],
      },
    ],
    takes: [],
    episodes: [],
    newsletterUrl: null,
    progress: null,
  };
}

function summaries(html: string): string[] {
  return [...html.matchAll(/<details class="sc-row"[^>]*><summary>([\s\S]*?)<\/summary>/g)].map(
    (match) => match[1] ?? '',
  );
}

describe('classement compact', () => {
  it('signale une édition périmée sans présenter une collecte comme une publication', () => {
    const data = dataset();
    data.checkedAt = '2026-10-15T10:00:00Z';
    const html = renderToStaticMarkup(createElement(ChartsExperience, { data }));
    expect(html).toContain('Mise à jour en retard.');
    expect(html).toContain('13 oct. 2026');
    data.checkedAt = '2026-10-13T10:00:00Z';
    expect(renderToStaticMarkup(createElement(ChartsExperience, { data }))).not.toContain(
      'Mise à jour en retard.',
    );
  });
  it('affiche chaque projet une fois et conserve les détails et les sources', () => {
    const html = renderToStaticMarkup(createElement(ChartsExperience, { data: dataset() }));
    expect(summaries(html)).toHaveLength(2);
    expect(html.match(/<h3>Projet a<\/h3>/g)).toHaveLength(1);
    expect(html).not.toContain('sc-podium');
    expect(html).not.toContain('>Options<');
    expect(html).not.toContain('Mode 16:9');
    expect(html).not.toContain('sc-market');
    expect(html).not.toContain('sc-records');
    expect(html).not.toContain('sc-newsletter');
    expect(html).toContain('Mesures, composants du score et sources');
    expect(html.match(/href="\/charts\/github\/methodology"/g)).toHaveLength(1);
    expect(html).toContain('href="/charts/history"');
    expect(html).toContain('PARTAGER LE CLASSEMENT');
    expect(html).toContain('13 oct. 2026');
  });

  it('distingue les deux créneaux UTC du même jour dans les archives', () => {
    const data = dataset();
    const series = data.series[0];
    const snapshot = series?.snapshots[0];
    if (!series || !snapshot) throw new Error('Le jeu de test exige une édition.');
    data.week = '2026-10-13T12:00Z';
    data.weeks = ['2026-10-13T12:00Z', '2026-10-13T00:00Z'];
    series.snapshots = data.weeks.map((week) => ({ ...snapshot, week }));
    const html = renderToStaticMarkup(createElement(ChartsExperience, { data }));
    expect(html).toContain('00:00 UTC');
    expect(html).toContain('12:00 UTC');
    expect(html).toContain('value="2026-10-13T12:00Z" selected=""');
  });

  it('ne répète pas le score dans la ligne et ne fabrique pas de courbe', () => {
    const html = renderToStaticMarkup(createElement(ChartsExperience, { data: dataset() }));
    const first = summaries(html)[0] ?? '';
    expect(first.match(/82,3/g)).toHaveLength(1);
    expect(first).toContain('/100');
    expect(first).not.toContain('sc-row-growth');
    expect(first).not.toContain('<svg');
    expect(first).toContain('Historique insuffisant');
    expect(first).toContain('Pas de période précédente disponible');
  });

  it('conserve le rang officiel quand une catégorie est ouverte par URL', () => {
    const html = renderToStaticMarkup(
      createElement(ChartsExperience, {
        data: dataset(),
        initialSelection: chartSelectionSchema.parse({ filter: 'Coding' }),
      }),
    );
    expect(summaries(html)).toHaveLength(1);
    expect(summaries(html)[0]).toContain('Projet b');
    expect(summaries(html)[0]).toContain('>02<');
  });

  it('donne une action de reprise quand la catégorie est vide', () => {
    const html = renderToStaticMarkup(
      createElement(ChartsExperience, {
        data: dataset(),
        initialSelection: chartSelectionSchema.parse({ filter: 'MCP' }),
      }),
    );
    expect(summaries(html)).toHaveLength(0);
    expect(html).toContain('Aucun projet dans cette catégorie pour cette édition.');
    expect(html).toContain('Toutes les catégories');
  });

  it('affiche une sélection éditoriale seulement si elle contient un projet existant', () => {
    const data = dataset();
    const series = data.series[0];
    if (!series) throw new Error('Le jeu de test exige une série GitHub.');
    series.editions = [
      chartEditionSchema.parse({
        week: data.week,
        watchlist: [{ entity: 'missing', reason: 'Avis' }],
      }),
    ];
    expect(renderToStaticMarkup(createElement(ChartsExperience, { data }))).not.toContain(
      'sc-watchlist',
    );
    series.editions = [
      chartEditionSchema.parse({
        week: data.week,
        watchlist: [{ entity: 'a', reason: 'Avis éditorial' }],
      }),
    ];
    expect(renderToStaticMarkup(createElement(ChartsExperience, { data }))).toContain(
      'Avis éditorial',
    );
  });

  it('distingue une panne de données et une édition en attente', () => {
    const data = dataset();
    data.mode = 'unavailable';
    data.series = [];
    const html = renderToStaticMarkup(createElement(ChartsExperience, { data }));
    expect(html).toContain('Données temporairement indisponibles.');
    expect(html).toContain('Réessayez dans quelques instants.');
    expect(html).not.toContain('Aucune édition publiée');
    expect(html).not.toContain('>Édition</span>');
    expect(summaries(html)).toHaveLength(0);
  });

  it('garde une mention explicite sur les données de démonstration', () => {
    const data = dataset();
    data.mode = 'fixtures';
    expect(renderToStaticMarkup(createElement(ChartsExperience, { data }))).toContain(
      'Aperçu local. Données de démonstration.',
    );
  });

  it.each([
    ['en', 'Two updates scheduled per day', 'This edition', 'Category'],
    ['es-ES', 'Dos actualizaciones previstas al día', 'Esta edición', 'Categoría'],
    ['de-DE', 'Zwei Aktualisierungen pro Tag geplant', 'Diese Ausgabe', 'Kategorie'],
  ])('traduit les nouveaux contrôles en %s', async (locale, cadence, period, category) => {
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale,
        dictionary: await siteDictionary(locale),
        children: createElement(ChartsExperience, { data: dataset() }),
      }),
    );
    expect(html).toContain(cadence);
    expect(html).toContain(period);
    expect(html).toContain(category);
    expect(html).not.toContain('Actualisé toutes les 12 h');
    expect(html).not.toContain('Cette édition');
  });
});
