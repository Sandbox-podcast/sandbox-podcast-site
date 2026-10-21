import { describe, expect, it, vi } from 'vitest';
import { NEWS_MEDIA } from '../src/domain/news-media.ts';
import type { NewsItem } from '../src/domain/news-preview.ts';
import {
  generateAndTranslateNews,
  type NewsSummaryInput,
  type NewsSkipReason,
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
        `${item.project} présente un modèle de quatre milliards de paramètres.`,
        'Le système accepte des images et des vidéos.',
        'Les poids sont publiés sous licence Apache 2.0.',
      ],
      category: 'models',
      evidence,
    },
  };
}

describe('génération et traduction des nouvelles fiches', () => {
  it('publie les résumés valides et distingue les erreurs natives des refus éditoriaux', async () => {
    const items = [article(1), article(5)];
    const first = items[0];
    if (!first) throw new Error('Fixture absente.');
    const onSkipped = vi.fn<(item: NewsItem, reason: NewsSkipReason) => void>();
    const result = await generateAndTranslateNews(items, {
      summarize: async (inputs) =>
        inputs.map((item, index) =>
          index === 0
            ? { url: item.url, summary: null, reason: 'generation_failed' }
            : summaryFor(item),
        ),
      translate: async (texts, locale) => texts.map((text) => `${locale}: ${text}`),
      onSkipped,
    });
    expect(result).toMatchObject({ generated: 1, skipped: 0, failedUrls: [first.url] });
    expect(result.items).toHaveLength(1);
    expect(onSkipped).not.toHaveBeenCalled();
  });
  it.each([
    {
      sentence:
        'Les données de modèles différents sont comparables par leur similarité sémantique.',
      quote:
        'Despite coming from different modalities, these embeddings occupy the same space and can be compared on their semantic similarity.',
      accepted: false,
    },
    {
      sentence: 'Différents modèles partagent le même espace de représentation sémantique.',
      quote:
        'Despite coming from different modalities, these embeddings occupy the same space and can be compared on their semantic similarity.',
      accepted: false,
    },
    {
      sentence:
        'Les représentations de différentes modalités sont comparables par leur similarité sémantique.',
      quote:
        'Despite coming from different modalities, these embeddings occupy the same space and can be compared on their semantic similarity.',
      accepted: true,
    },
    {
      sentence:
        'Les données de modèles différents sont comparables par leur similarité sémantique.',
      quote:
        'Different models generate compatible embeddings in this shared representation space, across different modalities.',
      accepted: true,
    },
  ])(
    'préserve la distinction entre modalités et modèles ($accepted, $sentence)',
    async ({ sentence, quote, accepted }) => {
      const passages = [evidence[0], evidence[1], quote];
      const input = {
        ...article(1),
        sourceExcerpt:
          passages.join(' ') +
          ' The publication also provides technical documentation and download links for developers.',
      };
      const translate = vi.fn(async (texts: readonly string[], locale: string) =>
        texts.map((text) => `${locale}: ${text}`),
      );
      const report = await generateAndTranslateNews([input], {
        summarize: async (inputs) =>
          inputs.map((item) => {
            const result = summaryFor(item);
            return {
              ...result,
              summary: {
                ...result.summary,
                evidence: passages,
                sentences: [...result.summary.sentences.slice(0, 2), sentence],
              },
            };
          }),
        translate,
      });
      expect(report.items).toHaveLength(accepted ? 1 : 0);
      if (!accepted) expect(translate).not.toHaveBeenCalled();
    },
  );

  it('arrête le lot à son échéance avant de lancer les traductions', async () => {
    const translate = vi.fn();
    await expect(
      generateAndTranslateNews([article(1)], {
        budgetMs: 1,
        summarize: async (inputs) => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          return inputs.map(summaryFor);
        },
        translate,
      }),
    ).rejects.toThrow();
    expect(translate).not.toHaveBeenCalled();
  });
  it('ne reprend pas la première personne d’un éditeur au nom de Sandbox', async () => {
    const input = article(1);
    const summarize = async (items: readonly NewsSummaryInput[]) =>
      items.map((item) => {
        const result = summaryFor(item);
        return {
          ...result,
          summary: {
            ...result.summary,
            sentences: [
              'Nous publions un modèle de quatre milliards de paramètres.',
              ...result.summary.sentences.slice(1),
            ],
          },
        };
      });
    const translate = vi.fn();
    expect(await generateAndTranslateNews([input], { summarize, translate })).toMatchObject({
      items: [],
      skipped: 1,
    });
    expect(translate).not.toHaveBeenCalled();
  });
  it('publie les fiches valides quand une autre traduction du lot est rejetée', async () => {
    const items = [article(1), article(5)];
    const summarize = async (inputs: readonly NewsSummaryInput[]) => inputs.map(summaryFor);
    const translate = async (texts: readonly string[], locale: string) => {
      if (texts.some((text) => text.includes('The Deep View')))
        throw new Error('Traduction refusée');
      return texts.map((text) => `${locale}: ${text}`);
    };
    const report = await generateAndTranslateNews(items, { summarize, translate });
    expect(report.items).toHaveLength(2);
    expect(report.items[0]?.project).toBe('The Rundown AI');
    expect(report.skipped).toBe(0);
  });

  it('publie le français sans lancer ni attendre le moteur de traduction', async () => {
    const translate = vi.fn(async () => {
      throw new Error('Indisponible');
    });
    const result = await generateAndTranslateNews([article(1)], {
      summarize: async (inputs) => inputs.map(summaryFor),
      translate,
      deferTranslations: true,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.synopses?.['fr-FR']).toHaveLength(3);
    expect(result.items[0]?.titles?.['en']).toBeUndefined();
    expect(translate).not.toHaveBeenCalled();
  });
  it.each([1, 2, 3])('publie une brève sourcée de %i phrase(s)', async (count) => {
    const input = { ...article(1), sourceExcerpt: evidence.slice(0, count).join(' ') };
    const result = await generateAndTranslateNews([input], {
      deferTranslations: true,
      summarize: async (inputs) =>
        inputs.map((item) => {
          const result = summaryFor(item);
          return {
            ...result,
            summary: {
              ...result.summary,
              sentences: result.summary.sentences.slice(0, count),
              evidence: evidence.slice(0, count),
            },
          };
        }),
    });
    expect(result.items[0]?.synopses?.['fr-FR']).toHaveLength(count);
    expect(result.skipped).toBe(0);
  });
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
      'The Rundown AI présente un modèle de quatre milliards de paramètres',
      'The Deep View présente un modèle de quatre milliards de paramètres',
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
    expect(translate).toHaveBeenCalledTimes(6);
  });

  it('reprend le premier fait dans le titre et retire un aujourd’hui devenu ambigu', async () => {
    const summarize = async (inputs: readonly NewsSummaryInput[]) =>
      inputs.map((item) => {
        const result = summaryFor(item);
        return {
          ...result,
          summary: {
            ...result.summary,
            title: 'Ce modèle est le meilleur du monde sans aucune preuve',
            sentences: [
              'Un modèle ouvert est disponible aujourd’hui avec quatre milliards de paramètres.',
              ...result.summary.sentences.slice(1),
            ],
          },
        };
      });
    const result = await generateAndTranslateNews([article(1)], {
      summarize,
      translate: async (texts, locale) => texts.map((text) => `${locale}: ${text}`),
    });
    expect(result.items[0]?.titles?.['fr-FR']).toBe(
      'Un modèle ouvert est disponible avec quatre milliards de paramètres',
    );
    expect(result.items[0]?.synopses?.['fr-FR']?.[0]).toBe(
      'Un modèle ouvert est disponible avec quatre milliards de paramètres.',
    );
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

    const onSkipped = vi.fn<(item: NewsItem, reason: NewsSkipReason) => void>();
    const invalidEvidence = await generateAndTranslateNews([candidate], {
      summarize,
      translate,
      onSkipped,
    });
    const repeatedEvidence = await generateAndTranslateNews([candidate], {
      summarize,
      translate,
      onSkipped,
    });
    const noExcerpt = await generateAndTranslateNews([article(1, false)], {
      summarize,
      translate,
      onSkipped,
    });

    expect(invalidEvidence).toEqual({ items: [], generated: 0, skipped: 1 });
    expect(repeatedEvidence).toEqual({ items: [], generated: 0, skipped: 1 });
    expect(noExcerpt).toEqual({ items: [], generated: 0, skipped: 1 });
    expect(summarize).toHaveBeenCalledTimes(2);
    expect(translate).not.toHaveBeenCalled();
    expect(onSkipped.mock.calls.map((call) => call[1])).toEqual([
      'invalid_summary',
      'invalid_summary',
      'missing_excerpt',
    ]);
  });
});
