import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adminWriteSchema,
  assertNoEditorialRemovals,
  editableContentSchema,
} from '../src/domain/admin-content.ts';
import { episodeSchema, hostSchema } from '../src/domain/schema.ts';
import { loadContent } from '../src/lib/load.ts';
import {
  adminStorageMode,
  preparePublishedEditorialContent,
  saveAdminContent,
} from '../src/lib/admin-persistence.ts';

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

  it('autorise le retrait des épisodes uniquement signés par des animateurs placeholder', () => {
    const content = editableFixture();
    const demo = episodeSchema.parse({
      number: 99,
      title: 'Épisode de démonstration',
      dek: 'Contenu simulé pour l’interface.',
      publishedAt: '2026-10-01T12:00:00Z',
      durationSec: 3600,
      description: 'Description de démonstration pour vérifier le nettoyage admin.',
      hosts: ['equipe-sandbox'],
      topics: content.topics[0] ? [content.topics[0].slug] : [],
      cover: { tone: 0, kicker: 'Épisode 99' },
    });
    const withDemo = { ...content, episodes: [demo, ...content.episodes] };
    expect(() => {
      assertNoEditorialRemovals(withDemo, content);
    }).not.toThrow();
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

  it('accepte les profils sociaux optionnels des animateurs et exige HTTPS', () => {
    const profile = {
      slug: 'lea',
      name: 'Léa',
      handle: '@lea',
      role: 'Animatrice',
      bio: 'Présente le podcast.',
    };
    expect(hostSchema.parse(profile).socials).toEqual({});
    expect(
      hostSchema.parse({
        ...profile,
        socials: {
          linkedin: 'https://www.linkedin.com/in/lea/',
          github: 'https://github.com/lea',
          x: 'https://x.com/lea',
        },
      }).socials,
    ).toEqual({
      linkedin: 'https://www.linkedin.com/in/lea/',
      github: 'https://github.com/lea',
      x: 'https://x.com/lea',
    });
    expect(
      hostSchema.safeParse({ ...profile, socials: { github: 'http://github.com/lea' } }).success,
    ).toBe(false);
  });
});

describe('état du stockage du backoffice', () => {
  it('distingue le fichier local, Postgres et la base absente en production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(adminStorageMode()).toBe('local');

    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('POSTGRES_URL', '');
    expect(adminStorageMode()).toBe('unavailable');
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/site');
    expect(adminStorageMode()).toBe('postgres');

    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('POSTGRES_URL', 'postgresql://localhost/site');
    expect(adminStorageMode()).toBe('postgres');
  });

  it('refuse d’écrire en production sans base configurée', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('POSTGRES_URL', '');
    const content = editableFixture();
    await expect(saveAdminContent(content, 'draft', null)).rejects.toThrow(/Postgres/);
  });

  it('ignore Postgres pendant le build Next même si DATABASE_URL est défini', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/db');
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    await expect(preparePublishedEditorialContent()).resolves.toBeUndefined();
  });
});
