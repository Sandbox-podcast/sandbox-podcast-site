import { describe, expect, it, vi } from 'vitest';
import { NEWS_MEDIA } from '../src/domain/news-media.ts';
import type { NewsItem } from '../src/domain/news-preview.ts';
import {
  generateAndTranslateNews,
  type NewsSummaryInput,
} from '../src/pipeline/news-generation.ts';

const evidence = [
  'The lab released Model A with 4 billion parameters.',
  'The system accepts images and video input.',
  'The release includes weights under the Apache 2.0 license.',
] as const;

function article(sourceIndex: number, includeExcerpt = true): NewsItem {
  const source = NEWS_MEDIA[sourceIndex];
  if (!source) throw new Error('Source de test absente.');
  const pathname = '/articles/automatic-summary-test';
  return {
    id: `${source.id}:${pathname}`,
    project: source.name,
    repository: new URL(source.url).hostname,
    version: 'article',
    url: new URL(pathname, source.url).href,
    publishedAt: '2026-10-18T14:00:00.000Z',
    category: 'models',
    prerelease: false,
    kind: 'article',
    headline: 'A new open model is available',
    ...(includeExcerpt
      ? {
          sourceExcerpt: `${source.name} announced a new release. ${evidence.join(' ')} The page also lists the download links and release notes.`,
        }
      : {}),
  };
}

function summaryFor(item: NewsSummaryInput) {
  return {
    url: item.url,
    summary: {
      title: `Un nouveau modèle ouvert chez ${item.project}`,
      sentences: [
        'Le laboratoire publie un modèle de quatre milliards de paramètres.',
        'Le système accepte des images et des vidéos.',
        'Les poids sont publiés sous licence Apache 2.0.',
      ],
      category: 'models',
      evidence,
    },
  };
}

describe('génération et traduction des nouvelles fiches', () => {
  it('publie uniquement des résumés sourcés, traduits dans les quatre langues et séparés par URL', async () => {
    const items = [article(1), article(5)];
    const summarize = vi.fn(async (inputs: readonly NewsSummaryInput[]) => inputs.map(summaryFor));
    const translate = vi.fn(async (texts: readonly string[], locale: string) =>
      texts.map((text) => `${locale}: ${text}`),
    );

    const result = await generateAndTranslateNews(items, { summarize, translate });

    expect(result.generated).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.items).toHaveLength(2);
    expect(new Set(result.items.map((item) => item.url)).size).toBe(2);
    expect(result.items.map((item) => item.titles?.['fr-FR'])).toEqual([
      'Un nouveau modèle ouvert chez The Rundown AI',
      'Un nouveau modèle ouvert chez The Deep View',
    ]);
    for (const item of result.items) {
      expect(item.titles?.['en']).toContain('en:');
      expect(item.titles?.['es-ES']).toContain('es-ES:');
      expect(item.titles?.['de-DE']).toContain('de-DE:');
      expect(item.synopses?.['en']).toHaveLength(3);
      expect(item.synopses?.['es-ES']).toHaveLength(3);
      expect(item.synopses?.['de-DE']).toHaveLength(3);
      expect(item.editorialSourceHash).toMatch(/^[a-f0-9]{64}$/u);
      expect(item).not.toHaveProperty('sourceExcerpt');
    }
    expect(translate).toHaveBeenCalledTimes(3);
  });

  it('écarte les citations fausses ou répétées et ne tente pas un article sans extrait', async () => {
    const candidate = article(1);
    let batch = 0;
    const summarize = vi.fn(async (inputs: readonly NewsSummaryInput[]) => {
      const attempt = batch++;
      return inputs.map((item) => {
        const summary = summaryFor(item).summary;
        return {
          url: item.url,
          summary: {
            ...summary,
            evidence:
              attempt === 0
                ? ['Une phrase inventée qui ne figure pas dans la source.', ...evidence.slice(1)]
                : [evidence[0], evidence[0], evidence[0]],
          },
        };
      });
    });
    const translate = vi.fn(async (texts: readonly string[], locale: string) =>
      texts.map((text) => `${locale}: ${text}`),
    );

    const invalidEvidence = await generateAndTranslateNews([candidate], { summarize, translate });
    const repeatedEvidence = await generateAndTranslateNews([candidate], { summarize, translate });
    const noExcerpt = await generateAndTranslateNews([article(1, false)], { summarize, translate });

    expect(invalidEvidence).toEqual({ items: [], generated: 0, skipped: 1 });
    expect(repeatedEvidence).toEqual({ items: [], generated: 0, skipped: 1 });
    expect(noExcerpt).toEqual({ items: [], generated: 0, skipped: 1 });
    expect(summarize).toHaveBeenCalledTimes(2);
    expect(translate).not.toHaveBeenCalled();
  });
});
