import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '../src/db/schema.ts';
import { loadCurrentChartSearchHits } from '../src/lib/chart-search.ts';

const pg = new PGlite();
const db = drizzle(pg, { schema });
const state = vi.hoisted(() => ({ configured: true, failed: false }));
vi.mock('../src/db/client.ts', () => ({
  hasDatabaseConfiguration: () => state.configured,
  getDb: () => {
    if (state.failed) throw new Error('Database offline');
    return db;
  },
}));

beforeAll(async () => {
  await pg.exec(`
    CREATE TABLE chart_entities (
      id text PRIMARY KEY, slug text NOT NULL, name text NOT NULL, description text,
      organization text, source_url text NOT NULL
    );
    CREATE TABLE github_projects (id text PRIMARY KEY, entity_id text NOT NULL, full_name text);
    CREATE TABLE weekly_chart_editions (
      chart_type text NOT NULL, week text NOT NULL, payload jsonb NOT NULL, published_at timestamptz
    );
  `);
});
afterAll(() => pg.close());
afterEach(async () => {
  state.configured = true;
  state.failed = false;
  vi.restoreAllMocks();
  await pg.exec('TRUNCATE chart_entities, github_projects, weekly_chart_editions');
});

async function edition(chart: string, week: string, slug: string, published = true) {
  await pg.query('INSERT INTO weekly_chart_editions VALUES ($1, $2, $3, $4)', [
    chart,
    week,
    JSON.stringify({ entries: [{ entity: slug, rank: 1 }] }),
    published ? '2026-10-18T00:00:00Z' : null,
  ]);
}

describe('index de recherche des publications Postgres', () => {
  it('cherche les dernières publications de chaque classement et leurs identifiants réels', async () => {
    for (const [slug, source] of [
      ['github-project', 'https://github.com/example/repo-name'],
      ['rising-project', 'https://github.com/other/rising'],
      ['current-skill', 'https://skills.sh/example/skills/my-skill'],
      ['current-model', 'https://huggingface.co/example/model-id'],
      ['old-project', 'https://example.com/old'],
      ['draft-project', 'https://example.com/draft'],
    ]) {
      await pg.query('INSERT INTO chart_entities VALUES ($1, $1, $1, $2, $3, $4)', [
        slug,
        `Description ${slug}`,
        'example',
        source,
      ]);
    }
    await pg.query('INSERT INTO github_projects VALUES ($1, $2, $3)', [
      'repo',
      'github-project',
      'example/repo-name',
    ]);
    await edition('github', '2026-10-10', 'old-project');
    await edition('github', '2026-10-18T00:00Z', 'github-project');
    await edition('github', '2026-10-18T12:00Z', 'draft-project', false);
    await edition('skills', '2026-10-17T12:00Z', 'current-skill');
    await edition('models', '2026-10-16', 'current-model');
    await edition('rising', '2026-W41', 'rising-project');
    const hits = await loadCurrentChartSearchHits();
    expect(hits.map(({ slug }) => slug).sort()).toEqual([
      'current-model',
      'current-skill',
      'github-project',
      'rising-project',
    ]);
    expect(hits.find(({ slug }) => slug === 'github-project')).toMatchObject({
      href: '/charts/project/github-project',
    });
    expect(hits.find(({ slug }) => slug === 'github-project')?.terms).toContain(
      'example/repo-name',
    );
    expect(hits.find(({ slug }) => slug === 'current-model')).toMatchObject({
      href: '/charts/entity/current-model',
    });
    expect(hits.find(({ slug }) => slug === 'current-model')?.terms).toContain(
      'https://huggingface.co/example/model-id',
    );
  });

  it('ne reprend pas une archive quand une publication récente est vide ou invalide', async () => {
    await pg.query('INSERT INTO chart_entities VALUES ($1, $1, $1, NULL, NULL, $2)', [
      'old-project',
      'https://example.com/old',
    ]);
    await edition('github', '2026-10-10', 'old-project');
    await pg.query('INSERT INTO weekly_chart_editions VALUES ($1, $2, $3, $4)', [
      'github',
      '2026-10-18',
      JSON.stringify({ entries: [{ entity: '<bad>', rank: -1 }] }),
      '2026-10-18T00:00:00Z',
    ]);
    expect(await loadCurrentChartSearchHits()).toEqual([]);
  });

  it('laisse la recherche éditoriale répondre sans base configurée ou pendant une panne', async () => {
    state.configured = false;
    expect(await loadCurrentChartSearchHits()).toEqual([]);
    state.configured = true;
    state.failed = true;
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await loadCurrentChartSearchHits()).toEqual([]);
    expect(log).toHaveBeenCalledWith('Chart search index unavailable:', 'Error');
  });
});
