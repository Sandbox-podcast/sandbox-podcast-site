import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { z } from 'zod';
import { newsCategorySchema, newsItemSchema, type NewsItem } from '../domain/news-preview.ts';
import {
  newsEditorialForItem,
  newsEditorialSourceHash,
  NEWS_EDITORIAL,
  type NewsEditorialRecord,
} from './news-editorial.ts';
import {
  newsEditorialTranslationsComplete,
  translateNewsEditorialItems,
  type NewsTranslationBatch,
} from './news-translation.ts';

const applicationRoot = fileURLToPath(new URL('../../', import.meta.url));
const workerPath = join(applicationRoot, 'scripts', 'news-summarize.py');
const localDirectory = join(applicationRoot, '.local');
const modelPath = join(localDirectory, 'news-summary-model', 'Qwen3-1.7B-Q4_K_M.gguf');
const bundledPython = join(
  localDirectory,
  'news-summarizer-venv',
  process.platform === 'win32' ? 'Scripts' : 'bin',
  process.platform === 'win32' ? 'python.exe' : 'python',
);

const summarySchema = z.object({
  title: z.string().trim().min(1).max(200),
  sentences: z.tuple([
    z.string().trim().min(1).max(600),
    z.string().trim().min(1).max(600),
    z.string().trim().min(1).max(600),
  ]),
  category: newsCategorySchema,
  evidence: z.tuple([
    z.string().trim().min(20).max(320),
    z.string().trim().min(20).max(320),
    z.string().trim().min(20).max(320),
  ]),
});
const workerResponseSchema = z.object({
  results: z.array(z.object({ url: z.url(), summary: z.unknown() })).max(20),
});

export type NewsSummaryInput = Pick<NewsItem, 'url' | 'headline' | 'project' | 'publishedAt'> & {
  sourceExcerpt: string;
};
export type NewsSummaryBatch = (
  items: readonly NewsSummaryInput[],
) => Promise<readonly { url: string; summary: unknown }[]>;

function workerPython(): string {
  const override = process.env['SANDBOX_NEWS_SUMMARY_PYTHON'];
  if (override) return override;
  if (existsSync(bundledPython)) return bundledPython;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function safeWorkerEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV };
  for (const key of ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'NODE_ENV']) {
    const value = process.env[key];
    if (value) environment[key] = value;
  }
  return {
    ...environment,
    SANDBOX_NEWS_MODEL_PATH: modelPath,
    SANDBOX_NEWS_MODEL_THREADS: process.env['SANDBOX_NEWS_MODEL_THREADS'] ?? '4',
  };
}

function runLocalSummaryBatch(
  items: readonly NewsSummaryInput[],
): Promise<readonly { url: string; summary: unknown }[]> {
  return new Promise((resolve, reject) => {
    if (!existsSync(modelPath)) {
      reject(new Error('Le modèle local de rédaction SANDBOX News est absent.'));
      return;
    }
    const child = spawn(workerPython(), [workerPath], {
      cwd: applicationRoot,
      env: safeWorkerEnvironment(),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputSize = 0;
    let errorSize = 0;
    let settled = false;
    const finish = (error?: Error, value?: readonly { url: string; summary: unknown }[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value ?? []);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('La génération locale News a dépassé huit minutes.'));
    }, 8 * 60_000);
    child.stdout.on('data', (chunk: Buffer) => {
      outputSize += chunk.length;
      if (outputSize > 500_000) {
        child.kill();
        finish(new Error('Réponse du modèle News trop volumineuse.'));
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      errorSize += chunk.length;
      if (errorSize <= 8_000) stderr.push(chunk);
    });
    child.once('error', (error) => {
      finish(new Error(`Modèle News indisponible : ${error.message}`));
    });
    child.once('close', (code) => {
      if (settled) return;
      if (code !== 0) {
        const detail = Buffer.concat(stderr).toString('utf8').trim();
        finish(new Error(detail || 'Le modèle local News a échoué.'));
        return;
      }
      try {
        const parsed = workerResponseSchema.parse(
          JSON.parse(Buffer.concat(stdout).toString('utf8')) as unknown,
        );
        finish(undefined, parsed.results);
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Réponse du modèle News invalide.'));
      }
    });
    child.stdin.end(JSON.stringify({ items }));
  });
}

function normalizeEvidence(value: string): string {
  return value.replace(/\s+/gu, ' ').trim().toLocaleLowerCase('fr-FR');
}

function checkedSummary(value: unknown, sourceExcerpt: string): NewsEditorialRecord | undefined {
  const result = summarySchema.safeParse(value);
  if (!result.success) return undefined;
  const clean = (text: string) => {
    if (/[<>\uFFFD]/u.test(text)) return false;
    for (const character of text) {
      const code = character.charCodeAt(0);
      if (code <= 0x08 || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f))
        return false;
    }
    return true;
  };
  const segmenter = new Intl.Segmenter('fr-FR', { granularity: 'sentence' });
  if (!clean(result.data.title) || result.data.title.length < 8) return undefined;
  if (
    result.data.sentences.some(
      (sentence) =>
        !clean(sentence) ||
        [...segmenter.segment(sentence)].length !== 1 ||
        !/[.!?]$/u.test(sentence),
    )
  )
    return undefined;
  if (new Set(result.data.sentences.map(normalizeEvidence)).size !== 3) return undefined;
  const excerpt = normalizeEvidence(sourceExcerpt);
  const evidence = result.data.evidence.map(normalizeEvidence);
  if (new Set(evidence).size !== 3) return undefined;
  if (evidence.some((quote) => quote.length < 20 || !excerpt.includes(quote))) return undefined;
  return {
    title: result.data.title,
    sentences: result.data.sentences,
    category: result.data.category,
  };
}

export function newsSourceExcerptHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Produit les contenus manquants, les traduit, puis ne garde que les fiches complètes. */
export async function generateAndTranslateNews(
  items: readonly NewsItem[],
  options: {
    summarize?: NewsSummaryBatch;
    translate?: NewsTranslationBatch;
    editorial?: Record<string, NewsEditorialRecord>;
  } = {},
): Promise<{ items: NewsItem[]; generated: number; skipped: number }> {
  const editorial = options.editorial ?? NEWS_EDITORIAL;
  const unpublished = items.filter(
    (item) => item.kind === 'article' && !newsEditorialForItem(item, editorial),
  );
  const eligible = unpublished.filter(
    (item): item is NewsItem & { sourceExcerpt: string } =>
      typeof item.sourceExcerpt === 'string' && item.sourceExcerpt.trim().length >= 240,
  );
  const summaries = eligible.length
    ? await (options.summarize ?? runLocalSummaryBatch)(
        eligible.map((item) => ({
          url: item.url,
          headline: item.headline ?? '',
          project: item.project,
          publishedAt: item.publishedAt,
          sourceExcerpt: item.sourceExcerpt,
        })),
      )
    : [];
  const summariesByUrl = new Map(summaries.map((summary) => [summary.url, summary.summary]));
  const generatedEditorial: Record<string, NewsEditorialRecord> = {};
  for (const item of eligible) {
    const summary = checkedSummary(summariesByUrl.get(item.url), item.sourceExcerpt);
    if (summary) generatedEditorial[item.url] = summary;
  }
  const combinedEditorial = { ...editorial, ...generatedEditorial };
  const translatable = items
    .filter((item) => item.kind === 'article' && newsEditorialForItem(item, combinedEditorial))
    .map((item) => ({ ...item, sourceExcerpt: undefined }));
  const translated = await translateNewsEditorialItems(
    translatable,
    options.translate,
    combinedEditorial,
  );
  const complete = translated
    .filter((item) => newsEditorialTranslationsComplete([item], combinedEditorial))
    .map((item) => {
      const record = newsEditorialForItem(item, combinedEditorial);
      return record ? { ...item, editorialSourceHash: newsEditorialSourceHash(record) } : item;
    });
  const clean = complete.map((item) => {
    const cleanItem: NewsItem = { ...item };
    delete cleanItem.sourceExcerpt;
    return newsItemSchema.parse(cleanItem);
  });
  const acceptedGenerated = clean.filter((item) => generatedEditorial[new URL(item.url).href]);
  return {
    items: clean,
    generated: acceptedGenerated.length,
    skipped: unpublished.length - acceptedGenerated.length,
  };
}
