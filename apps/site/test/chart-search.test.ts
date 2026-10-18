import { describe, expect, it } from 'vitest';
import { currentChartSearchHits, type ChartSearchEntity } from '../src/domain/chart-search.ts';

const entities: ChartSearchEntity[] = [
  {
    slug: 'krillinai-opencreator-904490600',
    name: 'OpenCreator',
    description: 'Open-source AI workspace',
    organization: 'krillinai',
    href: '/charts/project/krillinai-opencreator-904490600',
  },
  {
    slug: 'old-repo',
    name: 'Old Repo',
    description: null,
    organization: null,
    href: '/charts/project/old-repo',
  },
  {
    slug: 'shared-skill',
    name: 'Shared Skill',
    description: 'Installable skill',
    organization: null,
    href: '/charts/entity/shared-skill',
  },
];

describe('recherche des classements publiés', () => {
  it('ne garde que la dernière édition de chaque classement', () => {
    const hits = currentChartSearchHits(
      [
        {
          chart: 'github',
          week: '2026-10-10',
          entries: [{ entity: 'old-repo', rank: 1 }],
        },
        {
          chart: 'github',
          week: '2026-10-18T00:00Z',
          entries: [{ entity: 'krillinai-opencreator-904490600', rank: 1 }],
        },
      ],
      entities,
    );
    expect(hits.map((hit) => hit.slug)).toEqual(['krillinai-opencreator-904490600']);
    expect(hits[0]).toMatchObject({
      name: 'OpenCreator',
      detail: 'GitHub · #1 · krillinai',
      href: '/charts/project/krillinai-opencreator-904490600',
    });
  });

  it('garde le meilleur rang quand la même fiche est dans deux classements et ignore une fiche inconnue', () => {
    const hits = currentChartSearchHits(
      [
        {
          chart: 'github',
          week: '2026-10-18T00:00Z',
          entries: [
            { entity: 'shared-skill', rank: 5 },
            { entity: 'missing', rank: 1 },
          ],
        },
        {
          chart: 'skills',
          week: '2026-10-18T12:00Z',
          entries: [{ entity: 'shared-skill', rank: 2 }],
        },
      ],
      entities,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.detail).toBe('Skills · #2');
    expect(hits[0]?.terms).toContain('Installable skill');
  });
});
