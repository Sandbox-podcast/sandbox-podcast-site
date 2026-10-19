import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditableContent } from '../src/domain/admin-content';

const storage = vi.hoisted(() => ({
  read: vi.fn<() => Promise<EditableContent | undefined>>(),
  get: vi.fn(),
  save: vi.fn(),
}));
vi.mock('../src/lib/admin-persistence-postgres.ts', () => ({
  postgresReadPublished: storage.read,
  postgresGetAdminContent: storage.get,
  postgresSaveAdminContent: storage.save,
}));
vi.mock('../src/db/client.ts', () => ({
  hasDatabaseConfiguration: () => true,
  getDb: () => {
    throw new Error('Database unavailable; private connection details');
  },
}));
vi.mock('../src/app/fonts', () => ({ siteFonts: 'local-fonts' }));
vi.mock('../src/components/shell', () => ({
  Masthead: () => createElement('header', null, 'Sandbox header'),
  Footer: () => createElement('footer', null, 'Sandbox footer'),
}));
vi.mock('../src/components/analytics-consent', () => ({ AnalyticsConsent: () => null }));
vi.mock('../src/lib/news-store', () => ({
  newsPublicEnabled: () => true,
  readPublishedNews: async () => {
    throw new Error('News database unavailable');
  },
}));
vi.mock('../src/lib/news-preview-store', () => ({ newsPreviewEnabled: () => false }));

import {
  getAdminContent,
  getPublishedAdminContent,
  preparePublicEditorialContent,
  preparePublishedEditorialContent,
  saveAdminContent,
} from '../src/lib/admin-persistence';
import RootLayout, { generateMetadata } from '../src/app/(fr)/layout';
import LocalizedRootLayout, {
  generateMetadata as localizedMetadata,
} from '../src/app/[locale]/layout';
import NewsPage from '../src/app/(fr)/news/page';
import SearchPage from '../src/components/search-screen';
import { loadContent, setEditorialOverride } from '../src/lib/load';
import { editableContentSchema } from '../src/domain/admin-content';
import { siteDictionary } from '../src/i18n/dictionaries';

let time = Date.parse('2026-10-18T12:00:00Z');
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  time += 60_000;
  vi.setSystemTime(time);
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PHASE', '');
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  storage.read.mockReset().mockResolvedValue(undefined);
  await preparePublishedEditorialContent();
  vi.setSystemTime(time + 6_000);
  storage.read.mockRejectedValue(
    new Error('Editorial database unavailable; private connection details'),
  );
  storage.get.mockRejectedValue(new Error('Admin database unavailable'));
  storage.save.mockRejectedValue(new Error('Write database unavailable'));
});
afterEach(() => {
  setEditorialOverride(undefined);
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function publishedFixture(name: string): EditableContent {
  const base = loadContent();
  return editableContentSchema.parse({
    site: { ...base.site, name },
    hosts: base.hosts,
    topics: base.topics,
    sources: base.sources,
    scoring: base.scoring,
    charts: base.charts,
    entities: base.entities,
    takes: base.takes,
    episodes: base.episodes,
    stories: base.stories,
  });
}

describe('lecture publique pendant une panne Postgres', () => {
  it('garde Git sans changer les snapshots et laisse les accès admin échouer', async () => {
    const before = loadContent();
    await expect(preparePublicEditorialContent()).resolves.toBeUndefined();
    expect(loadContent().site).toEqual(before.site);
    expect(loadContent().snapshots).toEqual(before.snapshots);
    await expect(preparePublishedEditorialContent()).rejects.toThrow(
      'Editorial database unavailable',
    );
    await expect(getPublishedAdminContent()).rejects.toThrow('Editorial database unavailable');
    await expect(getAdminContent()).rejects.toThrow('Admin database unavailable');
    await expect(
      saveAdminContent(publishedFixture('Published site'), 'publish', null),
    ).rejects.toThrow('Write database unavailable');
    expect(console.error).toHaveBeenCalledWith('Public editorial content unavailable:', 'Error');
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'private connection details',
    );
  });

  it('conserve la dernière publication chargée puis reprend le chargement après la panne', async () => {
    storage.read.mockResolvedValue(publishedFixture('Previously published site'));
    await preparePublishedEditorialContent();
    const snapshots = loadContent().snapshots;
    vi.setSystemTime(time + 12_000);
    storage.read.mockRejectedValue(new Error('Database offline'));
    await preparePublicEditorialContent();
    expect(loadContent().site.name).toBe('Previously published site');
    expect(loadContent().snapshots).toEqual(snapshots);
    vi.setSystemTime(time + 18_000);
    storage.read.mockResolvedValue(publishedFixture('Newly published site'));
    await preparePublicEditorialContent();
    expect(loadContent().site.name).toBe('Newly published site');
  });

  it('rend les métadonnées et le layout français pendant la panne', async () => {
    expect((await generateMetadata()).applicationName).toBe('Sandbox TalkShow');
    const html = renderToStaticMarkup(
      await RootLayout({ children: createElement('p', null, 'Page visible') }),
    );
    expect(html).toContain('lang="fr"');
    expect(html).toContain('Page visible');
    expect(html).toContain('Sandbox footer');
    expect(html).not.toContain('private connection details');
  });

  it.each(['en', 'es-es', 'de-de'])(
    'rend métadonnées, dictionnaire et layout /%s pendant la panne',
    async (locale) => {
      const params = Promise.resolve({ locale });
      expect((await localizedMetadata({ params })).applicationName).toBe('Sandbox TalkShow');
      const html = renderToStaticMarkup(
        await LocalizedRootLayout({ params, children: createElement('p', null, 'Page visible') }),
      );
      expect(html).toContain('Page visible');
      expect(html).not.toContain('private connection details');
      expect(
        (
          await siteDictionary(locale === 'es-es' ? 'es-ES' : locale === 'de-de' ? 'de-DE' : locale)
        )['Classements'],
      ).toBeTruthy();
    },
  );

  it.each(['fr-FR', 'en', 'es-ES', 'de-DE'])(
    'masque News et rend la recherche dans son layout en %s pendant une panne totale',
    async (locale) => {
      const dictionary = await siteDictionary(locale);
      await expect(NewsPage({ locale })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
      const pages = [
        await SearchPage({ dictionary, searchParams: Promise.resolve({ q: 'Sandbox' }) }),
      ];
      for (const page of pages) {
        const layout =
          locale === 'fr-FR'
            ? await RootLayout({ children: page })
            : await LocalizedRootLayout({
                params: Promise.resolve({ locale: locale.toLowerCase() }),
                children: page,
              });
        const html = renderToStaticMarkup(layout);
        expect(html).toContain('id="main"');
        expect(html).not.toContain('private connection details');
      }
    },
  );
});
