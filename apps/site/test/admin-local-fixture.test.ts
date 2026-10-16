import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs/promises')>()),
  readFile: mocks.read,
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
  mocks.read.mockReset();
});

describe('isolation du contenu de la prévisualisation navigateur', () => {
  it('lit uniquement le fichier réservé aux fixtures en développement', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SANDBOX_FRONT_PREVIEW', '1');
    const read = mocks.read.mockRejectedValue(
      Object.assign(new Error('Absent'), { code: 'ENOENT' }),
    );
    const { getAdminContent } = await import('../src/lib/admin-persistence');
    await getAdminContent();
    expect(read).toHaveBeenCalledWith(join(process.cwd(), '.local/front-content.json'), 'utf8');
    expect(read).not.toHaveBeenCalledWith(join(process.cwd(), '.site-content.local.json'), 'utf8');
  });

  it('ne lit aucune fixture locale en production, même avec le drapeau actif', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SANDBOX_FRONT_PREVIEW', '1');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('POSTGRES_URL', '');
    const read = mocks.read;
    const { preparePublishedEditorialContent } = await import('../src/lib/admin-persistence');
    await preparePublishedEditorialContent();
    expect(read).not.toHaveBeenCalled();
  });
  it('isole chaque serveur de test et refuse les chemins hors du dossier local', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SANDBOX_FRONT_PREVIEW', '1');
    vi.stubEnv('SANDBOX_FRONT_CONTENT_FILE', 'analytics-e2e-123.json');
    mocks.read.mockRejectedValue(Object.assign(new Error('Absent'), { code: 'ENOENT' }));
    let module = await import('../src/lib/admin-persistence');
    await module.getAdminContent();
    expect(mocks.read).toHaveBeenCalledWith(
      join(process.cwd(), '.local/analytics-e2e-123.json'),
      'utf8',
    );
    vi.resetModules();
    vi.stubEnv('SANDBOX_FRONT_CONTENT_FILE', '../published.json');
    module = await import('../src/lib/admin-persistence');
    await module.getAdminContent();
    expect(mocks.read).toHaveBeenLastCalledWith(
      join(process.cwd(), '.local/front-content.json'),
      'utf8',
    );
  });
});
