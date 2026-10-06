import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adminWriteSchema,
  assertNoEditorialRemovals,
  editableContentSchema,
} from '../src/domain/admin-content.ts';
import { loadContent } from '../src/lib/load.ts';
import { adminStorageMode } from '../src/lib/admin-persistence.ts';

afterEach(() => vi.unstubAllEnvs());

function editableFixture() {
  const content = loadContent();
  return editableContentSchema.parse({
    site: content.site,
    hosts: content.hosts,
    topics: content.topics,
    sources: content.sources,
    scoring: content.scoring,
    charts: content.charts,
    entities: content.entities,
    takes: content.takes,
    episodes: content.episodes,
    stories: content.stories,
  });
}

describe('contenu éditable du backoffice', () => {
  it('accepte le contenu éditorial du site et garde les snapshots hors de son schéma', () => {
    const editable = editableFixture();
    expect(editable.stories.length).toBeGreaterThan(0);
    expect(editableContentSchema.safeParse({ ...editable, snapshots: {} }).success).toBe(false);
  });

  it('valide une sauvegarde de brouillon ou de publication', () => {
    const content = editableFixture();
    expect(
      adminWriteSchema.safeParse({ action: 'draft', content, expectedDraftEtag: null }).success,
    ).toBe(true);
    expect(
      adminWriteSchema.safeParse({ action: 'erase', content, expectedDraftEtag: null }).success,
    ).toBe(false);
  });

  it('refuse de retirer une entrée éditoriale existante', () => {
    const content = editableFixture();
    expect(() => {
      assertNoEditorialRemovals(content, { ...content, stories: content.stories.slice(1) });
    }).toThrow(/Suppression refusée/);
  });

  it('conserve un identifiant stable quand le slug d’un article change', () => {
    const content = editableFixture();
    const first = content.stories[0];
    if (!first) throw new Error('fixture');
    const renamed = { ...first, id: first.slug, slug: `${first.slug}-revise` };
    const stories = [renamed, ...content.stories.slice(1)];
    expect(() => {
      assertNoEditorialRemovals(content, { ...content, stories });
    }).not.toThrow();
  });
});

describe('état du stockage du backoffice', () => {
  it('distingue le fichier local, le Blob privé et le Blob absent en production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(adminStorageMode()).toBe('local');

    vi.stubEnv('NODE_ENV', 'production');
    expect(adminStorageMode()).toBe('unavailable');
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token');
    expect(adminStorageMode()).toBe('vercel-blob');
  });
});
