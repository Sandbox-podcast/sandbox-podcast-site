import { sql } from 'drizzle-orm';
import {
  integer,
  boolean,
  customType,
  date,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { GithubChartConfig, TrackingStatus } from '../domain/github-charts.ts';
import type {
  RankingCollection,
  RankingCollectionLocalization,
  RankingEntityLocalization,
} from '../domain/ranking-catalog.ts';
import type { SiteContentLocalization } from '../domain/site-localization.ts';
import type { ChartEdition, Snapshot } from '../domain/schema.ts';
import type { GithubBurst } from '../domain/github-bursts.ts';

/** Couche éditoriale : brouillon admin ou version servie au site. */
export type EditorialLayer = 'draft' | 'published';

/**
 * Une ligne par entité éditoriale (site, host, story, …) et par couche.
 * Le payload JSON respecte les schémas Zod du domaine.
 */
export const editorialRecords = pgTable(
  'editorial_records',
  {
    collection: text('collection').notNull(),
    entityKey: text('entity_key').notNull(),
    layer: text('layer').notNull().$type<EditorialLayer>(),
    ordinal: integer('ordinal').notNull().default(0),
    payload: jsonb('payload').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.collection, table.entityKey, table.layer] })],
);

/** Métadonnées du brouillon (ETag pour détection de conflit). */
export const editorialDraftMeta = pgTable('editorial_draft_meta', {
  id: smallint('id').primaryKey().default(1),
  etag: text('etag').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

const imageBytes = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

/** Images éditoriales immuables, adressées par leur empreinte SHA-256. */
export const episodeThumbnails = pgTable('episode_thumbnails', {
  sha256: text('sha256').primaryKey(),
  image: imageBytes('image').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

/** Portraits carrés des animateurs, adressés par leur empreinte SHA-256. */
export const hostPhotos = pgTable('host_photos', {
  sha256: text('sha256').primaryKey(),
  image: imageBytes('image').notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

/** Comptes du backoffice, migrés depuis SITE_ADMIN_USERS sans mot de passe en clair. */
export const adminUsers = pgTable('admin_users', {
  id: text('id').primaryKey(),
  login: text('login').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  active: smallint('active').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});

export const chartEntities = pgTable('chart_entities', {
  id: text('id').primaryKey(),
  type: text('type').notNull().default('github_project'),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  organization: text('organization'),
  description: text('description'),
  category: text('category').notNull().default('Other'),
  license: text('license'),
  openWeights: boolean('open_weights'),
  sourceUrl: text('source_url').notNull(),
  websiteUrl: text('website_url'),
  active: boolean('active').notNull().default(true),
  featured: boolean('featured').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
/** Identité vérifiée ou exacte d'une entité chez chaque fournisseur de données. */
export const chartEntitySources = pgTable(
  'chart_entity_sources',
  {
    id: text('id').primaryKey(),
    entityId: text('entity_id')
      .notNull()
      .references(() => chartEntities.id),
    provider: text('provider').notNull(),
    externalId: text('external_id').notNull(),
    url: text('source_url').notNull(),
    label: text('source_label').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('chart_entity_source_identity_idx').on(
      table.entityId,
      table.provider,
      table.externalId,
    ),
    index('chart_entity_source_provider_idx').on(table.provider, table.externalId),
  ],
);
/** Relevés sourcés et immuables pour Skills, modèles, benchmarks et futures sources. */
export const chartSourceSnapshots = pgTable(
  'chart_source_snapshots',
  {
    id: text('id').primaryKey(),
    entitySourceId: text('entity_source_id')
      .notNull()
      .references(() => chartEntitySources.id),
    observedOn: date('observed_on', { mode: 'string' }).notNull(),
    refreshSlotId: text('refresh_slot_id').notNull(),
    collectedAt: timestamp('collected_at', { withTimezone: true, mode: 'string' }).notNull(),
    payload: jsonb('metrics').notNull().$type<Record<string, unknown>>(),
  },
  (table) => [
    uniqueIndex('chart_source_snapshot_slot_idx').on(table.entitySourceId, table.refreshSlotId),
    index('chart_source_snapshot_observed_idx').on(table.observedOn),
  ],
);
export const githubProjects = pgTable(
  'github_projects',
  {
    id: text('id').primaryKey(),
    entityId: text('entity_id')
      .notNull()
      .unique()
      .references(() => chartEntities.id),
    githubId: doublePrecision('github_id').notNull().unique(),
    owner: text('owner').notNull(),
    repo: text('repo').notNull(),
    fullName: text('full_name').notNull().unique(),
    description: text('description'),
    homepage: text('homepage'),
    language: text('primary_language'),
    githubCreatedAt: timestamp('github_created_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    githubUpdatedAt: timestamp('github_updated_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    pushedAt: timestamp('github_pushed_at', { withTimezone: true, mode: 'string' }),
    defaultBranch: text('default_branch').notNull(),
    archived: boolean('archived').notNull(),
    fork: boolean('fork').notNull(),
    disabled: boolean('disabled').notNull(),
    discoveredAt: timestamp('discovered_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true, mode: 'string' }),
    status: text('tracking_status').notNull().$type<TrackingStatus>().default('candidate'),
    manualStatus: text('manual_tracking_status').$type<TrackingStatus>(),
    lastError: text('last_error'),
  },
  (table) => [
    index('github_projects_status_idx').on(table.status),
    index('github_projects_sync_idx').on(table.lastSyncedAt),
  ],
);
export const githubDailySnapshots = pgTable(
  'github_daily_snapshots',
  {
    id: text('id').primaryKey(),
    projectId: text('github_project_id')
      .notNull()
      .references(() => githubProjects.id),
    date: date('snapshot_date', { mode: 'string' }).notNull(),
    refreshSlotId: text('refresh_slot_id').notNull(),
    stars: integer('stars').notNull(),
    forks: integer('forks').notNull(),
    watchers: integer('watchers'),
    openIssues: integer('open_issues').notNull(),
    contributors: integer('contributors_count'),
    commits: integer('commit_activity'),
    releases: integer('releases_count'),
    pushedAt: timestamp('github_pushed_at', { withTimezone: true, mode: 'string' }),
    collectedAt: timestamp('collected_at', { withTimezone: true, mode: 'string' }).notNull(),
    source: text('source').notNull().default('github'),
  },
  (table) => [
    uniqueIndex('github_daily_project_slot_idx').on(table.projectId, table.refreshSlotId),
    index('github_daily_date_idx').on(table.date),
  ],
);
export const githubStarObservations = pgTable(
  'github_star_observations',
  {
    id: text('id').primaryKey(),
    projectId: text('github_project_id')
      .notNull()
      .references(() => githubProjects.id),
    observedAt: timestamp('observed_at', { withTimezone: true, mode: 'string' }).notNull(),
    stars: integer('stars').notNull(),
  },
  (table) => [
    uniqueIndex('github_star_observations_project_time_idx').on(table.projectId, table.observedAt),
    index('github_star_observations_time_idx').on(table.observedAt),
  ],
);

export const githubBurstEvents = pgTable(
  'github_burst_events',
  {
    id: text('id').primaryKey(),
    projectId: text('github_project_id')
      .notNull()
      .references(() => githubProjects.id),
    observedAt: timestamp('observed_at', { withTimezone: true, mode: 'string' }).notNull(),
    windowHours: integer('window_hours').notNull(),
    evidence: jsonb('evidence').notNull().$type<GithubBurst>(),
  },
  (table) => [
    uniqueIndex('github_burst_events_project_window_time_idx').on(
      table.projectId,
      table.windowHours,
      table.observedAt,
    ),
    index('github_burst_events_time_idx').on(table.observedAt),
  ],
);

export const githubTrendingObservations = pgTable('github_trending_observations', {
  id: text('id').primaryKey(),
  observedAt: timestamp('observed_at', { withTimezone: true, mode: 'string' }).notNull().unique(),
  repositories: jsonb('repositories').notNull().$type<string[]>(),
  sha256: text('sha256').notNull(),
});

export const weeklyChartEditions = pgTable(
  'weekly_chart_editions',
  {
    id: text('id').primaryKey(),
    chart: text('chart_type')
      .notNull()
      .references(() => rankingCollections.key),
    week: text('week').notNull(),
    scoringVersion: text('scoring_version').notNull(),
    config: jsonb('config').notNull().$type<GithubChartConfig | Record<string, unknown>>(),
    payload: jsonb('payload').notNull().$type<Snapshot>(),
    frozenAt: timestamp('frozen_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    uniqueIndex('weekly_chart_week_idx').on(table.chart, table.week),
    index('weekly_chart_published_idx').on(table.publishedAt),
  ],
);
export const weeklyRankings = pgTable(
  'weekly_rankings',
  {
    id: text('id').primaryKey(),
    editionId: text('edition_id')
      .notNull()
      .references(() => weeklyChartEditions.id),
    entityId: text('entity_id')
      .notNull()
      .references(() => chartEntities.id),
    rank: integer('rank').notNull(),
    previousRank: integer('previous_rank'),
    rankChange: integer('rank_change').notNull(),
    score: doublePrecision('score').notNull(),
    status: text('status').notNull(),
    metadata: jsonb('metadata_json').notNull(),
  },
  (table) => [
    uniqueIndex('weekly_rank_entity_idx').on(table.editionId, table.entityId),
    uniqueIndex('weekly_rank_position_idx').on(table.editionId, table.rank),
    index('weekly_rank_entity_history_idx').on(table.entityId),
  ],
);
/** Attributions historiques, immuables. Un retrait ajoute une trace séparée. */
export const badgeAwards = pgTable(
  'badge_awards',
  {
    id: text('id').primaryKey(),
    awardType: text('award_type').notNull(),
    week: text('week'),
    extendedPeriod: text('extended_period'),
    period: text('period')
      .notNull()
      .generatedAlwaysAs(sql`COALESCE(week, extended_period)`),
    periodKind: text('period_kind').notNull().default('week'),
    scope: text('scope').notNull().default(''),
    chart: text('chart_type')
      .notNull()
      .default('rising')
      .references(() => rankingCollections.key),
    entityId: text('entity_id')
      .notNull()
      .references(() => chartEntities.id),
    githubId: doublePrecision('github_id'),
    projectName: text('project_name').notNull(),
    editionId: text('edition_id')
      .notNull()
      .references(() => weeklyChartEditions.id),
    rank: integer('rank').notNull(),
    score: doublePrecision('score').notNull(),
    ruleVersion: text('rule_version').notNull(),
    evidence: jsonb('evidence').notNull().$type<Record<string, unknown>>(),
    evidenceHash: text('evidence_hash').notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('badge_awards_type_week_idx').on(table.awardType, table.week),
    uniqueIndex('badge_awards_type_period_scope_idx').on(
      table.awardType,
      table.period,
      table.scope,
    ),
    index('badge_awards_project_idx').on(table.githubId),
    index('badge_awards_entity_idx').on(table.entityId),
    index('badge_awards_history_idx').on(table.assignedAt, table.id),
  ],
);
export const badgeAwardWithdrawals = pgTable('badge_award_withdrawals', {
  awardId: text('award_id')
    .primaryKey()
    .references(() => badgeAwards.id),
  reason: text('reason').notNull(),
  actor: text('actor').notNull(),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});
export const chartsJobRuns = pgTable(
  'charts_job_runs',
  {
    id: text('id').primaryKey(),
    kind: text('job_type').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'string' }),
    status: text('status').notNull(),
    processed: integer('processed').notNull().default(0),
    succeeded: integer('succeeded').notNull().default(0),
    failed: integer('failed').notNull().default(0),
    details: jsonb('error_details').notNull().default([]),
  },
  (table) => [
    index('charts_job_started_idx').on(table.startedAt),
    uniqueIndex('charts_job_running_idx')
      .on(table.kind)
      .where(sql`${table.status} = 'running'`),
  ],
);
export const chartsConfiguration = pgTable('charts_configuration', {
  id: smallint('id').primaryKey().default(1),
  payload: jsonb('payload').notNull().$type<GithubChartConfig>(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
});
export const chartsEditorial = pgTable(
  'charts_editorial',
  {
    editionId: text('edition_id')
      .notNull()
      .references(() => weeklyChartEditions.id),
    layer: text('layer').notNull().$type<EditorialLayer>(),
    payload: jsonb('payload').notNull().$type<ChartEdition>(),
    etag: text('etag').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.editionId, table.layer] })],
);

/** Intent SEO stable : une collection peut porter plusieurs traductions, sans dupliquer ses données. */
export const rankingCollections = pgTable(
  'ranking_collections',
  {
    key: text('collection_key').primaryKey(),
    sourceChart: text('source_chart').notNull(),
    entityKind: text('entity_kind').notNull().$type<RankingCollection['entityKind']>(),
    intent: text('intent').notNull().$type<RankingCollection['intent']>(),
    method: text('method').notNull().$type<RankingCollection['method']>(),
    target: jsonb('target').notNull().$type<RankingCollection['target']>().default({}),
    cadence: text('cadence').notNull().$type<RankingCollection['cadence']>().default('weekly'),
    minimumCandidates: integer('minimum_candidates').notNull().default(10),
    minimumPublicEditions: integer('minimum_public_editions').notNull().default(1),
    active: boolean('active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('ranking_collections_active_idx').on(table.active)],
);

export const rankingCollectionLocalizations = pgTable(
  'ranking_collection_localizations',
  {
    collectionKey: text('collection_key')
      .notNull()
      .references(() => rankingCollections.key),
    locale: text('locale').notNull(),
    slug: text('localized_slug').notNull(),
    path: text('localized_path').notNull(),
    title: text('title').notNull(),
    metaTitle: text('meta_title').notNull(),
    metaDescription: text('meta_description').notNull(),
    heading: text('heading').notNull(),
    introduction: text('introduction').notNull(),
    methodologySummary: text('methodology_summary').notNull(),
    state: text('review_state').notNull().$type<RankingCollectionLocalization['state']>(),
    sourceLocale: text('source_locale').notNull(),
    sourceHash: text('source_hash').notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'string' }),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionKey, table.locale] }),
    uniqueIndex('ranking_localized_path_idx').on(table.path),
    uniqueIndex('ranking_localized_slug_idx').on(table.locale, table.slug),
    index('ranking_localization_state_idx').on(table.state, table.publishedAt),
  ],
);

export const rankingEntityLocalizations = pgTable(
  'ranking_entity_localizations',
  {
    entityId: text('entity_id')
      .notNull()
      .references(() => chartEntities.id),
    locale: text('locale').notNull(),
    displayName: text('display_name').notNull(),
    tagline: text('tagline').notNull(),
    description: text('description').notNull(),
    limitations: text('limitations').notNull(),
    state: text('review_state').notNull().$type<RankingEntityLocalization['state']>(),
    sourceLocale: text('source_locale').notNull(),
    sourceHash: text('source_hash').notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'string' }),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.entityId, table.locale] }),
    index('ranking_entity_localization_state_idx').on(table.locale, table.state),
  ],
);

/** Un fait d'entité n'influence un classement éditorial que s'il porte une preuve vérifiée. */
export const rankingEvidence = pgTable(
  'ranking_evidence',
  {
    id: text('id').primaryKey(),
    entityId: text('entity_id')
      .notNull()
      .references(() => chartEntities.id),
    collectionKey: text('collection_key').references(() => rankingCollections.key),
    factKey: text('fact_key').notNull(),
    value: jsonb('fact_value').notNull(),
    unit: text('unit'),
    sourceKind: text('source_kind').notNull(),
    sourceUrl: text('source_url').notNull(),
    observedAt: timestamp('observed_at', { withTimezone: true, mode: 'string' }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'string' }),
    reviewer: text('reviewer'),
    state: text('review_state').notNull().default('unreviewed'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('ranking_evidence_entity_idx').on(table.entityId, table.factKey),
    index('ranking_evidence_collection_idx').on(table.collectionKey, table.factKey),
  ],
);

/** Textes localisés pour les pages média et les pages éditoriales hors classements. */
export const siteContentLocalizations = pgTable(
  'site_content_localizations',
  {
    contentKind: text('content_kind').notNull().$type<SiteContentLocalization['contentKind']>(),
    contentKey: text('content_key').notNull(),
    locale: text('locale').notNull(),
    path: text('localized_path').notNull(),
    title: text('title').notNull(),
    metaTitle: text('meta_title').notNull(),
    metaDescription: text('meta_description').notNull(),
    heading: text('heading').notNull(),
    introduction: text('introduction').notNull(),
    sections: jsonb('sections').notNull().$type<SiteContentLocalization['sections']>(),
    chapters: jsonb('chapters').notNull().$type<SiteContentLocalization['chapters']>().default([]),
    state: text('review_state').notNull().$type<SiteContentLocalization['state']>(),
    sourceLocale: text('source_locale').notNull(),
    sourceHash: text('source_hash').notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'string' }),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.contentKind, table.contentKey, table.locale] }),
    uniqueIndex('site_localization_path_idx').on(table.path),
    index('site_localization_state_locale_idx').on(table.state, table.locale),
    index('site_localization_source_idx').on(table.contentKind, table.contentKey, table.locale),
  ],
);

/** Traductions produites dans le harnais puis importées manuellement par un administrateur. */
export const siteTranslationMessages = pgTable(
  'site_translation_messages',
  {
    locale: text('locale').notNull(),
    sourceHash: text('source_hash').notNull(),
    source: text('source').notNull(),
    translation: text('translation').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.locale, table.sourceHash] })],
);
