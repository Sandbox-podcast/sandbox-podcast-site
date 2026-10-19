import { describe, expect, it, vi } from 'vitest';
import { NEWS_MEDIA, type NewsMedia } from '../src/domain/news-media';
import { newsArticleUrl, newsSourceMatches } from '../src/domain/news-source';
import { newsPublicationDate } from '../src/domain/news-dates';
import { parseNewsChangelog } from '../src/pipeline/news-changelog';
import { requestNewsPage } from '../src/lib/news-http';
import { newsRequestBatches } from '../src/domain/news-queue';

const source: NewsMedia = {
  id: 'fixture',
  name: 'Source de test',
  url: 'https://developers.openai.com/changelog',
  path: '/changelog',
  mode: 'changelog',
};
describe('formats des nouvelles sources News', () => {
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
