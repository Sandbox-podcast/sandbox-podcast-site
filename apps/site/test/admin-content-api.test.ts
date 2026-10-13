import { afterEach, describe, expect, it, vi } from 'vitest';
import { editableContentSchema } from '../src/domain/admin-content.ts';
import { loadContent } from '../src/lib/load.ts';

const mocks = vi.hoisted(() => ({
  authenticated: true,
  save: vi.fn(async () => ({ draftEtag: 'etag-next' })),
  revalidate: vi.fn<(path: string, type?: 'page' | 'layout') => void>(),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('../src/lib/admin-auth-db.ts', () => ({
  getAuthenticatedAdmin: async () =>
    mocks.authenticated ? { role: 'admin', id: 'admin-test', username: 'test' } : undefined,
  adminCan: (user: { role: string }, permission: 'read' | 'draft' | 'publish') =>
    permission === 'read' || user.role === 'admin',
}));
vi.mock('../src/lib/admin-persistence.ts', () => ({
  ContentConflictError: class ContentConflictError extends Error {},
  adminStorageMode: () => 'postgres',
  getAdminContent: vi.fn(),
  saveAdminContent: mocks.save,
}));

import { POST } from '../src/app/api/admin/content/route.ts';

afterEach(() => {
  mocks.authenticated = true;
  vi.clearAllMocks();
});

function request(action: 'draft' | 'publish'): Request {
  const base = loadContent();
  const content = editableContentSchema.parse({
    site: base.site,
    hosts: base.hosts,
    topics: base.topics,
    sources: base.sources,
    scoring: base.scoring,
    charts: base.charts,
    entities: base.entities,
    takes: base.takes,
    episodes: base.episodes,
    stories: base.stories,
  });
  return new Request('http://localhost:3000/api/admin/content', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, content, expectedDraftEtag: null }),
  });
}

describe('publication du contenu éditorial', () => {
  it('invalide explicitement l’accueil après une publication', async () => {
    const response = await POST(request('publish'));

    expect(response.status).toBe(200);
    expect(mocks.revalidate).toHaveBeenCalledWith('/', 'page');
    expect(mocks.revalidate).toHaveBeenCalledWith('/', 'layout');
  });

  it('ne révalide pas les pages après la sauvegarde d’un brouillon', async () => {
    const response = await POST(request('draft'));

    expect(response.status).toBe(200);
    expect(mocks.revalidate.mock.calls).toHaveLength(0);
  });
});
