import { randomUUID } from 'node:crypto';
import { and, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { getDb } from '../db/client.ts';
import {
  chartEntities,
  chartEntitySources,
  chartSourceSnapshots,
  weeklyChartEditions,
  weeklyRankings,
} from '../db/schema.ts';
import { snapshotSchema } from '../domain/schema.ts';
import {
  externalEntitySchema,
  externalObservationSchema,
  type ExternalEntity,
  type ExternalObservation,
} from '../domain/external-charts.ts';
import { dateDaysAgo } from '../domain/github-charts.ts';
import { previousComparableEdition } from '../domain/weeks.ts';

export interface ExternalCandidate {
  entity: typeof chartEntities.$inferSelect;
  sources: {
    ref: typeof chartEntitySources.$inferSelect;
    snapshots: (typeof chartSourceSnapshots.$inferSelect)[];
  }[];
}

export async function saveExternalBatch(
  rawEntities: readonly ExternalEntity[],
  rawObservations: readonly ExternalObservation[],
): Promise<number> {
  const entities = rawEntities.map((item) => externalEntitySchema.parse(item));
  const observations = rawObservations.map((item) => externalObservationSchema.parse(item));
  if (entities.length === 0) {
    if (observations.length) throw new Error('Mesures reçues sans entités externes.');
    return 0;
  }
  const entitySlugs = new Set<string>();
  const sourceKeys = new Set<string>();
  for (const entity of entities) {
    if (entitySlugs.has(entity.slug))
      throw new Error(`Entité dupliquée dans le lot : ${entity.slug}.`);
    entitySlugs.add(entity.slug);
    for (const source of entity.sources) {
      const key = JSON.stringify([entity.slug, source.provider, source.externalId]);
      if (sourceKeys.has(key)) throw new Error(`Source dupliquée pour ${entity.slug}.`);
      sourceKeys.add(key);
    }
  }
  for (const observation of observations) {
    if (!entitySlugs.has(observation.entitySlug))
      throw new Error(`Mesure sans entité : ${observation.entitySlug}.`);
    if (
      !sourceKeys.has(
        JSON.stringify([
          observation.entitySlug,
          observation.source.provider,
          observation.source.externalId,
        ]),
      )
    )
      throw new Error(`Mesure sans référence de source : ${observation.source.provider}.`);
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    await tx
      .insert(chartEntities)
      .values(
        entities.map((entity) => ({
          id: randomUUID(),
          type: entity.type,
          slug: entity.slug,
          name: entity.name,
          organization: entity.organization,
          description: entity.description,
          category: entity.category,
          license: entity.license,
          openWeights: entity.openWeights,
          sourceUrl: entity.sourceUrl,
          websiteUrl: entity.websiteUrl,
          active: true,
          updatedAt: new Date().toISOString(),
        })),
      )
      .onConflictDoUpdate({
        target: chartEntities.slug,
        set: {
          type: sql`excluded.type`,
          name: sql`excluded.name`,
          organization: sql`excluded.organization`,
          description: sql`excluded.description`,
          category: sql`excluded.category`,
          license: sql`excluded.license`,
          openWeights: sql`excluded.open_weights`,
          sourceUrl: sql`excluded.source_url`,
          websiteUrl: sql`excluded.website_url`,
          active: true,
          updatedAt: new Date().toISOString(),
        },
      });

    const entityRows = await tx
      .select({ id: chartEntities.id, slug: chartEntities.slug })
      .from(chartEntities)
      .where(
        inArray(
          chartEntities.slug,
          entities.map((entity) => entity.slug),
        ),
      );
    const entityIds = new Map(entityRows.map((row) => [row.slug, row.id]));
    const sourceValues = new Map<string, typeof chartEntitySources.$inferInsert>();
    for (const entity of entities) {
      const entityId = entityIds.get(entity.slug);
      if (!entityId) throw new Error('Entité externe absente après enregistrement.');
      for (const source of entity.sources) {
        sourceValues.set(JSON.stringify([entityId, source.provider, source.externalId]), {
          id: randomUUID(),
          entityId,
          provider: source.provider,
          externalId: source.externalId,
          url: source.url,
          label: source.label,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    const sourceInputs = [...sourceValues.values()];
    if (!sourceInputs.length) throw new Error('Lot externe sans référence de source.');
    await tx
      .insert(chartEntitySources)
      .values(sourceInputs)
      .onConflictDoUpdate({
        target: [
          chartEntitySources.entityId,
          chartEntitySources.provider,
          chartEntitySources.externalId,
        ],
        set: {
          url: sql`excluded.source_url`,
          label: sql`excluded.source_label`,
          updatedAt: new Date().toISOString(),
        },
      });

    const sourceRows = await tx
      .select({
        id: chartEntitySources.id,
        entityId: chartEntitySources.entityId,
        provider: chartEntitySources.provider,
        externalId: chartEntitySources.externalId,
      })
      .from(chartEntitySources)
      .where(
        inArray(chartEntitySources.entityId, [...new Set(sourceInputs.map((row) => row.entityId))]),
      );
    const sourceIds = new Map(
      sourceRows.map((row) => [
        JSON.stringify([row.entityId, row.provider, row.externalId]),
        row.id,
      ]),
    );
    const snapshotInputs = observations.map((observation) => {
      const entityId = entityIds.get(observation.entitySlug);
      const sourceId = entityId
        ? sourceIds.get(
            JSON.stringify([entityId, observation.source.provider, observation.source.externalId]),
          )
        : undefined;
      if (!sourceId)
        throw new Error(`Référence de source introuvable : ${observation.entitySlug}.`);
      return {
        id: randomUUID(),
        entitySourceId: sourceId,
        observedOn: observation.observedOn,
        collectedAt: observation.collectedAt,
        payload: observation.metrics,
      };
    });
    if (!snapshotInputs.length) throw new Error('Lot externe sans mesures à enregistrer.');
    const inserted = await tx
      .insert(chartSourceSnapshots)
      .values(snapshotInputs)
      .onConflictDoNothing()
      .returning({ id: chartSourceSnapshots.id });
    return inserted.length;
  });
}

export async function externalCandidates(
  type: 'skill' | 'model',
  date: string,
  historyDays = 16,
): Promise<ExternalCandidate[]> {
  if (!Number.isSafeInteger(historyDays) || historyDays < 1 || historyDays > 366)
    throw new Error('Fenêtre d’historique externe invalide.');
  const db = getDb();
  const entities = await db
    .select()
    .from(chartEntities)
    .where(and(eq(chartEntities.type, type), eq(chartEntities.active, true)));
  if (!entities.length) return [];
  const entityIds = entities.map((entity) => entity.id);
  const sources = await db
    .select()
    .from(chartEntitySources)
    .where(inArray(chartEntitySources.entityId, entityIds));
  const snapshots = await db
    .select()
    .from(chartSourceSnapshots)
    .innerJoin(chartEntitySources, eq(chartEntitySources.id, chartSourceSnapshots.entitySourceId))
    .where(
      and(
        inArray(chartEntitySources.entityId, entityIds),
        gte(chartSourceSnapshots.observedOn, dateDaysAgo(date, historyDays)),
        lte(chartSourceSnapshots.observedOn, date),
      ),
    )
    .orderBy(chartSourceSnapshots.observedOn);

  const sourcesByEntity = new Map<string, (typeof chartEntitySources.$inferSelect)[]>();
  for (const source of sources) {
    const list = sourcesByEntity.get(source.entityId) ?? [];
    list.push(source);
    sourcesByEntity.set(source.entityId, list);
  }
  const snapshotsBySource = new Map<string, (typeof chartSourceSnapshots.$inferSelect)[]>();
  for (const row of snapshots) {
    const list = snapshotsBySource.get(row.chart_entity_sources.id) ?? [];
    list.push(row.chart_source_snapshots);
    snapshotsBySource.set(row.chart_entity_sources.id, list);
  }
  return entities.map((entity) => ({
    entity,
    sources: (sourcesByEntity.get(entity.id) ?? []).flatMap((ref) => {
      const items = snapshotsBySource.get(ref.id) ?? [];
      return items.length ? [{ ref, snapshots: items }] : [];
    }),
  }));
}

export interface CompetitiveEditionEntry {
  slug: string;
  identity: {
    name: string;
    organization: string | null;
    sourceUrl: string;
    license: string | null;
    openWeights: boolean | null;
  };
  rank: number;
  score: number;
  dimensions: Record<string, number>;
  metrics: Record<string, number>;
  sourceObservedAt: string[];
  sources: unknown[];
}

export async function freezeExternalEdition(
  chart: 'skills' | 'models',
  week: string,
  date: string,
  scoringVersion: string,
  config: Record<string, unknown>,
  rawEntries: readonly CompetitiveEditionEntry[],
  publish: boolean,
): Promise<number> {
  const entries = [...rawEntries].toSorted((a, b) => a.rank - b.rank);
  if (!entries.length) return 0;
  const parsedEntries = entries.map((entry, index) => {
    if (entry.rank !== index + 1) throw new Error('Le rang doit être contigu avant le gel.');
    return entry;
  });
  const db = getDb();
  let written = 0;
  await db.transaction(async (tx) => {
    const published = await tx
      .select()
      .from(weeklyChartEditions)
      .where(and(eq(weeklyChartEditions.chart, chart), isNotNull(weeklyChartEditions.publishedAt)));
    const previousId = previousComparableEdition(
      published.map((row) => row.week),
      week,
    );
    const previous = published.find((row) => row.week === previousId);
    const previousRanks = new Map(
      (previous?.payload.entries ?? []).map((entry) => [entry.entity, entry.rank]),
    );
    const entityRows = await tx
      .select({ id: chartEntities.id, slug: chartEntities.slug })
      .from(chartEntities)
      .where(
        inArray(
          chartEntities.slug,
          parsedEntries.map((entry) => entry.slug),
        ),
      );
    const entityIds = new Map(entityRows.map((row) => [row.slug, row.id]));
    const latestObservedAt = parsedEntries
      .flatMap((entry) => entry.sourceObservedAt)
      .toSorted()
      .at(-1);
    if (!latestObservedAt) throw new Error('Une édition doit référencer au moins une source.');
    const retrievedAt = new Date(latestObservedAt).toISOString();
    const publishedAt = new Date().toISOString();
    const payload = snapshotSchema.parse({
      chart,
      week,
      publishedAt,
      retrievedAt,
      provenance: 'auto',
      entries: parsedEntries.map((entry) => ({
        entity: entry.slug,
        rank: entry.rank,
        score: entry.score,
        dimensions: entry.dimensions,
        metrics: entry.metrics,
      })),
    });
    const id = randomUUID();
    const inserted = await tx
      .insert(weeklyChartEditions)
      .values({
        id,
        chart,
        week,
        scoringVersion,
        config,
        payload,
        publishedAt: publish ? publishedAt : null,
      })
      .onConflictDoNothing()
      .returning({ id: weeklyChartEditions.id });
    if (!inserted.length) return;
    await tx.insert(weeklyRankings).values(
      parsedEntries.map((entry) => {
        const entityId = entityIds.get(entry.slug);
        if (!entityId) throw new Error(`Entité manquante au gel : ${entry.slug}.`);
        const previousRank = previousRanks.get(entry.slug) ?? null;
        const rankChange = previousRank === null ? 0 : previousRank - entry.rank;
        return {
          id: randomUUID(),
          editionId: id,
          entityId,
          rank: entry.rank,
          score: entry.score,
          previousRank,
          rankChange,
          status: (previousRank === null
            ? 'new'
            : rankChange > 0
              ? 'rising'
              : rankChange < 0
                ? 'falling'
                : 'stable') satisfies 'new' | 'rising' | 'falling' | 'stable',
          metadata: {
            identity: entry.identity,
            sources: entry.sources,
            sourceObservedAt: entry.sourceObservedAt,
            scoringVersion,
          },
        };
      }),
    );
    written++;
  });
  return written;
}

export async function readPublishedEntitySources(slugs: readonly string[]) {
  if (!slugs.length) return [];
  return getDb()
    .select({ entity: chartEntities, source: chartEntitySources })
    .from(chartEntities)
    .leftJoin(chartEntitySources, eq(chartEntitySources.entityId, chartEntities.id))
    .where(inArray(chartEntities.slug, [...slugs]));
}

export async function externalObservationsForEntity(entityId: string, date: string) {
  return getDb()
    .select({ source: chartEntitySources, snapshot: chartSourceSnapshots })
    .from(chartEntitySources)
    .innerJoin(chartSourceSnapshots, eq(chartSourceSnapshots.entitySourceId, chartEntitySources.id))
    .where(
      and(eq(chartEntitySources.entityId, entityId), lte(chartSourceSnapshots.observedOn, date)),
    )
    .orderBy(chartSourceSnapshots.observedOn);
}
