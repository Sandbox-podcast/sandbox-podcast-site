import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ entities: vi.fn(), ranking: vi.fn(), awards: vi.fn() }));
vi.mock('../src/lib/charts-store.ts', () => ({ liveChartEntities: mocks.entities }));
vi.mock('../src/lib/badges-store.ts', () => ({ readRankingBadge: mocks.ranking }));
vi.mock('../src/lib/awards-store.ts', () => ({ readPublicAwards: mocks.awards }));
import { GET } from '../src/app/api/charts/badges/[slug]/route.ts';
import { chartBadgesSchema } from '../src/domain/chart-badges.ts';

const request = (slug = 'test-project') =>
  GET(new Request('https://sandbox.test'), { params: Promise.resolve({ slug }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.entities.mockResolvedValue([
    { entity: { id: 'entity', name: 'Test', slug: 'test-project' }, repo: { githubId: 42 } },
  ]);
  mocks.ranking.mockResolvedValue({ eligibility: { status: 'ranked' } });
  mocks.awards.mockResolvedValue([]);
});
describe('badges accessibles depuis le classement', () => {
  it('retourne les intégrations du rang actuel sans page intermédiaire', async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const data = chartBadgesSchema.parse(await response.json());
    expect(data.badges).toHaveLength(1);
    expect(data.badges[0]?.source).toBe('/badges/github/42/rank.svg');
    expect(data.badges[0]?.snippets.markdown).toContain('/badges/github/42/rank.svg');
    expect(mocks.ranking).toHaveBeenCalledWith('42');
    expect(mocks.awards).toHaveBeenCalledWith({ entityId: 'entity', limit: 260 });
  });
  it.each(['stale', 'pending', 'unranked', 'unavailable'])(
    'ne propose aucun rang %s',
    async (status) => {
      mocks.ranking.mockResolvedValue({ eligibility: { status } });
      expect(await (await request()).json()).toEqual({ badges: [] });
    },
  );
  it('propose un Award actif pour une entité sans dépôt et exclut les retraits', async () => {
    mocks.entities.mockResolvedValue([
      { entity: { id: 'entity', name: 'Test', slug: 'test-project' }, repo: null },
    ]);
    const award = {
      id: '00000000-0000-4000-8000-000000000001',
      type: 'best-model',
      chart: 'models',
      name: 'Test',
      slug: 'test-project',
      period: '2026-W41',
      scope: '',
      withdrawnAt: null,
    };
    mocks.awards.mockResolvedValue([award, { ...award, withdrawnAt: '2026-10-26' }]);
    const response = await request();
    const data = chartBadgesSchema.parse(await response.json());
    expect(data.badges).toHaveLength(1);
    expect(data.badges[0]?.campaign).toBe('best_model');
    expect(mocks.ranking).not.toHaveBeenCalled();
  });
  it('refuse un slug invalide et un projet absent', async () => {
    expect((await request('../admin')).status).toBe(404);
    expect(mocks.entities).not.toHaveBeenCalled();
    mocks.entities.mockResolvedValue([]);
    expect((await request()).status).toBe(404);
  });
  it('signale une panne sans inventer de badge ni cacher la panne derrière un cache', async () => {
    mocks.entities.mockRejectedValue(new Error('Database unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const response = await request();
      expect(response.status).toBe(503);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    } finally {
      log.mockRestore();
    }
  });
});
