import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminUser } from '../src/domain/admin-users.ts';
import { chartEditionSchema } from '../src/domain/schema.ts';

const mocks = vi.hoisted(() => ({
  user: undefined as AdminUser | undefined,
  modify: vi.fn(),
  editorial: vi.fn(),
  publish: vi.fn(),
  config: vi.fn(),
  job: vi.fn(),
  skills: vi.fn(),
  models: vi.fn(),
  freezeExternal: vi.fn(),
  data: vi.fn(),
  revalidate: vi.fn(),
  awards: vi.fn(),
}));
vi.mock('../src/pipeline/badges-jobs.ts', () => ({ runAllBadgeAwards: mocks.awards }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('../src/lib/admin-auth-db.ts', async () => {
  const { permissionsForRole } = await import('../src/domain/admin-users.ts');
  return {
    getAuthenticatedAdmin: async () => mocks.user,
    adminCan: (user: AdminUser, action: 'read' | 'draft' | 'publish') =>
      permissionsForRole(user.role)[action],
  };
});
vi.mock('../src/lib/charts-admin.ts', () => ({ chartsAdminData: mocks.data }));
vi.mock('../src/lib/charts-store.ts', () => ({
  modifyChartRepository: mocks.modify,
  publishFrozenCharts: mocks.publish,
  writeChartsConfig: mocks.config,
}));
vi.mock('../src/lib/charts-editorial.ts', () => ({ writeChartsEditorial: mocks.editorial }));
vi.mock('../src/pipeline/github-jobs.ts', () => ({
  collectGithub: mocks.job,
  discoverGithub: mocks.job,
  freezeGithubWeek: mocks.job,
}));
vi.mock('../src/pipeline/external-jobs.ts', () => ({
  collectSkills: mocks.skills,
  collectModels: mocks.models,
  collectExternalCharts: vi.fn(),
  freezeExternalCharts: mocks.freezeExternal,
}));
import { GET, POST } from '../src/app/api/admin/charts/route.ts';
import { GET as cron } from '../src/app/api/cron/[job]/route.ts';

function user(role: AdminUser['role']): AdminUser {
  return { id: 'test-id', username: 'test', displayName: 'Test', role, active: true };
}
function request(body: unknown, origin = 'http://localhost:3004') {
  return new Request('http://localhost:3004/api/admin/charts', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  mocks.user = undefined;
  mocks.editorial.mockResolvedValue('etag-next');
  mocks.job.mockResolvedValue({ status: 'success' });
  mocks.awards.mockResolvedValue({
    processed: 0,
    succeeded: 0,
    failed: 0,
    snapshotsCreated: 0,
    status: 'insufficient_history',
    details: [],
  });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe('permissions SANDBOX CHARTS côté serveur', () => {
  it('refuse une lecture et une écriture sans session', async () => {
    expect((await GET(new Request('http://localhost:3004/api/admin/charts'))).status).toBe(401);
    expect((await POST(request({ action: 'publish', week: '2026-W41' }))).status).toBe(401);
  });
  it('refuse une mutation depuis une autre origine même avec un administrateur', async () => {
    mocks.user = user('admin');
    expect(
      (await POST(request({ action: 'publish', week: '2026-W41' }, 'https://other.example')))
        .status,
    ).toBe(403);
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it('un viewer ne peut modifier ni les notes ni les dépôts', async () => {
    mocks.user = user('viewer');
    expect(
      (await POST(request({ action: 'repository', id: 'test', status: 'tracked' }))).status,
    ).toBe(403);
    expect(mocks.modify).not.toHaveBeenCalled();
  });
  it('un editor peut sauvegarder un brouillon mais pas publier, collecter ou changer le suivi', async () => {
    mocks.user = user('editor');
    const command = {
      action: 'editorial',
      editionId: 'test',
      edition: chartEditionSchema.parse({ week: '2026-W41' }),
      layer: 'draft',
      expectedEtag: null,
    };
    expect((await POST(request(command))).status).toBe(200);
    expect((await POST(request({ ...command, layer: 'published' }))).status).toBe(403);
    expect((await POST(request({ action: 'job', job: 'collect' }))).status).toBe(403);
    expect(
      (await POST(request({ action: 'repository', id: 'test', status: 'blocked' }))).status,
    ).toBe(403);
    expect(mocks.editorial).toHaveBeenCalledOnce();
    expect(mocks.job).not.toHaveBeenCalled();
  });
  it('aucun rôle ne peut modifier les métriques via un champ inattendu', async () => {
    mocks.user = user('admin');
    expect((await POST(request({ action: 'repository', id: 'test', stars: 99999 }))).status).toBe(
      422,
    );
    expect(mocks.modify).not.toHaveBeenCalled();
  });
});
describe('cron authentifié', () => {
  it.each(['skills-daily', 'models-daily', 'github-freeze', 'skills-freeze', 'models-freeze'])(
    'protège le nouveau job %s sans authentification',
    async (job) => {
      vi.stubEnv('CRON_SECRET', 'a-test-secret-at-least-16-chars');
      expect(
        (
          await cron(new Request(`http://localhost:3004/api/cron/${job}`), {
            params: Promise.resolve({ job }),
          })
        ).status,
      ).toBe(401);
      expect(mocks.skills).not.toHaveBeenCalled();
      expect(mocks.models).not.toHaveBeenCalled();
      expect(mocks.freezeExternal).not.toHaveBeenCalled();
    },
  );
  it('isole le gel Skills et invalide les pages publiques après publication', async () => {
    vi.stubEnv('CRON_SECRET', 'a-test-secret-at-least-16-chars');
    mocks.freezeExternal.mockResolvedValue({
      status: 'success',
      snapshotsCreated: 20,
      processed: 20,
      succeeded: 20,
      failed: 0,
      details: [],
    });
    const req = new Request('http://localhost:3004/api/cron/skills-freeze', {
      headers: { Authorization: 'Bearer a-test-secret-at-least-16-chars' },
    });
    expect((await cron(req, { params: Promise.resolve({ job: 'skills-freeze' }) })).status).toBe(
      200,
    );
    expect(mocks.freezeExternal).toHaveBeenCalledWith({ chart: 'skills' });
    expect(mocks.awards).toHaveBeenCalledOnce();
    expect(mocks.models).not.toHaveBeenCalled();
    expect(mocks.revalidate).toHaveBeenCalledWith('/', 'layout');
  });
  it('signale un échec des Awards après le gel sans masquer la publication', async () => {
    vi.stubEnv('CRON_SECRET', 'a-test-secret-at-least-16-chars');
    mocks.freezeExternal.mockResolvedValue({
      status: 'success',
      snapshotsCreated: 1,
      processed: 1,
      succeeded: 1,
      failed: 0,
      details: [],
    });
    mocks.awards.mockResolvedValue({
      status: 'failed',
      snapshotsCreated: 0,
      processed: 0,
      succeeded: 0,
      failed: 1,
      details: ['Awards indisponibles'],
    });
    const response = await cron(
      new Request('http://localhost:3004/api/cron/models-freeze', {
        headers: { Authorization: 'Bearer a-test-secret-at-least-16-chars' },
      }),
      { params: Promise.resolve({ job: 'models-freeze' }) },
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      status: 'partial',
      failed: 1,
      snapshotsCreated: 1,
    });
    expect(mocks.revalidate).toHaveBeenCalledWith('/', 'layout');
  });
  it('signale une collecte partielle au planificateur', async () => {
    vi.stubEnv('CRON_SECRET', 'a-test-secret-at-least-16-chars');
    mocks.models.mockResolvedValue({ status: 'partial', snapshotsCreated: 12 });
    const req = new Request('http://localhost:3004/api/cron/models-daily', {
      headers: { Authorization: 'Bearer a-test-secret-at-least-16-chars' },
    });
    expect((await cron(req, { params: Promise.resolve({ job: 'models-daily' }) })).status).toBe(
      503,
    );
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it('reste fermé sans secret ou avec un mauvais bearer', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect(
      (
        await cron(new Request('http://localhost:3004/api/cron/collect'), {
          params: Promise.resolve({ job: 'collect' }),
        })
      ).status,
    ).toBe(401);
    vi.stubEnv('CRON_SECRET', 'a-test-secret-at-least-16-chars');
    expect(
      (
        await cron(
          new Request('http://localhost:3004/api/cron/collect', {
            headers: { Authorization: 'Bearer wrong' },
          }),
          { params: Promise.resolve({ job: 'collect' }) },
        )
      ).status,
    ).toBe(401);
    expect(mocks.job).not.toHaveBeenCalled();
  });
  it('exécute uniquement le job demandé avec le secret attendu', async () => {
    vi.stubEnv('CRON_SECRET', 'a-test-secret-at-least-16-chars');
    const req = new Request('http://localhost:3004/api/cron/github-daily', {
      headers: { Authorization: 'Bearer a-test-secret-at-least-16-chars' },
    });
    expect((await cron(req, { params: Promise.resolve({ job: 'github-daily' }) })).status).toBe(
      200,
    );
    expect(mocks.job).toHaveBeenCalledOnce();
  });
});
