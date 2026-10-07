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

/** Comptes du backoffice (connexion par identifiant + mot de passe hashé). */
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
