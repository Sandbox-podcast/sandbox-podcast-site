import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ enabled: true, read: vi.fn() }));
vi.mock('../src/lib/news-store', () => ({
  newsPublicEnabled: () => state.enabled,
  readPublishedNews: state.read,
}));
import { GET } from '../src/app/api/news/route';

beforeEach(() => {
  state.enabled = true;
  state.read
    .mockReset()
    .mockResolvedValue({ checkedAt: null, sources: [], items: [], nextCursor: null });
});
describe('pagination publique News', () => {
  it('ferme l’API avant activation sans lire la base', async () => {
    state.enabled = false;
    expect((await GET(new Request('https://sandbox.test/api/news'))).status).toBe(404);
    expect(state.read).not.toHaveBeenCalled();
  });
  it.each([
    'not-json',
    '{}',
    JSON.stringify({ publishedAt: 'invalid', id: 'x' }),
    'x'.repeat(1001),
  ])('refuse un curseur invalide avant de lire la base', async (cursor) => {
    expect(
      (await GET(new Request(`https://sandbox.test/api/news?${new URLSearchParams({ cursor })}`)))
        .status,
    ).toBe(400);
    expect(state.read).not.toHaveBeenCalled();
  });
  it('valide et transmet le curseur, sans cache', async () => {
    const cursor = { publishedAt: '2026-10-18', id: 'rundown:/articles/test' };
    const response = await GET(
      new Request(
        `https://sandbox.test/api/news?${new URLSearchParams({ cursor: JSON.stringify(cursor) })}`,
      ),
    );
    expect(response.status).toBe(200);
    expect(state.read).toHaveBeenCalledWith(expect.any(Date), cursor);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('conserve une erreur lisible sans détails SQL', async () => {
    state.read.mockRejectedValue(new Error('secret database detail'));
    const response = await GET(new Request('https://sandbox.test/api/news'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Fil indisponible.' });
  });
});
