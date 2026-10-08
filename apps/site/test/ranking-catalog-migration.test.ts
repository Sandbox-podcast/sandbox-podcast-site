import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();

async function applyMigration(file: string) {
  const migration = readFileSync(`drizzle/${file}`, 'utf8');
  for (const statement of migration.split('--> statement-breakpoint')) {
    if (statement.trim()) await db.exec(statement);
  }
}

describe('migration du catalogue de classements SEO', () => {
  beforeAll(async () => {
    await applyMigration('0002_sandbox_charts.sql');
    await applyMigration('0003_ranking_catalog_localization.sql');
    await applyMigration('0004_site_content_localizations.sql');
    await db.exec(
      `INSERT INTO chart_entities (id, type, slug, name, source_url)
       VALUES ('skill-1', 'skill', 'review-skill', 'Review Skill', 'https://github.com/example/review-skill')`,
    );
  });

  afterAll(async () => {
    await db.close();
  });

  it('stocke collections, versions localisées et preuves liées à une entité', async () => {
    await db.exec(
      `INSERT INTO ranking_collections (
         collection_key, source_chart, entity_kind, intent, method, target,
         minimum_candidates, minimum_public_editions, active
       ) VALUES (
         'best-skills-claude-code', 'skills', 'skill', 'editorial_best', 'editorial_review',
         '{"platform":"claude-code","task":"code-review"}'::jsonb, 10, 2, true
       )`,
    );
    await db.exec(
      `INSERT INTO ranking_collection_localizations (
         collection_key, locale, localized_slug, localized_path, title, meta_title,
         meta_description, heading, introduction, methodology_summary, review_state,
         source_locale, source_hash, reviewed_at, published_at
       ) VALUES (
         'best-skills-claude-code', 'fr-FR', 'meilleurs-skills-claude-code',
         '/charts/skills/claude-code', 'Les meilleurs skills pour Claude Code',
         'Meilleurs skills Claude Code : sélection testée',
         'Une sélection de skills évalués sur leur utilité, leur compatibilité et leurs limites.',
         'Les meilleurs skills pour Claude Code',
         'Une sélection testée de skills pour Claude Code avec leurs usages et critères de choix.',
         'Chaque skill est évalué avec le même protocole documenté et des sources citées.',
         'published', 'fr-FR', '0123456789abcdef', now(), now()
       )`,
    );
    await db.exec(
      `INSERT INTO ranking_evidence (
         id, entity_id, collection_key, fact_key, fact_value, source_kind, source_url,
         observed_at, verified_at, reviewer, review_state
       ) VALUES (
         'proof-1', 'skill-1', 'best-skills-claude-code', 'platform-compatibility',
         '"claude-code"'::jsonb, 'repository', 'https://github.com/example/review-skill',
         now(), now(), 'editor', 'verified'
       )`,
    );

    const result = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM ranking_collection_localizations WHERE review_state = 'published'`,
    );
    expect(result.rows[0]?.count).toBe(1);
  });

  it('refuse de présenter un classement de popularité comme une sélection des meilleurs', async () => {
    await expect(
      db.exec(
        `INSERT INTO ranking_collections (
           collection_key, source_chart, entity_kind, intent, method
         ) VALUES ('unsupported-best', 'skills', 'skill', 'editorial_best', 'popularity')`,
      ),
    ).rejects.toThrow();
  });

  it('relie une édition à une collection déclarée', async () => {
    await db.exec(
      `INSERT INTO weekly_chart_editions (id, chart_type, week, scoring_version, config, payload)
       VALUES ('github-edition', 'github', '2026-W41', 'momentum-v1', '{}'::jsonb, '{}'::jsonb)`,
    );
    await expect(
      db.exec(
        `INSERT INTO weekly_chart_editions (id, chart_type, week, scoring_version, config, payload)
         VALUES ('unknown-edition', 'unregistered-chart', '2026-W41', 'v1', '{}'::jsonb, '{}'::jsonb)`,
      ),
    ).rejects.toThrow();
  });

  it('stocke une traduction de page avec un chemin et une relecture tracés', async () => {
    await db.exec(
      `INSERT INTO site_content_localizations (
         content_kind, content_key, locale, localized_path, title, meta_title,
         meta_description, heading, introduction, sections, chapters, review_state,
         source_locale, source_hash, reviewed_at, published_at
       ) VALUES (
         'episode', '12', 'en', '/en/episodes/12', 'An episode about AI rankings',
         'AI rankings explained in episode 12',
         'A reviewed English episode page with its context, resources and translated chapters.',
         'How AI rankings work',
         'This episode explains the evidence and criteria behind a transparent AI ranking.',
         '[{"heading":"What we measured","paragraphs":["The methodology is documented."]}]'::jsonb,
         '[{"startSec":30,"title":"The scoring method"}]'::jsonb,
         'published', 'fr-FR', '0123456789abcdef', now(), now()
       )`,
    );
    const result = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM site_content_localizations WHERE locale = 'en'`,
    );
    expect(result.rows[0]?.count).toBe(1);
    await expect(
      db.exec(
        `INSERT INTO site_content_localizations (
           content_kind, content_key, locale, localized_path, title, meta_title,
           meta_description, heading, introduction, sections, source_locale, source_hash
         ) VALUES (
           'episode', 'bad-number', 'en', '/en/episodes/bad-number', 'Wrong episode key',
           'This title meets the minimum length',
           'This description is long enough to pass the storage constraint for this test.',
           'Wrong key', 'This introduction is intentionally long enough to pass the storage constraint.',
           '[{"heading":"Context","paragraphs":["Text."]}]'::jsonb,
           'fr-FR', '0123456789abcdef'
         )`,
      ),
    ).rejects.toThrow();
  });
});
