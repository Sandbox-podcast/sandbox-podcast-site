import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChartsData } from '../src/domain/sandbox-charts.ts';
import { snapshotSchema } from '../src/domain/schema.ts';
import { publishedChartSitemapPaths } from '../src/domain/chart-seo.ts';
import { matchSharedPage } from '../src/i18n/page-routes.ts';

vi.mock('../src/lib/sandbox-charts', () => ({ sandboxChartsData: vi.fn() }));
vi.mock('../src/components/ranking-catalog-route', () => ({
  RankingCatalogRoute: ({ path }: { path: string }) =>
    createElement('h1', null, `Catalogue ${path}`),
  rankingCatalogMetadata: async (path: string) => ({
    title: 'Catalogue',
    alternates: { canonical: path },
  }),
}));
import { sandboxChartsData } from '../src/lib/sandbox-charts';
import SkillsPage, { generateMetadata } from '../src/app/(fr)/charts/skills/[platform]/page';
import ChartWeekPage from '../src/app/(fr)/charts/[slug]/[week]/page';
import HistoryWeekPage from '../src/app/(fr)/charts/history/[week]/page';
import RisingWeekPage from '../src/app/(fr)/charts/rising/[week]/page';

function dataset(): ChartsData {
  const data: ChartsData = {
    mode: 'live',
    week: '2026-10-14',
    weeks: ['2026-10-14', '2026-10-10'],
    entities: ['archive-skill', 'new-skill'].map((slug) => ({
      slug,
      kind: 'tool',
      name: slug,
      tagline: slug,
      description: slug,
      category: 'Coding',
      topics: [],
      links: [],
      href: `https://example.com/${slug}`,
    })),
    series: [],
    takes: [],
    episodes: [],
    newsletterUrl: null,
    progress: null,
  };
  data.series = (['github', 'skills', 'models', 'rising'] as const).map((id) => ({
    id,
    slug: id === 'models' ? 'ai-models' : id,
    primary: 'momentum',
    dimensions: [],
    metrics: [],
    editions: [],
    snapshots: ['2026-10-10', '2026-10-14'].map((week, index) =>
      snapshotSchema.parse({
        chart: id,
        week,
        publishedAt: `${week}T03:00:00Z`,
        retrievedAt: `${week}T02:00:00Z`,
        provenance: 'auto',
        entries: [
          {
            entity: index === 0 ? 'archive-skill' : 'new-skill',
            rank: 1,
            score: index === 0 ? 52 : 88,
            dimensions: { momentum: index === 0 ? 52 : 88 },
            metrics: {},
          },
        ],
      }),
    ),
  }));
  vi.mocked(sandboxChartsData).mockImplementation(async (week) => ({
    ...data,
    week: week ?? data.week,
  }));
  return data;
}

afterEach(() => vi.clearAllMocks());

describe('archive Skills publiée', () => {
  it.each(['00', '12'])(
    'ouvre les créneaux %sh dont le deux-points reste encodé par Next',
    async (hour) => {
      const data = dataset();
      const edition = `2026-10-10T${hour}:00Z`;
      data.weeks = [edition];
      for (const series of data.series)
        series.snapshots = series.snapshots
          .slice(0, 1)
          .map((snapshot) => ({ ...snapshot, week: edition }));
      const encoded = edition.replace(':', '%3A');
      const searchParams = Promise.resolve({});
      const pages = [
        await SkillsPage({ params: Promise.resolve({ platform: encoded }), searchParams }),
        await ChartWeekPage({
          params: Promise.resolve({ slug: 'github', week: encoded }),
          searchParams,
        }),
        await HistoryWeekPage({ params: Promise.resolve({ week: encoded }), searchParams }),
        await RisingWeekPage({ params: Promise.resolve({ week: encoded }), searchParams }),
      ];
      for (const page of pages)
        expect(renderToStaticMarkup(page)).toContain('<h3>archive-skill</h3>');
      expect(matchSharedPage(`/charts/skills/${encoded}`)).toEqual({
        route: '/charts/:slug/:week',
        params: { slug: 'skills', week: edition },
      });
      expect(sandboxChartsData).toHaveBeenCalledWith(edition);
    },
  );
  it('ouvre la date annoncée dans le sitemap et affiche ses positions, même après une nouvelle édition', async () => {
    dataset();
    expect(
      publishedChartSitemapPaths([{ chart: 'skills', week: '2026-10-10', entries: 1 }]),
    ).toContain('/charts/skills/2026-10-10');
    const props = {
      params: Promise.resolve({ platform: '2026-10-10' }),
      searchParams: Promise.resolve({}),
    };
    const html = renderToStaticMarkup(await SkillsPage(props));
    expect(html).toContain('<h3>archive-skill</h3>');
    expect(html).not.toContain('<h3>new-skill</h3>');
    expect(html).toContain('10 oct. 2026');
    const metadata = await generateMetadata(props);
    expect(metadata.alternates?.canonical).toBe('/charts/skills/2026-10-10');
    expect(metadata.robots).toMatchObject({ index: true });
  });

  it('ne remplace pas une archive absente par la dernière édition', async () => {
    dataset();
    await expect(
      SkillsPage({
        params: Promise.resolve({ platform: '2026-10-09' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow(/404/);
  });

  it('garde les filtres utilisables et hors index, ainsi que le catalogue par plateforme', async () => {
    dataset();
    const metadata = await generateMetadata({
      params: Promise.resolve({ platform: '2026-10-10' }),
      searchParams: Promise.resolve({ filter: 'Coding' }),
    });
    expect(metadata.robots).toMatchObject({ index: false });
    const page = await SkillsPage({
      params: Promise.resolve({ platform: 'claude-code' }),
      searchParams: Promise.resolve({}),
    });
    expect(renderToStaticMarkup(page)).toContain('Catalogue /charts/skills/claude-code');
    expect(
      (
        await generateMetadata({
          params: Promise.resolve({ platform: 'claude-code' }),
          searchParams: Promise.resolve({}),
        })
      ).title,
    ).toBe('Catalogue');
  });

  it('résout aussi les éditions et la méthode dans les routes partagées entre langues', () => {
    for (const edition of ['2026-10-10', '2026-W41'])
      expect(matchSharedPage(`/charts/skills/${edition}`)).toEqual({
        route: '/charts/:slug/:week',
        params: { slug: 'skills', week: edition },
      });
    expect(matchSharedPage('/charts/skills/methodology')).toEqual({
      route: '/charts/:slug/methodology',
      params: { slug: 'skills' },
    });
    expect(matchSharedPage('/charts/skills/claude-code')?.route).toBe('/charts/skills/:platform');
  });

  it('conserve également la date demandée sur les autres archives du sitemap', async () => {
    dataset();
    const searchParams = Promise.resolve({});
    const pages = [
      await ChartWeekPage({
        params: Promise.resolve({ slug: 'github', week: '2026-10-10' }),
        searchParams,
      }),
      await HistoryWeekPage({ params: Promise.resolve({ week: '2026-10-10' }), searchParams }),
      await RisingWeekPage({ params: Promise.resolve({ week: '2026-10-10' }), searchParams }),
    ];
    for (const page of pages) {
      const html = renderToStaticMarkup(page);
      expect(html).toContain('<h3>archive-skill</h3>');
      expect(html).not.toContain('<h3>new-skill</h3>');
    }
  });
});
