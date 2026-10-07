import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { editableContentSchema, type EditableContent } from '../domain/admin-content.ts';
import { editorialDraftMeta, editorialRecords, type EditorialLayer } from '../db/schema.ts';
import { getDb } from '../db/client.ts';
import type { Content } from './load.ts';
import { loadContent } from './load.ts';
import {
  buildEditableContent,
  flattenEditableContent,
  type EditorialRecordRow,
} from './editorial-records.ts';
import { ContentConflictError } from './admin-content-conflict.ts';
import { validateEditorialContent } from './validate-editorial-content.ts';

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

async function editorialRemovalBaseline(): Promise<EditableContent> {
  const published = await postgresReadPublished();
  return published ?? editableFromContent(loadContent());
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

function recordValues(
  rows: EditorialRecordRow[],
  layer: EditorialLayer,
): (typeof editorialRecords.$inferInsert)[] {
  return rows.map((row) => ({
    collection: row.collection,
    entityKey: row.entityKey,
    layer,
    ordinal: row.ordinal,
    payload: row.payload,
  }));
}

async function replaceLayer(layer: EditorialLayer, content: EditableContent): Promise<void> {
  const db = getDb();
  const rows = flattenEditableContent(content);
  await db.transaction(async (tx) => {
    await tx.delete(editorialRecords).where(eq(editorialRecords.layer, layer));
    if (rows.length > 0) {
      await tx.insert(editorialRecords).values(recordValues(rows, layer));
    }
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

async function assertDraftEtagInTransaction(
  tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0],
  expectedDraftEtag: string | null,
  nextEtag: string,
): Promise<void> {
  const draftRows = await tx
    .select({ n: sql<number>`1` })
    .from(editorialRecords)
    .where(eq(editorialRecords.layer, 'draft'))
    .limit(1);
  const hasDraft = draftRows.length > 0;

  if (hasDraft) {
    if (expectedDraftEtag === null) {
      throw new ContentConflictError();
    }
    const updated = await tx
      .update(editorialDraftMeta)
      .set({ etag: nextEtag, updatedAt: sql`NOW()` })
      .where(and(eq(editorialDraftMeta.id, 1), eq(editorialDraftMeta.etag, expectedDraftEtag)))
      .returning({ id: editorialDraftMeta.id });
    if (updated.length === 0) {
      throw new ContentConflictError();
    }
    return;
  }

  if (expectedDraftEtag !== null) {
    throw new ContentConflictError();
  }

  await tx
    .insert(editorialDraftMeta)
    .values({ id: 1, etag: nextEtag })
    .onConflictDoUpdate({
      target: editorialDraftMeta.id,
      set: { etag: nextEtag, updatedAt: sql`NOW()` },
    });
}

export async function postgresSaveAdminContent(
  value: unknown,
  action: 'draft' | 'publish',
  expectedDraftEtag: string | null,
): Promise<{ draftEtag: string | null }> {
  const baseline = await editorialRemovalBaseline();
  const content = validateEditorialContent(value, baseline);
  const db = getDb();
  const nextEtag = randomUUID();
  const rows = flattenEditableContent(content);

  await db.transaction(async (tx) => {
    await assertDraftEtagInTransaction(tx, expectedDraftEtag, nextEtag);

    await tx.delete(editorialRecords).where(eq(editorialRecords.layer, 'draft'));
    if (rows.length > 0) {
      await tx.insert(editorialRecords).values(recordValues(rows, 'draft'));
    }

    if (action === 'publish') {
      await tx.delete(editorialRecords).where(eq(editorialRecords.layer, 'published'));
      await tx.execute(sql`
        INSERT INTO editorial_records (collection, entity_key, layer, ordinal, payload, updated_at)
        SELECT collection, entity_key, 'published', ordinal, payload, NOW()
        FROM editorial_records
        WHERE layer = 'draft'
      `);
    }
  });

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
