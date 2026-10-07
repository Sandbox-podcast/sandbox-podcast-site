import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import {
  assertNoEditorialRemovals,
  editableContentSchema,
  type EditableContent,
} from '../domain/admin-content.ts';
import { editorialDraftMeta, editorialRecords, type EditorialLayer } from '../db/schema.ts';
import { getDb } from '../db/client.ts';
import type { Content } from './load.ts';
import { loadContent } from './load.ts';
import { validateContent } from './validate.ts';
import {
  buildEditableContent,
  flattenEditableContent,
  type EditorialRecordRow,
} from './editorial-records.ts';
import { ContentConflictError } from './admin-content-conflict.ts';

function editableFromContent(content: Content): EditableContent {
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

function validateEditorialContent(value: unknown): EditableContent {
  const parsed = editableContentSchema.parse(value);
  const base = loadContent();
  assertNoEditorialRemovals(editableFromContent(base), parsed);
  const candidate: Content = { ...parsed, snapshots: base.snapshots };
  const errors = validateContent(candidate).filter((issue) => issue.level === 'error');
  if (errors.length > 0) {
    throw new Error(errors.map((issue) => `${issue.where} : ${issue.message}`).join('\n'));
  }
  return parsed;
}

async function readLayer(layer: EditorialLayer): Promise<EditorialRecordRow[] | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      collection: editorialRecords.collection,
      entityKey: editorialRecords.entityKey,
      ordinal: editorialRecords.ordinal,
      payload: editorialRecords.payload,
    })
    .from(editorialRecords)
    .where(eq(editorialRecords.layer, layer));
  if (rows.length === 0) return undefined;
  return rows.map((row) => ({
    collection: row.collection as EditorialRecordRow['collection'],
    entityKey: row.entityKey,
    ordinal: row.ordinal,
    payload: row.payload,
  }));
}

async function readDraftEtag(): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ etag: editorialDraftMeta.etag })
    .from(editorialDraftMeta)
    .where(eq(editorialDraftMeta.id, 1))
    .limit(1);
  return rows[0]?.etag ?? null;
}

async function layerHasRows(layer: EditorialLayer): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ n: sql<number>`1` })
    .from(editorialRecords)
    .where(eq(editorialRecords.layer, layer))
    .limit(1);
  return rows.length > 0;
}

async function replaceLayer(layer: EditorialLayer, content: EditableContent): Promise<void> {
  const db = getDb();
  const rows = flattenEditableContent(content);
  await db.transaction(async (tx) => {
    await tx.delete(editorialRecords).where(eq(editorialRecords.layer, layer));
    if (rows.length > 0) {
      await tx.insert(editorialRecords).values(
        rows.map((row) => ({
          collection: row.collection,
          entityKey: row.entityKey,
          layer,
          ordinal: row.ordinal,
          payload: row.payload,
        })),
      );
    }
  });
}

async function copyDraftToPublished(): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(editorialRecords).where(eq(editorialRecords.layer, 'published'));
    await tx.execute(sql`
      INSERT INTO editorial_records (collection, entity_key, layer, ordinal, payload, updated_at)
      SELECT collection, entity_key, 'published', ordinal, payload, NOW()
      FROM editorial_records
      WHERE layer = 'draft'
    `);
  });
}

export async function postgresReadPublished(): Promise<EditableContent | undefined> {
  const rows = await readLayer('published');
  return rows ? buildEditableContent(rows) : undefined;
}

export async function postgresGetAdminContent(): Promise<{
  content: EditableContent;
  draftEtag: string | null;
  hasDraft: boolean;
}> {
  const published = await readLayer('published');
  const draft = await readLayer('draft');
  const draftEtag = await readDraftEtag();
  const hasDraft = await layerHasRows('draft');
  const publishedContent = published ? buildEditableContent(published) : undefined;
  const draftContent = draft ? buildEditableContent(draft) : undefined;
  const content = draftContent ?? publishedContent ?? editableFromContent(loadContent());
  return {
    content,
    draftEtag: hasDraft ? draftEtag : null,
    hasDraft,
  };
}

export async function postgresSaveAdminContent(
  value: unknown,
  action: 'draft' | 'publish',
  expectedDraftEtag: string | null,
): Promise<{ draftEtag: string | null }> {
  const content = validateEditorialContent(value);
  const db = getDb();
  const hasDraft = await layerHasRows('draft');
  const currentEtag = hasDraft ? await readDraftEtag() : null;
  if ((currentEtag ?? null) !== expectedDraftEtag) {
    throw new ContentConflictError();
  }

  const nextEtag = randomUUID();
  await db.transaction(async (tx) => {
    const rows = flattenEditableContent(content);
    await tx.delete(editorialRecords).where(eq(editorialRecords.layer, 'draft'));
    if (rows.length > 0) {
      await tx.insert(editorialRecords).values(
        rows.map((row) => ({
          collection: row.collection,
          entityKey: row.entityKey,
          layer: 'draft' as const,
          ordinal: row.ordinal,
          payload: row.payload,
        })),
      );
    }
    await tx
      .insert(editorialDraftMeta)
      .values({ id: 1, etag: nextEtag })
      .onConflictDoUpdate({
        target: editorialDraftMeta.id,
        set: { etag: nextEtag, updatedAt: sql`NOW()` },
      });
  });

  if (action === 'publish') {
    await copyDraftToPublished();
  }

  return { draftEtag: nextEtag };
}

/** Importe une version publiée (seed / migration depuis JSON). */
export async function postgresUpsertPublished(content: EditableContent): Promise<void> {
  const parsed = editableContentSchema.parse(content);
  await replaceLayer('published', parsed);
  const db = getDb();
  const hasDraft = await layerHasRows('draft');
  if (!hasDraft) {
    await db.insert(editorialDraftMeta).values({ id: 1, etag: randomUUID() }).onConflictDoNothing();
  }
}

/** Vide les tables éditoriales (tests). */
export async function postgresClearEditorial(): Promise<void> {
  const db = getDb();
  await db.delete(editorialRecords);
  await db.delete(editorialDraftMeta);
}
