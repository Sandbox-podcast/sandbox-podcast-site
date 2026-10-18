import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  chartMethodPath,
  chartMethodSummary,
  chartPublicationSchema,
} from '../src/domain/chart-publication.ts';
import { PublishedMethodology } from '../src/components/published-methodology.tsx';
import { ChartPublication } from '../src/components/chart-publication.tsx';
import { publicChartEdition } from '../src/lib/charts-public.ts';
import { generateMetadata } from '../src/app/(fr)/charts/[slug]/methodology/page.tsx';

vi.mock('../src/lib/charts-public.ts', () => ({ publicChartEdition: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

const publication = chartPublicationSchema.parse({
  scoringVersion: 'github-momentum-v1+stars',
  observedAt: '2026-10-10T02:34:40.454Z',
  calculatedAt: '2026-10-10T09:57:37.585Z',
  publishedAt: '2026-10-10T09:57:38.967Z',
});

describe('preuve et méthode de chaque édition', () => {
  it('distingue les dates de relevé, de calcul et de publication sans promettre une actualisation', () => {
    const html = renderToStaticMarkup(createElement(ChartPublication, { publication }));
    for (const date of [publication.observedAt, publication.calculatedAt, publication.publishedAt])
      expect(html).toContain(`dateTime="${date}"`);
    expect(html).toContain('Dernier relevé inclus');
    expect(html).toContain('Calcul figé');
    expect(html).toContain('Publication');
    expect(html).toContain('UTC');
    expect(html).toContain('github-momentum-v1+stars');
  });

  it('identifie les baselines de popularité et les limites des anciens modèles', () => {
    expect(chartMethodSummary('github', 'github-momentum-v1+stars').description).toContain(
      'stars cumulées',
    );
    expect(chartMethodSummary('skills', 'skills-installs-v1').description).toContain(
      'installations cumulées',
    );
    expect(chartMethodSummary('models', 'models-cross-source-v1').description).toContain(
      'ne garantit pas deux évaluations indépendantes',
    );
    expect(chartMethodSummary('github', 'github-reference-v3').description).toContain(
      'pondérations',
    );
    expect(chartMethodSummary('github', 'github-momentum-observed').description).toContain(
      'OpenSSF Scorecard ne couvre pas assez',
    );
    expect(chartMethodSummary('skills', 'skills-installs-observed').description).toContain(
      'Aucune installation manquante',
    );
    expect(chartMethodSummary('skills', 'skills-momentum-observed').description).toContain(
      "n'est pas le profil corroboré",
    );
    expect(chartMethodPath('skills', '2026-10-14T12:00Z')).toBe(
      '/charts/skills/methodology?edition=2026-10-14T12%3A00Z',
    );
  });

  it('charge la version demandée et affiche les poids effectifs, distincts du profil préparé', async () => {
    vi.mocked(publicChartEdition).mockResolvedValueOnce({
      chart: 'github',
      year: 2026,
      week: 10,
      weekId: '2026-10-10',
      publishedAt: publication.publishedAt,
      frozenAt: publication.calculatedAt,
      scoringVersion: publication.scoringVersion,
      publication,
      config: { momentum: { starVelocity: 0.45 } },
      entries: [
        {
          rank: 1,
          previousRank: null,
          rankChange: 0,
          status: 'new',
          name: 'Exemple',
          organization: null,
          sourceUrl: 'https://github.com/example/repo',
          license: 'MIT',
          openWeights: null,
          sources: [],
          slug: 'example-repo',
          githubUrl: 'https://github.com/example/repo',
          description: null,
          stars: 158029,
          stars7d: null,
          growthPercentage: null,
          momentumScore: 100,
          metrics: { stars: 158029 },
          dimensions: { reach: 100 },
          provenance: { weights: { stars: 1 } },
        },
      ],
    });
    const html = renderToStaticMarkup(
      await PublishedMethodology({ chart: 'github', editionId: '2026-10-10' }),
    );
    expect(publicChartEdition).toHaveBeenLastCalledWith('github', '2026-10-10');
    expect(html).toContain('stars cumulées');
    expect(html).toContain('<code>stars</code> : 100 %');
    expect(html).not.toContain('github-reference-v3');
    expect(html).toContain('/charts/github/2026-10-10');
    expect(html).toContain('/api/charts/github/2026-10-10');
  });

  it('refuse une édition absente ou une requête ambiguë au lieu de montrer la dernière méthode', async () => {
    vi.mocked(publicChartEdition).mockResolvedValueOnce(null);
    await expect(
      PublishedMethodology({ chart: 'skills', editionId: '2026-10-09' }),
    ).rejects.toThrow('NOT_FOUND');
    await expect(
      generateMetadata({
        params: Promise.resolve({ slug: 'skills' }),
        searchParams: Promise.resolve({ edition: ['2026-10-10', '2026-10-14'] }),
      }),
    ).rejects.toThrow('NOT_FOUND');
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: 'skills' }),
      searchParams: Promise.resolve({ edition: '2026-10-10' }),
    });
    expect(meta.alternates?.canonical).toBe('/charts/skills/methodology?edition=2026-10-10');
  });
});
