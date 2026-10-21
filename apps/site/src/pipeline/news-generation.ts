import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { z } from 'zod';
import { newsCategorySchema, newsItemSchema, type NewsItem } from '../domain/news-preview.ts';
import {
  applyNewsEditorial,
  newsEditorialForItem,
  newsEditorialSourceHash,
  NEWS_EDITORIAL,
  type NewsEditorialRecord,
} from './news-editorial.ts';
import { translateNewsEditorialItems, type NewsTranslationBatch } from './news-translation.ts';

const applicationRoot = fileURLToPath(new URL('../../', import.meta.url));
const workerPath = join(applicationRoot, 'scripts', 'news-summarize.py');
const localDirectory = join(applicationRoot, '.local');
const modelPath = join(localDirectory, 'news-summary-model', 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf');
const bundledPython = join(
  localDirectory,
  'news-summarizer-venv',
  process.platform === 'win32' ? 'Scripts' : 'bin',
  process.platform === 'win32' ? 'python.exe' : 'python',
);

const summarySchema = z.object({
  title: z.string().trim().min(1).max(200),
  sentences: z.array(z.string().trim().min(1).max(600)).min(1).max(3),
  category: newsCategorySchema,
  evidence: z.array(z.string().trim().min(20).max(320)).min(1).max(3),
});
const workerResponseSchema = z.object({
  results: z
    .array(
      z.object({
        url: z.url(),
        summary: z.unknown(),
        reason: z
          .enum([
            'missing_excerpt',
            'insufficient_source_sentences',
            'model_refused',
            'invalid_summary',
          ])
          .optional(),
      }),
    )
    .max(20),
});

export type NewsSkipReason =
  | 'missing_excerpt'
  | 'insufficient_source_sentences'
  | 'model_refused'
  | 'invalid_summary'
  | 'translation_rejected';
interface NewsSummaryResult {
  url: string;
  summary: unknown;
  reason?: NewsSkipReason | 'generation_failed' | undefined;
}

export type NewsSummaryInput = Pick<NewsItem, 'url' | 'headline' | 'project' | 'publishedAt'> & {
  sourceExcerpt: string;
};
export type NewsSummaryBatch = (
  items: readonly NewsSummaryInput[],
) => Promise<readonly NewsSummaryResult[]>;

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

function runLocalSummaryProcess(
  items: readonly NewsSummaryInput[],
  signal?: AbortSignal,
): Promise<readonly NewsSummaryResult[]> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Le budget du lot News est épuisé.'));
      return;
    }
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
    const finish = (error?: Error, value?: readonly NewsSummaryResult[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve(value ?? []);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('La génération locale News a dépassé huit minutes.'));
    }, 8 * 60_000);
    const abort = () => {
      child.kill();
      finish(new Error('Le budget du lot News est épuisé.'));
    };
    signal?.addEventListener('abort', abort, { once: true });
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
    child.once('close', (code, signal) => {
      if (settled) return;
      if (code !== 0) {
        const detail = Buffer.concat(stderr).toString('utf8').trim();
        const identity = `Le modèle local News a échoué (code=${String(code)}, signal=${signal ?? 'null'}).`;
        finish(new Error(detail ? `${identity} ${detail}` : identity));
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

/** Un arrêt natif sur un article ne doit pas perdre les autres résumés du lot. */
async function runLocalSummaryBatch(
  items: readonly NewsSummaryInput[],
  signal?: AbortSignal,
): Promise<readonly NewsSummaryResult[]> {
  if (items.length <= 1) return runLocalSummaryProcess(items, signal);
  const results: NewsSummaryResult[] = [];
  for (const item of items) {
    signal?.throwIfAborted();
    try {
      results.push(...(await runLocalSummaryProcess([item], signal)));
    } catch (error) {
      if (signal?.aborted) throw error;
      console.error(
        'Échec du résumé News pour',
        item.url,
        error instanceof Error ? error.message : 'erreur',
      );
      results.push({ url: item.url, summary: null, reason: 'generation_failed' });
    }
  }
  return results;
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
  const withoutRelativeToday = (sentence: string) =>
    sentence
      .replace(/\baujourd['’]hui,?\s*/giu, '')
      .replace(/ +/gu, ' ')
      .trim();
  const sentences = result.data.sentences.map(withoutRelativeToday);
  if (
    sentences.some(
      (sentence) =>
        !clean(sentence) ||
        [...segmenter.segment(sentence)].length !== 1 ||
        !/[.!?]$/u.test(sentence),
    )
  )
    return undefined;
  if (new Set(sentences.map(normalizeEvidence)).size !== sentences.length) return undefined;
  if (
    sentences.some((sentence) =>
      /\b(?:je|nous|notre|nos|mon|mes|we|our|my)\b|\bj['’]/iu.test(sentence),
    )
  )
    return undefined;
  const excerpt = normalizeEvidence(sourceExcerpt);
  const evidence = result.data.evidence.map(normalizeEvidence);
  if (evidence.length !== sentences.length || new Set(evidence).size !== evidence.length)
    return undefined;
  if (evidence.some((quote) => quote.length < 20 || !excerpt.includes(quote))) return undefined;
  // Une modalité (texte, image, audio) ne désigne pas un modèle distinct.
  if (
    evidence.some(
      (quote, index) =>
        /\bdifferent modalities\b/iu.test(quote) &&
        !/\bmodels\b/iu.test(quote) &&
        /\b(?:modèles différents|différents modèles)\b/iu.test(sentences[index] ?? ''),
    )
  )
    return undefined;
  // Le titre reprend un fait du résumé : le modèle ne peut y ajouter une autre affirmation.
  const title = (sentences[0] ?? '').replace(/[.!?]$/u, '');
  if (title.length < 8 || title.length > 200) return undefined;
  return {
    title,
    sentences,
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
    budgetMs?: number;
    deferTranslations?: boolean;
    onSkipped?: (item: NewsItem, reason: NewsSkipReason) => void;
  } = {},
): Promise<{ items: NewsItem[]; generated: number; skipped: number; failedUrls?: string[] }> {
  const budgetMs = options.budgetMs ?? 14 * 60_000;
  const deadline = Date.now() + budgetMs;
  const signal = AbortSignal.timeout(budgetMs);
  const editorial = options.editorial ?? NEWS_EDITORIAL;
  const unpublished = items.filter(
    (item) => item.kind === 'article' && !newsEditorialForItem(item, editorial),
  );
  const eligible = unpublished.filter(
    (item): item is NewsItem & { sourceExcerpt: string } =>
      typeof item.sourceExcerpt === 'string' && item.sourceExcerpt.trim().length >= 30,
  );
  const summaries = eligible.length
    ? await (options.summarize ?? ((inputs) => runLocalSummaryBatch(inputs, signal)))(
        eligible.map((item) => ({
          url: item.url,
          headline: item.headline ?? '',
          project: item.project,
          publishedAt: item.publishedAt,
          sourceExcerpt: item.sourceExcerpt,
        })),
      )
    : [];
  signal.throwIfAborted();
  const summariesByUrl = new Map(summaries.map((summary) => [summary.url, summary.summary]));
  const reasons = new Map(summaries.map((summary) => [summary.url, summary.reason]));
  const generatedEditorial: Record<string, NewsEditorialRecord> = {};
  for (const item of eligible) {
    const summary = checkedSummary(summariesByUrl.get(item.url), item.sourceExcerpt);
    if (summary) generatedEditorial[item.url] = summary;
    else if (!reasons.get(item.url))
      reasons.set(item.url, summariesByUrl.get(item.url) ? 'invalid_summary' : 'model_refused');
  }
  const combinedEditorial = { ...editorial, ...generatedEditorial };
  const translatable = items
    .filter((item) => item.kind === 'article' && newsEditorialForItem(item, combinedEditorial))
    .map((item) => ({ ...item, sourceExcerpt: undefined }));
  const translated = options.deferTranslations
    ? translatable.map((item) => applyNewsEditorial(item, combinedEditorial))
    : await translateNewsEditorialItems(
        translatable,
        options.translate,
        combinedEditorial,
        undefined,
        signal,
        true,
      );
  signal.throwIfAborted();
  if (Date.now() >= deadline) throw new Error('Le budget du lot News est épuisé.');
  const complete = translated.map((item) => {
    const record = newsEditorialForItem(item, combinedEditorial);
    return record ? { ...item, editorialSourceHash: newsEditorialSourceHash(record) } : item;
  });
  const clean = complete.map((item) => {
    const cleanItem: NewsItem = { ...item };
    delete cleanItem.sourceExcerpt;
    return newsItemSchema.parse(cleanItem);
  });
  const acceptedGenerated = clean.filter((item) => generatedEditorial[new URL(item.url).href]);
  const accepted = new Set(clean.map((item) => item.url));
  const failedUrls = eligible
    .filter((item) => !accepted.has(item.url) && reasons.get(item.url) === 'generation_failed')
    .map((item) => item.url);
  const failed = new Set(failedUrls);
  for (const item of unpublished) {
    if (accepted.has(item.url) || failed.has(item.url)) continue;
    const reason =
      !item.sourceExcerpt || item.sourceExcerpt.trim().length < 30
        ? 'missing_excerpt'
        : (reasons.get(item.url) ?? 'translation_rejected');
    if (reason !== 'generation_failed') options.onSkipped?.(item, reason);
  }
  return {
    items: clean,
    generated: acceptedGenerated.length,
    skipped: unpublished.length - acceptedGenerated.length - failedUrls.length,
    ...(failedUrls.length ? { failedUrls } : {}),
  };
}
