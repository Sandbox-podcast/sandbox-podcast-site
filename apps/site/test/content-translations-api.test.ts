import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../src/app/api/admin/translations/route';

const mocks = vi.hoisted(() => ({
  user: { role: 'admin' },
  authenticated: true,
  import: vi.fn(async () => ({ locale: 'en', imported: 1 })),
  pack: vi.fn(async () => ({ version: 1, sourceLocale: 'fr-FR', sources: [] })),
  revalidate: vi.fn(),
}));
vi.mock('../src/lib/admin-auth-db.ts', () => ({
  getAuthenticatedAdmin: async () => (mocks.authenticated ? mocks.user : undefined),
  adminCan: (user: { role: string }, permission: string) =>
    permission === 'read' || user.role === 'admin',
}));
vi.mock('../src/lib/content-translations-store.ts', () => ({
  currentTranslationSourcePack: mocks.pack,
  importContentTranslations: mocks.import,
  publishedContentDictionary: async () => ({}),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
afterEach(() => {
  mocks.authenticated = true;
  mocks.user.role = 'admin';
  vi.clearAllMocks();
});
const request = (origin = 'http://localhost:3004', body = '{}') =>
  new Request('http://localhost:3004/api/admin/translations', {
    method: 'POST',
    headers: { host: 'localhost:3004', origin, 'Content-Type': 'application/json' },
    body,
  });
describe('permissions du workflow de traduction', () => {
  it('refuse un export sans session et une importation depuis une origine externe', async () => {
    mocks.authenticated = false;
    expect((await GET(new Request('http://localhost:3004/api/admin/translations'))).status).toBe(
      401,
    );
    mocks.authenticated = true;
    expect((await POST(request('https://example.com'))).status).toBe(403);
    expect(mocks.import).not.toHaveBeenCalled();
  });
  it('permet la lecture à un éditeur et réserve l’import au rôle admin', async () => {
    mocks.user.role = 'editor';
    expect((await GET(new Request('http://localhost:3004/api/admin/translations'))).status).toBe(
      200,
    );
    expect((await POST(request())).status).toBe(403);
    expect(mocks.import).not.toHaveBeenCalled();
  });
  it('refuse les données invalides et les gros fichiers avant de toucher le stockage', async () => {
    expect((await POST(request())).status).toBe(422);
    expect((await POST(request('http://localhost:3004', 'x'.repeat(1_600_001)))).status).toBe(413);
    expect(mocks.import).not.toHaveBeenCalled();
  });
  it('invalide les pages seulement après un import autorisé et validé', async () => {
    const body = JSON.stringify({
      version: 1,
      locale: 'en',
      translations: [{ sourceHash: 'a'.repeat(64), source: 'Bonjour', text: 'Hello' }],
    });
    const response = await POST(request('http://localhost:3004', body));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ locale: 'en', imported: 1 });
    expect(mocks.revalidate).toHaveBeenCalledWith('/', 'layout');
  });
});
