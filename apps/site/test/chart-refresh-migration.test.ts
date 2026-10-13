import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';

describe('migration des créneaux de collecte', () => {
  it('préserve les relevés quotidiens et autorise deux créneaux le même jour', async () => {
    const pg = new PGlite();
    try {
      for (const migration of [
        '0002_sandbox_charts.sql',
        '0005_external_chart_sources.sql',
        '0007_daily_chart_editions.sql',
      ])
        for (const statement of readFileSync(`drizzle/${migration}`, 'utf8').split(
          '--> statement-breakpoint',
        ))
          if (statement.trim()) await pg.exec(statement);

      await pg.exec(`
        INSERT INTO chart_entities (id, type, slug, name, source_url)
        VALUES ('entity', 'github_project', 'project', 'Project', 'https://github.com/acme/project');
        INSERT INTO github_projects (
          id, entity_id, github_id, owner, repo, full_name, github_created_at, github_updated_at,
          default_branch, archived, fork, disabled
        ) VALUES (
          'project', 'entity', 1, 'acme', 'project', 'acme/project', '2026-01-01T00:00:00Z',
          '2026-10-13T00:00:00Z', 'main', false, false, false
        );
        INSERT INTO github_daily_snapshots (
          id, github_project_id, snapshot_date, stars, forks, open_issues, collected_at
        ) VALUES ('daily-old', 'project', '2026-10-13', 20, 2, 1, '2026-10-13T02:00:00Z');
        INSERT INTO chart_entity_sources (
          id, entity_id, provider, external_id, source_url, source_label
        ) VALUES ('source', 'entity', 'github', 'acme/project', 'https://github.com/acme/project', 'GitHub');
        INSERT INTO chart_source_snapshots (
          id, entity_source_id, observed_on, collected_at, metrics
        ) VALUES ('external-old', 'source', '2026-10-13', '2026-10-13T02:00:00Z', '{"stars": 20}');
      `);

      for (const statement of readFileSync('drizzle/0010_chart_refresh_slots.sql', 'utf8').split(
        '--> statement-breakpoint',
      ))
        if (statement.trim()) await pg.exec(statement);

      await pg.exec(`
        INSERT INTO github_daily_snapshots (
          id, github_project_id, snapshot_date, refresh_slot_id, stars, forks, open_issues, collected_at
        ) VALUES ('daily-afternoon', 'project', '2026-10-13', '2026-10-13T12:00Z', 24, 2, 1, '2026-10-13T14:00:00Z');
        INSERT INTO chart_source_snapshots (
          id, entity_source_id, observed_on, refresh_slot_id, collected_at, metrics
        ) VALUES ('external-afternoon', 'source', '2026-10-13', '2026-10-13T12:00Z', '2026-10-13T14:00:00Z', '{"stars": 24}');
      `);

      const daily = await pg.query<{ refresh_slot_id: string }>(
        'SELECT refresh_slot_id FROM github_daily_snapshots ORDER BY collected_at',
      );
      const external = await pg.query<{ refresh_slot_id: string }>(
        'SELECT refresh_slot_id FROM chart_source_snapshots ORDER BY collected_at',
      );
      expect(daily.rows.map((row) => row.refresh_slot_id)).toEqual([
        'legacy:2026-10-13',
        '2026-10-13T12:00Z',
      ]);
      expect(external.rows.map((row) => row.refresh_slot_id)).toEqual([
        'legacy:2026-10-13',
        '2026-10-13T12:00Z',
      ]);
    } finally {
      await pg.close();
    }
  });
});
