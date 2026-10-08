import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  edition: vi.fn(),
  project: vi.fn(),
}));

vi.mock('../src/lib/charts-public.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/charts-public.ts')>();
  return {
    ...actual,
    publicChartEdition: mocks.edition,
    githubProjectDetail: mocks.project,
  };
});

import { GET as getEdition } from '../src/app/api/charts/[chart]/[edition]/route.ts';
import { GET as getProject } from '../src/app/api/charts/project/[slug]/route.ts';

beforeEach(() => {
  mocks.edition.mockReset().mockResolvedValue(null);
  mocks.project.mockReset().mockResolvedValue(null);
});

describe('statuts des routes publiques de classement', () => {
  it('signale une édition courante absente comme temporairement en attente', async () => {
    const response = await getEdition(new Request('https://example.com'), {
      params: Promise.resolve({ chart: 'github', edition: 'current' }),
    });

    expect(response.status).toBe(202);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('retourne 404 pour une archive ou un projet sans données', async () => {
    const edition = await getEdition(new Request('https://example.com'), {
      params: Promise.resolve({ chart: 'github', edition: '2026-W41' }),
    });
    const project = await getProject(new Request('https://example.com'), {
      params: Promise.resolve({ slug: 'owner-project-42' }),
    });

    expect(edition.status).toBe(404);
    expect(project.status).toBe(404);
    expect(edition.headers.get('Cache-Control')).toBe('no-store');
    expect(project.headers.get('Cache-Control')).toBe('no-store');
  });
});
