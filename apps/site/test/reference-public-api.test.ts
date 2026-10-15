import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ proof: vi.fn() }));
vi.mock('../src/lib/charts-public.ts', () => ({ publicReferenceArtifact: mocks.proof }));
import { GET } from '../src/app/api/charts/[chart]/[edition]/proof/route.ts';
afterEach(() => {
  vi.resetAllMocks();
});
const request = (chart = 'models', edition = 'current') =>
  GET(new Request(`https://example.com/api/charts/${chart}/${edition}/proof`), {
    params: Promise.resolve({ chart, edition }),
  });
describe('API des preuves publiques', () => {
  it('refuse les routes invalides et ne révèle pas les brouillons sans preuve publiée', async () => {
    expect((await request('private', 'current')).status).toBe(404);
    expect(mocks.proof).not.toHaveBeenCalled();
    mocks.proof.mockResolvedValue(null);
    expect((await request()).status).toBe(404);
  });
  it('transmet un manifeste en flux sans couper les caractères Unicode', async () => {
    const artifact = { sha256: 'fixture', text: 'Méthode🙂'.repeat(5000) };
    mocks.proof.mockResolvedValue(artifact);
    const response = await request('models', '2026-10-13');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toContain('models-2026-10-13-proof.json');
    expect(await response.json()).toEqual(artifact);
  });
  it('rend une indisponibilité explicite sans exposer le message interne', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.proof.mockRejectedValue(new Error('private-database-detail'));
    const response = await request();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private-database-detail');
    vi.restoreAllMocks();
  });
});
