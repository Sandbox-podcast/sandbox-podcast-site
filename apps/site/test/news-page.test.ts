import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewsFeed } from '../src/domain/news-preview';

const state = vi.hoisted(() => ({
  enabled: false,
  preview: false,
  read: vi.fn<() => Promise<NewsFeed>>(),
  readPreview: vi.fn<() => Promise<NewsFeed>>(),
  prepareEditorial: vi.fn(async () => {
    throw new Error('Editorial database unavailable');
  }),
}));

vi.mock('@/lib/news-store', () => ({
  newsPublicEnabled: () => state.enabled,
  readPublishedNews: state.read,
}));
vi.mock('@/lib/news-preview-store', () => ({
  newsPreviewEnabled: () => state.preview,
  readNewsPreview: state.readPreview,
}));
vi.mock('@/lib/admin-persistence', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  preparePublicEditorialContent: state.prepareEditorial,
}));

import NewsPage from '../src/app/(fr)/news/page';
import { publicNewsPageMetadata } from '../src/lib/news-metadata';
import { readNewsPageData, newsPageAvailable } from '../src/lib/news-page-data';
import LocalizedPage from '../src/app/[locale]/[[...path]]/page';

const emptyFeed: NewsFeed = { checkedAt: null, sources: [], items: [] };

beforeEach(() => {
  state.enabled = false;
  state.preview = false;
  state.read.mockReset().mockResolvedValue(emptyFeed);
  state.readPreview.mockReset().mockResolvedValue(emptyFeed);
  state.prepareEditorial.mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe('accès et disponibilité des pages News', () => {
  it('ferme la page avant activation, sans accès à la base', async () => {
    expect(await readNewsPageData()).toEqual({ status: 'disabled' });
    await expect(NewsPage({})).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(await newsPageAvailable()).toBe(false);
    expect(state.read).not.toHaveBeenCalled();
    expect((await publicNewsPageMetadata()).robots).toMatchObject({ index: false });
  });

  it('masque une rubrique vide même si le collecteur est activé', async () => {
    state.enabled = true;
    await expect(NewsPage({})).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    expect(await newsPageAvailable()).toBe(false);
    expect((await publicNewsPageMetadata()).robots).toMatchObject({ index: false });
  });

  it.each(['fr-FR', 'en', 'es-ES', 'de-DE'])(
    'distingue une panne de stockage d’un flux vide en %s et conserve noindex',
    async (locale) => {
      state.enabled = true;
      state.read.mockRejectedValue(new Error('Database unavailable'));
      const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      expect(await readNewsPageData()).toEqual({ status: 'unavailable' });
      await expect(NewsPage({ locale })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
      expect(await newsPageAvailable()).toBe(false);
      expect((await publicNewsPageMetadata(locale)).robots).toMatchObject({ index: false });
      expect(log).toHaveBeenCalled();
    },
  );

  it('garde les aperçus locaux sans indexation ni lecture de production', async () => {
    state.enabled = true;
    state.preview = true;
    expect(await readNewsPageData()).toEqual({ status: 'preview', feed: emptyFeed });
    expect((await publicNewsPageMetadata()).robots).toMatchObject({ index: false });
    expect(state.read).not.toHaveBeenCalled();
  });

  it.each(['en', 'es-es', 'de-de'])(
    'sert /%s/news sans dépendre de la base éditoriale avant le rendu News',
    async (locale) => {
      state.enabled = true;
      state.preview = true;
      const page = await LocalizedPage({
        params: Promise.resolve({ locale, path: ['news'] }),
      });
      expect(page).toBeTruthy();
      expect(state.prepareEditorial).not.toHaveBeenCalled();
    },
  );

  it('indexe uniquement un flux publié contenant des fiches réelles', async () => {
    state.enabled = true;
    state.read.mockResolvedValue({
      ...emptyFeed,
      items: [
        {
          id: 'test',
          project: 'Source',
          repository: 'www.therundown.ai',
          version: 'article',
          url: 'https://www.therundown.ai/articles/test',
          publishedAt: '2026-10-18',
          category: 'models',
          prerelease: false,
        },
      ],
    });
    const metadata = await publicNewsPageMetadata('en');
    expect(metadata.robots).toMatchObject({ index: true });
    expect(metadata.alternates?.languages).toBeUndefined();
  });
});
