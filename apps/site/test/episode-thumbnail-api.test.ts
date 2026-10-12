import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../src/app/api/admin/episode-thumbnail/route.ts';

const mocks = vi.hoisted(() => ({
  authenticated: true,
  canDraft: true,
  prepare: vi.fn(async () => ({
    sha256: 'a'.repeat(64),
    image: Buffer.from('webp'),
    width: 1280,
    height: 720,
  })),
  save: vi.fn(async () => `/api/episode-thumbnails/${'a'.repeat(64)}.webp`),
}));
vi.mock('../src/lib/admin-auth-db.ts', () => ({
  getAuthenticatedAdmin: async () => (mocks.authenticated ? { id: 'lou' } : undefined),
  adminCan: () => mocks.canDraft,
}));
vi.mock('../src/lib/episode-thumbnails.ts', () => ({
  MAX_THUMBNAIL_UPLOAD_BYTES: 5_000_000,
  prepareEpisodeThumbnail: mocks.prepare,
  saveEpisodeThumbnail: mocks.save,
}));

afterEach(() => {
  mocks.authenticated = true;
  mocks.canDraft = true;
  vi.clearAllMocks();
});

function request(origin = 'http://localhost:3004', body = new Uint8Array([1, 2, 3])): Request {
  return new Request('http://localhost:3004/api/admin/episode-thumbnail', {
    method: 'POST',
    headers: { host: 'localhost:3004', origin, 'Content-Type': 'image/png' },
    body,
  });
}

describe('permissions et validation de l’import de miniature', () => {
  it('refuse une origine externe, une session absente et un rôle sans droit de brouillon', async () => {
    expect((await POST(request('https://example.test'))).status).toBe(403);
    mocks.authenticated = false;
    expect((await POST(request())).status).toBe(401);
    mocks.authenticated = true;
    mocks.canDraft = false;
    expect((await POST(request())).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('valide le type et la taille avant de stocker', async () => {
    const wrongType = request();
    wrongType.headers.set('Content-Type', 'text/html');
    expect((await POST(wrongType)).status).toBe(415);
    const oversized = request();
    oversized.headers.set('Content-Length', '5000001');
    expect((await POST(oversized)).status).toBe(413);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('enregistre une image validée sans publier l’épisode', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      path: `/api/episode-thumbnails/${'a'.repeat(64)}.webp`,
      width: 1280,
      height: 720,
    });
    expect(mocks.prepare).toHaveBeenCalledWith(Buffer.from([1, 2, 3]));
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
});
