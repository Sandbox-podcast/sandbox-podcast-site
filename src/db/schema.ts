import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

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
