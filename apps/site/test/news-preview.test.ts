import { newsSynopsisForDisplay } from '../src/domain/news-preview.ts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { newsSentence, selectNews, uniqueNews, type NewsItem } from '../src/domain/news-preview';
import { collectNewsPreview } from '../src/pipeline/news-preview';
import { NewsScreen } from '../src/components/news-screen';
import { StudioEasterEggs } from '../src/components/studio-easter-eggs';
import { DiscoveryStory } from '../src/components/discovery-story';
import { POST } from '../src/app/api/news/preview/route';

const item: NewsItem = {
  id: 'test:1',
  project: 'TEST Codex',
  repository: 'openai/codex',
  version: 'v1.2.3',
  url: 'https://github.com/openai/codex/releases/tag/v1.2.3',
  publishedAt: '2026-10-17T12:00:00Z',
  category: 'agents',
  prerelease: false,
};
afterEach(() => vi.unstubAllEnvs());

describe('liste News locale', () => {
  it('déduplique les URL et garde les corrections du dernier relevé', () => {
    expect(uniqueNews([item, { ...item, version: 'v1.2.4' }])).toEqual([
      { ...item, version: 'v1.2.4' },
    ]);
  });
  it('combine recherche, catégorie, ordre et pagination sans modifier les données', () => {
    const items = [
      item,
      {
        ...item,
        id: 'test:2',
        url: `${item.url}-preview`,
        prerelease: true,
        publishedAt: '2026-10-18T12:00:00Z',
      },
    ];
    expect(selectNews(items, { category: 'models' }).total).toBe(0);
    expect(selectNews(items, { query: ' CODEX ', category: 'agents', limit: 1 }).items[0]?.id).toBe(
      'test:2',
    );
    expect(selectNews(items, { order: 'stable', limit: 1 }).items[0]?.id).toBe(item.id);
    expect(items[0]?.id).toBe(item.id);
  });
  it.each(['fr-FR', 'en', 'de-DE', 'es-ES'])(
    'distingue une préversion et conserve les versions en %s',
    (locale) => {
      const sentence = newsSentence(item, locale);
      expect(sentence).toContain('v1.2.3');
      expect(sentence).toContain(item.project);
      expect(sentence.endsWith('.')).toBe(true);
      expect(newsSentence({ ...item, prerelease: true }, locale)).not.toBe(sentence);
    },
  );
  it('affiche un volet natif avec la phrase, la date réelle et le lien source', () => {
    const html = renderToStaticMarkup(
      createElement(NewsScreen, { initialFeed: { checkedAt: null, sources: [], items: [item] } }),
    );
    const row = html.slice(html.indexOf('<li>'), html.indexOf('</li>'));
    expect(row).toContain(`dateTime="${item.publishedAt}"`);
    expect(row).toContain('17/10/2026');
    expect(row).toContain('14:00');
    expect(row).toContain(`href="${item.url}"`);
    expect(row).toContain('rel="noopener noreferrer"');
    expect(row).toContain('<summary');
    expect(row).not.toMatch(/<img|<h[1-6]|<p[ >]/);
  });
  it('propose une recherche vide sans inventer de publication', () => {
    const html = renderToStaticMarkup(
      createElement(NewsScreen, { initialFeed: { checkedAt: null, sources: [], items: [] } }),
    );
    expect(html).toContain('Aucune actualité récente disponible');
    expect(html).not.toContain('Effacer les filtres');
    expect(html).not.toContain('<li>');
  });
});

describe('collecteur de publications réelles', () => {
  it('isole les échecs, rejette brouillons et dates futures et ne suit aucune redirection', async () => {
    const transport = vi.fn<typeof fetch>().mockImplementation(async (input, options) => {
      expect(options?.redirect).toBe('error');
      expect(options?.headers).not.toHaveProperty('Authorization');
      const url = input instanceof Request ? input.url : input.toString();
      if (!url.includes('/openai/codex/')) return new Response(null, { status: 503 });
      const release = {
        id: 1,
        tag_name: 'v1.2.3',
        html_url: item.url,
        published_at: item.publishedAt,
        draft: false,
        prerelease: false,
      };
      return Response.json([
        release,
        { ...release, id: 2, draft: true },
        { ...release, id: 3, published_at: '2030-01-01T00:00:00Z' },
      ]);
    });
    const result = await collectNewsPreview(
      { checkedAt: null, sources: [], items: [] },
      transport,
      new Date('2026-10-18T12:00:00Z'),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.url).toBe(item.url);
    expect(result.sources.filter((source) => source.ok)).toEqual([{ name: 'Codex', ok: true }]);
    expect(transport).toHaveBeenCalledTimes(8);
  });
  it('conserve le dernier relevé si toutes les sources échouent', async () => {
    const transport = vi.fn<typeof fetch>().mockRejectedValue(new Error('Hors ligne'));
    const result = await collectNewsPreview(
      { checkedAt: null, sources: [], items: [item] },
      transport,
    );
    expect(result.items).toEqual([item]);
    expect(result.sources.every((source) => !source.ok)).toBe(true);
  });
  it('refuse une réponse qui pointe vers une source incohérente', async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json([
        {
          id: 1,
          tag_name: 'v1',
          html_url: 'https://example.com/',
          published_at: item.publishedAt,
          draft: false,
          prerelease: false,
        },
      ]),
    );
    const result = await collectNewsPreview({ checkedAt: null, sources: [], items: [] }, transport);
    expect(result.items).toEqual([]);
    expect(result.sources.every((source) => !source.ok)).toBe(true);
  });
});

describe('isolation de la prévisualisation', () => {
  it('ferme la route de collecte en production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SANDBOX_NEWS_PREVIEW', '1');
    expect(
      (await POST(new Request('http://localhost:3328/api/news/preview', { method: 'POST' })))
        .status,
    ).toBe(404);
  });
  it('refuse une collecte déclenchée depuis une autre origine', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SANDBOX_NEWS_PREVIEW', '1');
    expect(
      (
        await POST(
          new Request('http://localhost:3328/api/news/preview', {
            method: 'POST',
            headers: { origin: 'https://example.com' },
          }),
        )
      ).status,
    ).toBe(403);
  });
  it('masque la carte et le radar quand le flux est vide', () => {
    vi.stubEnv('SANDBOX_NEWS_PUBLIC', '');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SANDBOX_NEWS_PREVIEW', '1');
    expect(renderToStaticMarkup(createElement(StudioEasterEggs))).not.toContain('href="/news"');
    expect(renderToStaticMarkup(createElement(DiscoveryStory, { hosts: [] }))).not.toContain(
      'home-news-title',
    );
    vi.stubEnv('NODE_ENV', 'production');
    expect(renderToStaticMarkup(createElement(StudioEasterEggs))).not.toContain('href="/news"');
    expect(renderToStaticMarkup(createElement(DiscoveryStory, { hosts: [] }))).not.toContain(
      'home-news-title',
    );
  });
  it('ajoute la carte et le radar quand News est activé en production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SANDBOX_NEWS_PREVIEW', '');
    vi.stubEnv('SANDBOX_NEWS_PUBLIC', '1');
    expect(
      renderToStaticMarkup(createElement(StudioEasterEggs, { newsAvailable: true })),
    ).toContain('href="/news"');
    expect(
      renderToStaticMarkup(createElement(DiscoveryStory, { hosts: [], newsAvailable: true })),
    ).toContain('home-news-title');
  });
});

describe('phrases affichées sans répétition', () => {
  it('ignore casse, espaces et ponctuation finale sans supprimer un fait différent', () => {
    const displayItem = {
      ...item,
      kind: 'article' as const,
      titles: { 'fr-FR': 'Un modèle ouvert est disponible' },
      synopses: {
        'fr-FR': [
          'UN MODÈLE OUVERT EST DISPONIBLE !',
          'Les poids sont publics.',
          'Les poids sont publics!',
        ],
      },
    };
    expect(newsSynopsisForDisplay(displayItem)).toEqual(['Les poids sont publics.']);
  });
});
