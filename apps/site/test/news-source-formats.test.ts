import { describe, expect, it, vi } from 'vitest';
import { NEWS_MEDIA, type NewsMedia } from '../src/domain/news-media';
import { newsArticleUrl, newsSourceMatches } from '../src/domain/news-source';
import { newsPublicationDate } from '../src/domain/news-dates';
import { parseNewsChangelog } from '../src/pipeline/news-changelog';
import { requestNewsPage } from '../src/lib/news-http';
import { newsRequestBatches, newsPublicationFromQueue } from '../src/domain/news-queue';
import {
  collectMediaNewsPreview,
  discoverNewsArticles,
  parseNewsArticle,
} from '../src/pipeline/news-media-preview';

const source: NewsMedia = {
  id: 'fixture',
  name: 'Source de test',
  url: 'https://developers.openai.com/changelog',
  path: '/changelog',
  mode: 'changelog',
};
describe('formats des nouvelles sources News', () => {
  it('conserve la date de collecte lorsque le worker publie plus tard', () => {
    const media = NEWS_MEDIA[0];
    const payload = newsPublicationFromQueue(
      {
        checkedAt: '2026-10-18T07:00:00.000Z',
        sources: [{ id: media.id, name: media.name, url: media.url, ok: true }],
      },
      [],
    );
    expect(payload.checkedAt).toBe('2026-10-18T07:00:00.000Z');
  });
  it('borne le passage complet lorsque le réseau ne répond plus', async () => {
    const transport = vi.fn<typeof fetch>().mockImplementation(
      (_input, options) =>
        new Promise((_resolve, reject) => {
          const signal = options?.signal;
          const abort = () => {
            reject(new Error('Réseau interrompu.'));
          };
          if (signal?.aborted) abort();
          else signal?.addEventListener('abort', abort, { once: true });
        }),
    );
    const feed = await collectMediaNewsPreview(
      { checkedAt: null, sources: [], items: [] },
      transport,
      new Date(),
      { budgetMs: 20 },
    );
    expect(feed.sources).toHaveLength(105);
    expect(feed.sources.every((status) => !status.ok)).toBe(true);
    expect(feed.items).toEqual([]);
    expect(transport.mock.calls.length).toBeLessThanOrEqual(8);
  });
  it('lit les cartes de blog placées dans un header ou un aside', () => {
    const media = NEWS_MEDIA.find((entry) => entry.id === 'soundraw');
    if (!media) throw new Error('Source absente');
    const links = discoverNewsArticles(
      '<main><header><a href="/blog/post/new-release">Une publication</a></header><aside><a href="/blog/post/other-release">Autre publication</a></aside></main>',
      media,
    );
    expect(links.map((link) => new URL(link.url).pathname)).toEqual([
      '/blog/post/new-release',
      '/blog/post/other-release',
    ]);
  });
  it('autorise les URL localisées du blog Perplexity sans ouvrir les autres rubriques', () => {
    const media = NEWS_MEDIA.find((entry) => entry.id === 'perplexity');
    if (!media) throw new Error('Source absente');
    expect(newsArticleUrl(media, '/en-GB/hub/blog/open-model')).toBeDefined();
    expect(newsArticleUrl(media, '/en-GB/hub/customers/company')).toBeUndefined();
  });
  it.each(['meta-ai', 'alibaba-cloud', 'ai2'])(
    'lit la date visible publiée par %s sans prendre une date narrative',
    (id) => {
      const media = NEWS_MEDIA.find((entry) => entry.id === id);
      if (!media) throw new Error('Source absente');
      const path = '/blog/new-model';
      const html =
        '<h1>Un nouveau modèle</h1><span>October 18, 2026</span><p>Un modèle disponible avec une documentation publique.</p>';
      expect(parseNewsArticle(html, new URL(path, media.url).href, media)?.publishedAt).toBe(
        '2026-10-18',
      );
      expect(
        parseNewsArticle(
          html.replace(
            '<span>October 18, 2026</span>',
            '<p>Le laboratoire cite une étude du October 18, 2026.</p>',
          ),
          new URL(path, media.url).href,
          media,
        ),
      ).toBeUndefined();
    },
  );
  it('lit les notes récentes même si le changelog place les plus anciennes en premier', () => {
    const html = Array.from(
      { length: 25 },
      (_, index) =>
        `<h3 id="oct${index + 1}">October ${index + 1}, 2026</h3><p>Mise à jour ${index + 1} avec une description publique.</p>`,
    ).join('');
    const items = parseNewsChangelog(html, source);
    expect(items).toHaveLength(20);
    expect(items[0]?.publishedAt).toBe('2026-10-25');
    expect(items[0]?.sourceExcerpt).not.toContain('Mise à jour 24');
  });
  it('enregistre les 105 adresses sans doublon ni suivi UTM', () => {
    expect(NEWS_MEDIA).toHaveLength(105);
    expect(new Set(NEWS_MEDIA.map((entry) => entry.id)).size).toBe(105);
    expect(new Set(NEWS_MEDIA.map((entry) => entry.url.replace(/\/$/, ''))).size).toBe(105);
    expect(NEWS_MEDIA.some((entry) => new URL(entry.url).search)).toBe(false);
  });
  it.each([
    ['2026/10/19', '2026-10-19'],
    ['October 19, 2026', '2026-10-19'],
    ['19 Oct 2026', '2026-10-19'],
    ['2026-02-30', undefined],
    ['October', undefined],
  ])('lit une date publiée %s', (raw, expected) => {
    expect(newsPublicationDate(raw)).toBe(expected);
  });
  it('sépare les notes datées avec leurs véritables ancres', () => {
    const entries = parseNewsChangelog(
      '<h2>October 2026</h2><h3 id="oct19">October 19</h3><p>Première mise à jour.</p><h3 id="oct18">October 18</h3><p>Autre mise à jour.</p>',
      source,
    );
    expect(entries.map((item) => [item.publishedAt, item.url])).toEqual([
      ['2026-10-19', 'https://developers.openai.com/changelog#oct19'],
      ['2026-10-18', 'https://developers.openai.com/changelog#oct18'],
    ]);
    expect(entries[0]?.sourceExcerpt).not.toContain('Autre mise');
    expect(newsSourceMatches(source, entries[0]?.id ?? '', entries[0]?.url ?? '')).toBe(true);
    expect(parseNewsChangelog('<h2>October 19, 2026</h2><p>Sans ancre.</p>', source)).toEqual([]);
  });
  it('refuse les liens hors éditeur et les faux fragments des blogs', () => {
    expect(newsArticleUrl(source, 'https://evil.test/changelog#oct19')).toBeUndefined();
    expect(newsArticleUrl(source, 'https://developers.openai.com/changelog')).toBeUndefined();
    expect(
      newsArticleUrl(
        { ...source, mode: 'articles', path: '/' },
        'https://developers.openai.com/category/news',
      ),
    ).toBeUndefined();
  });
  it('ne suit pas une redirection hors des origines autorisées', async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: 'https://evil.test/' } }),
      );
    await expect(requestNewsPage(source.url, source, transport)).rejects.toThrow('hors registre');
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('borne les lots en nombre et en octets UTF-8', () => {
    const input = Array.from({ length: 45 }, () => '字'.repeat(8000));
    const batches = newsRequestBatches(input);
    expect(batches.flat()).toEqual(input);
    expect(
      batches.every(
        (batch) =>
          batch.length <= 20 && new TextEncoder().encode(JSON.stringify(batch)).length < 180_000,
      ),
    ).toBe(true);
  });
});
