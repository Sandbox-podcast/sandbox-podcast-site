import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { editableContentSchema, type EditableContent } from '../domain/admin-content.ts';
import { hasDatabaseConfiguration } from '../db/client.ts';
import type { Content } from './load.ts';
import { setEditorialOverride } from './load.ts';
import { loadContent } from './load.ts';
import { ContentConflictError } from './admin-content-conflict.ts';
import { validateEditorialContent } from './validate-editorial-content.ts';
import {
  postgresGetAdminContent,
  postgresReadPublished,
  postgresSaveAdminContent,
} from './admin-persistence-postgres.ts';
import { isNextProductionBuild } from './next-build.ts';

export { ContentConflictError };

const LOCAL_STORE_PATH = join(process.cwd(), '.site-content.local.json');
const CACHE_TTL_MS = 5_000;

interface LocalStore {
  published?: EditableContent;
  draft?: EditableContent;
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

export type AdminStorageMode = 'local' | 'postgres' | 'unavailable';

export const adminStorageMode = (): AdminStorageMode => {
  if (process.env.NODE_ENV !== 'production') return 'local';
  return hasDatabaseConfiguration() ? 'postgres' : 'unavailable';
};

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

async function readPublishedLocal(): Promise<EditableContent | undefined> {
  const local = await readLocalStore();
  return local.published;
}

function isMissingEditorialTable(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof current !== 'object' || current === null) return false;
    const candidate = current as { code?: unknown; cause?: unknown };
    if (candidate.code === '42P01') return true;
    current = candidate.cause;
  }
  return false;
}

async function readPublishedForSite(): Promise<EditableContent | undefined> {
  if (isNextProductionBuild()) return undefined;
  if (process.env.NODE_ENV !== 'production') {
    return readPublishedLocal();
  }
  if (adminStorageMode() === 'postgres') {
    try {
      return await postgresReadPublished();
    } catch (error) {
      // Une base peut être liée avant sa première migration.
      if (isMissingEditorialTable(error)) return undefined;
      throw error;
    }
  }
  return undefined;
}

/** Charge la version publiée avant le rendu ISR ; cache court pour limiter les requêtes. */
export async function preparePublishedEditorialContent(): Promise<void> {
  if (Date.now() - publishedLoadedAt < CACHE_TTL_MS) {
    setEditorialOverride(publishedCache);
    return;
  }
  publishedLoad ??= readPublishedForSite()
    .then((content) => {
      publishedCache = content;
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
  if (adminStorageMode() === 'postgres') {
    return postgresGetAdminContent();
  }

  if (adminStorageMode() === 'unavailable') {
    await preparePublishedEditorialContent();
    return {
      content: editableFromContent(loadContent()),
      draftEtag: null,
      hasDraft: false,
    };
  }

  await preparePublishedEditorialContent();
  const local = await readLocalStore();
  const published = local.published;
  const draft = local.draft;
  const content = draft ?? published ?? editableFromContent(loadContent());
  return { content, draftEtag: null, hasDraft: Boolean(draft) };
}

export async function saveAdminContent(
  value: unknown,
  action: 'draft' | 'publish',
  expectedDraftEtag: string | null,
): Promise<{ draftEtag: string | null }> {
  if (adminStorageMode() === 'unavailable') {
    throw new Error('Le stockage Postgres n’est pas encore configuré sur ce projet.');
  }

  if (adminStorageMode() === 'postgres') {
    const saved = await postgresSaveAdminContent(value, action, expectedDraftEtag);
    if (action === 'publish') {
      const content = editableContentSchema.parse(value);
      publishedCache = content;
      publishedLoadedAt = Date.now();
      setEditorialOverride(content);
    }
    return saved;
  }

  await preparePublishedEditorialContent();
  const content = validateEditorialContent(value, editableFromContent(loadContent()));

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
