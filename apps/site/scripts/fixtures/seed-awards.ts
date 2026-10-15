import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb } from '../../src/db/client.ts';
import {
  chartEntities,
  githubProjects,
  weeklyChartEditions,
  weeklyRankings,
} from '../../src/db/schema.ts';
import { snapshotSchema } from '../../src/domain/schema.ts';
import {
  awardChartSchema,
  requiredAwardSundays,
  type AwardChart,
} from '../../src/domain/awards.ts';
import { awardFixture } from './awards.ts';
import { assignClosedAwards, readPublicAwards } from '../../src/lib/awards-store.ts';

/** Sources explicitement fictives, réservées à la démonstration loopback et aux tests. */
export async function seedAwardFixtures(
  options: { year?: string; charts?: readonly AwardChart[]; days?: readonly string[] } = {},
) {
  const connection = process.env['DATABASE_URL'];
  if (
    process.env.NODE_ENV !== 'test' &&
    (!connection ||
      new URL(connection).hostname !== '127.0.0.1' ||
      process.env.NODE_ENV === 'production')
  )
    throw new Error(
      'Les fixtures Awards exigent une base de test ou une connexion loopback de développement.',
    );
  const db = getDb();
  const days = options.days ?? requiredAwardSundays('annual', options.year ?? '2025');
  const charts = options.charts ?? awardChartSchema.options;
  for (const chart of charts) {
    const prefix = chart === 'github' || chart === 'rising' ? 'github-' : `${chart}-`;
    for (const [index, day] of [...days].sort().entries()) {
      const order =
        chart === 'github' && index === days.length - 1 ? ['c', 'a', 'b'] : ['a', 'b', 'c'];
      const source = awardFixture(chart, day, order, prefix);
      for (const row of source.rows) {
        await db
          .insert(chartEntities)
          .values({
            id: row.entityId,
            type: chart === 'skills' ? 'skill' : chart === 'models' ? 'model' : 'github_project',
            slug: row.slug,
            name: row.name,
            description:
              'FIXTURE : démonstration locale des distinctions, sans projet ni mesure réels.',
            category: 'Other',
            sourceUrl: `https://example.org/${row.slug}`,
          })
          .onConflictDoNothing();
        if (row.githubId !== null)
          await db
            .insert(githubProjects)
            .values({
              id: `repo-${row.entityId}`,
              entityId: row.entityId,
              githubId: row.githubId,
              owner: 'fixture',
              repo: row.slug,
              fullName: `fixture/${row.slug}`,
              githubCreatedAt: '2024-01-01T00:00:00Z',
              githubUpdatedAt: `${day}T00:00:00Z`,
              defaultBranch: 'main',
              archived: false,
              fork: false,
              disabled: false,
              status: 'tracked',
            })
            .onConflictDoNothing();
      }
      const inserted = await db
        .insert(weeklyChartEditions)
        .values({
          id: source.id,
          chart,
          week: day,
          scoringVersion: source.scoringVersion,
          config: z.record(z.string(), z.unknown()).parse(source.config),
          payload: snapshotSchema.parse(source.payload),
          frozenAt: source.frozenAt,
          publishedAt: source.publishedAt,
        })
        .onConflictDoNothing()
        .returning({ id: weeklyChartEditions.id });
      if (inserted.length)
        await db.insert(weeklyRankings).values(
          source.rows.map((row) => ({
            id: randomUUID(),
            editionId: source.id,
            entityId: row.entityId,
            rank: row.rank,
            score: row.score,
            previousRank: null,
            rankChange: 0,
            status: 'new',
            metadata: row.metadata,
          })),
        );
    }
  }
}

export async function seedExtendedAwardPreview() {
  await seedAwardFixtures();
  const periods = {
    'github-category': '2025-W52',
    'biggest-mover': '2025-W52',
    'skill-week': '2025-W52',
    'best-model': '2025-W52',
    'rookie-month': '2025-12',
    annual: '2025',
  } as const;
  for (const type of Object.keys(periods) as (keyof typeof periods)[]) {
    const result = await assignClosedAwards({
      type,
      period: periods[type],
      now: new Date('2026-01-05T03:00:00Z'),
    });
    if (result.failed || result.created + result.existing === 0)
      throw new Error(`Démonstration ${type} incomplète.`);
  }
  return (await readPublicAwards({ limit: 260 })).filter((award) => award.type !== 'rising-star');
}
