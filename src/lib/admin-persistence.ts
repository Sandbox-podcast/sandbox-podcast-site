import { get, put } from '@vercel/blob';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { adminSecretsReady } from './admin-auth.ts';
import {
  assertNoEditorialRemovals,
  editableContentSchema,
  type EditableContent,
} from '../domain/admin-content.ts';
import type { Content } from './load.ts';
import { setEditorialOverride } from './load.ts';
import { loadContent } from './load.ts';
import { validateContent } from './validate.ts';

const PUBLISHED_PATH = 'sandbox-podcast/content/published.json';
const DRAFT_PATH = 'sandbox-podcast/content/draft.json';
const LOCAL_STORE_PATH = join(process.cwd(), '.site-content.local.json');
const CACHE_TTL_MS = 5_000;
const MAX_CONTENT_BYTES = 1_500_000;

interface StoredContent {
  content: EditableContent;
  etag: string | null;
}

interface LocalStore {
  published?: EditableContent;
  draft?: EditableContent;
}

export class ContentConflictError extends Error {
  constructor() {
    super('Le brouillon a changé depuis son ouverture. Rechargez-le avant de continuer.');
    this.name = 'ContentConflictError';
  }
}

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

let publishedCache: EditableContent | undefined;
let publishedLoadedAt = 0;
let publishedLoad: Promise<EditableContent | undefined> | undefined;

export type AdminStorageMode = 'local' | 'vercel-blob' | 'unavailable';

export const adminStorageMode = (): AdminStorageMode => {
  if (process.env.NODE_ENV !== 'production') return 'local';
  return process.env['BLOB_READ_WRITE_TOKEN'] ? 'vercel-blob' : 'unavailable';
};

export const authConfigured = (): boolean => adminSecretsReady();

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

async function readBlob(pathname: string): Promise<StoredContent | undefined> {
  if (!process.env['BLOB_READ_WRITE_TOKEN']) return undefined;
  const result = await get(pathname, { access: 'private', useCache: false });
  if (result?.statusCode !== 200) return undefined;
  const raw = await new Response(result.stream).text();
  const content = editableContentSchema.parse(JSON.parse(raw) as unknown);
  return { content, etag: result.blob.etag };
}

async function readLocalStore(): Promise<LocalStore> {
  try {
    const raw = await readFile(LOCAL_STORE_PATH, 'utf8');
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== 'object' || value === null) return {};
    const record = value as Record<string, unknown>;
    return {
      ...(record['published']
        ? { published: editableContentSchema.parse(record['published']) }
        : {}),
      ...(record['draft'] ? { draft: editableContentSchema.parse(record['draft']) } : {}),
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return {};
    throw error;
  }
}

async function writeLocalStore(store: LocalStore): Promise<void> {
  await writeFile(LOCAL_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

async function readPublished(): Promise<StoredContent | undefined> {
  if (process.env.NODE_ENV !== 'production') {
    const local = await readLocalStore();
    return local.published ? { content: local.published, etag: null } : undefined;
  }
  return readBlob(PUBLISHED_PATH);
}

async function writeBlob(
  pathname: string,
  content: EditableContent,
  existingEtag: string | null,
): Promise<StoredContent> {
  const serialized = JSON.stringify(content);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTENT_BYTES) {
    throw new Error('Le contenu dépasse la limite de 1,5 Mo.');
  }
  const saved = await put(pathname, serialized, {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
    ...(existingEtag ? { ifMatch: existingEtag } : {}),
  });
  return { content, etag: saved.etag };
}

/** Charge la version publiée avant le rendu ISR; le cache court évite un appel Blob par page. */
export async function preparePublishedEditorialContent(): Promise<void> {
  if (Date.now() - publishedLoadedAt < CACHE_TTL_MS) {
    setEditorialOverride(publishedCache);
    return;
  }
  publishedLoad ??= readPublished()
    .then((stored) => {
      publishedCache = stored?.content;
      publishedLoadedAt = Date.now();
      setEditorialOverride(publishedCache);
      return publishedCache;
    })
    .finally(() => {
      publishedLoad = undefined;
    });
  await publishedLoad;
}

export async function getAdminContent(): Promise<{
  content: EditableContent;
  draftEtag: string | null;
  hasDraft: boolean;
}> {
  await preparePublishedEditorialContent();
  const published = await readPublished();
  let draft: StoredContent | undefined;
  if (process.env.NODE_ENV !== 'production') {
    const local = await readLocalStore();
    draft = local.draft ? { content: local.draft, etag: null } : undefined;
  } else {
    draft = await readBlob(DRAFT_PATH);
  }
  const content = draft?.content ?? published?.content ?? editableFromContent(loadContent());
  return { content, draftEtag: draft?.etag ?? null, hasDraft: Boolean(draft) };
}

export async function saveAdminContent(
  value: unknown,
  action: 'draft' | 'publish',
  expectedDraftEtag: string | null,
): Promise<{ draftEtag: string | null }> {
  await preparePublishedEditorialContent();
  const content = validateEditorialContent(value);

  if (process.env.NODE_ENV !== 'production') {
    const store = await readLocalStore();
    if (expectedDraftEtag !== null) throw new ContentConflictError();
    const next: LocalStore = { ...store, draft: content };
    if (action === 'publish') next.published = content;
    await writeLocalStore(next);
    if (action === 'publish') {
      publishedCache = content;
      publishedLoadedAt = Date.now();
      setEditorialOverride(content);
    }
    return { draftEtag: null };
  }

  if (!process.env['BLOB_READ_WRITE_TOKEN']) {
    throw new Error('Le stockage Vercel Blob n’est pas encore relié au projet.');
  }

  const currentDraft = await readBlob(DRAFT_PATH);
  if ((currentDraft?.etag ?? null) !== expectedDraftEtag) throw new ContentConflictError();
  const nextDraft = await writeBlob(DRAFT_PATH, content, currentDraft?.etag ?? null);
  if (action === 'publish') {
    const currentPublished = await readBlob(PUBLISHED_PATH);
    await writeBlob(PUBLISHED_PATH, content, currentPublished?.etag ?? null);
    publishedCache = content;
    publishedLoadedAt = Date.now();
    setEditorialOverride(content);
  }
  return { draftEtag: nextDraft.etag };
}
