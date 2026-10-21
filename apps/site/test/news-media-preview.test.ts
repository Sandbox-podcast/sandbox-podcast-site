import { createElement } from 'react';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NEWS_MEDIA } from '../src/domain/news-media';
import { newsItemSchema, newsSentence, newsSynopsis, selectNews } from '../src/domain/news-preview';
import { applyNewsEditorial, NEWS_EDITORIAL } from '../src/pipeline/news-editorial';
import { NEWS_EDITORIAL_TRANSLATIONS } from '../src/pipeline/news-translations';
import {
  newsEditorialTranslationsComplete,
  newsTranslatorPython,
  translateNewsEditorialItems,
} from '../src/pipeline/news-translation';
import { newsCollectionLd } from '../src/domain/news-seo';
import { newsPageMetadata } from '../src/lib/news-metadata';
import { NewsScreen } from '../src/components/news-screen';
import { generateMetadata as localizedRouteMetadata } from '../src/app/[locale]/[[...path]]/page';
import {
  collectMediaNewsPreview,
  discoverNewsArticles,
  newsPlainText,
  parseNewsArticle,
} from '../src/pipeline/news-media-preview';

const media = NEWS_MEDIA[5];
const url = `${media.url}articles/why-enterprise-ai-roi-goes-beyond-efficiency`;
const html = `<meta content="Why enterprise AI ROI goes beyond efficiency" property="og:title"><script type="application/ld+json">{"@graph":[{"@type":"NewsArticle","headline":"Why enterprise AI ROI goes beyond efficiency","datePublished":"2026-10-16T19:53:37.142Z"}]}</script>`;
afterEach(() => vi.unstubAllEnvs());

describe('médias News demandés par Lou', () => {
  it('privilégie les liens datés récents lorsque des articles anciens sont épinglés', () => {
    const source = NEWS_MEDIA.find((entry) => entry.id === 'rundown');
    if (!source) throw new Error('Source absente');
    const html = Array.from(
      { length: 20 },
      (_, index) => `<a href="/articles/article-${index}">October ${index + 1}, 2026</a>`,
    ).join('');
    const links = discoverNewsArticles(html, source);
    expect(links).toHaveLength(12);
    expect(links[0]?.url).toContain('article-19');
  });
  it('enregistre les dix médias, sans substituer GitHub à la demande', () => {
    expect(NEWS_MEDIA).toHaveLength(105);
    expect(new Set(NEWS_MEDIA.map((source) => source.name)).size).toBe(105);
    expect(NEWS_MEDIA.some((source) => source.url.includes('github.com'))).toBe(false);
  });
  it('récupère un article structuré, sa date précise et sa reformulation française', () => {
    const article = parseNewsArticle(html, url, media);
    expect(article?.publishedAt).toBe('2026-10-16T19:53:37.142Z');
    expect(article?.category).toBe('business');
    expect(article?.kind).toBe('article');
    expect(article && newsSentence(article)).toContain('IA en entreprise');
    expect(article && newsSynopsis(article).join(' ')).toContain('Wharton');
    expect(article && newsSentence(article)).not.toContain(`${media.name} :`);
    expect(article && newsSentence(article)).not.toBe(article?.headline);
  });
  it('extrait un passage public utile à la génération sans conserver le HTML', () => {
    const excerpt = 'The company released a new model with image support. '.repeat(8);
    const page = `<meta property="og:description" content="${excerpt}">${html}`;
    const article = parseNewsArticle(page, url, media);
    expect(article?.sourceExcerpt).toBe(excerpt.trim());
    expect(article?.sourceExcerpt).not.toContain('<meta');
  });
  it('utilise le corps de l’article quand la description est trop courte pour générer une synthèse', () => {
    const description = 'A short description without enough supporting details. '.repeat(4);
    const body =
      'The lab released a model with four billion parameters. It accepts images and text. The weights use the Apache 2.0 licence. '.repeat(
        3,
      );
    const article = parseNewsArticle(
      `${html}<meta property="og:description" content="${description}"><article><nav>Menu</nav><p>${body}</p></article>`,
      url,
      media,
    );
    expect(article?.sourceExcerpt).toBe(body.trim());
    expect(article?.sourceExcerpt).not.toContain('Menu');
  });
  it('trouve le Python du moteur sous Linux comme sous Windows, depuis le dossier de l’application', () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    expect(newsTranslatorPython('linux')).toBe(
      join(root, '.local', 'news-translator-venv', 'bin', 'python'),
    );
    expect(newsTranslatorPython('win32')).toBe(
      join(root, '.local', 'news-translator-venv', 'Scripts', 'python.exe'),
    );
  });
  it('exige trois phrases pour chaque synthèse éditoriale, sans publier un titre brut non relu', () => {
    const segmenter = new Intl.Segmenter('fr', { granularity: 'sentence' });
    for (const record of Object.values(NEWS_EDITORIAL)) {
      expect(record.title.length).toBeLessThanOrEqual(200);
      expect(record.sentences).toHaveLength(3);
      for (const sentence of record.sentences) {
        expect([...segmenter.segment(sentence)]).toHaveLength(1);
        expect(sentence).toMatch(/[.!?]$/);
      }
    }
    const unreviewed = parseNewsArticle(html, `${url}-unknown`, media);
    if (!unreviewed) throw new Error('Article collecté attendu');
    expect(selectNews([unreviewed], {}).total).toBe(0);
    expect(newsSentence(unreviewed)).toBe('');
  });
  it('traduit les 28 titres et synthèses dans les quatre langues de la page', () => {
    const locales = ['fr-FR', 'en', 'es-ES', 'de-DE'];
    expect(Object.keys(NEWS_EDITORIAL_TRANSLATIONS).sort()).toEqual(
      Object.keys(NEWS_EDITORIAL).sort(),
    );
    for (const [path, record] of Object.entries(NEWS_EDITORIAL)) {
      const item = applyNewsEditorial({
        id: path,
        project: media.name,
        repository: new URL(url).hostname,
        version: 'article',
        url: `https://${new URL(url).hostname}${path}`,
        publishedAt: '2026-10-18',
        category: record.category,
        prerelease: false,
        kind: 'article',
        headline: 'Original publisher headline',
      });
      for (const locale of locales) {
        const title = newsSentence(item, locale);
        const sentences = newsSynopsis(item, locale);
        expect(title, `${locale} title for ${path}`).toBeTruthy();
        expect(title.length, `${locale} title length for ${path}`).toBeLessThanOrEqual(200);
        expect(title).not.toBe('Original publisher headline');
        expect(sentences, `${locale} summary for ${path}`).toHaveLength(3);
        const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
        for (const sentence of sentences) {
          expect([...segmenter.segment(sentence)], `${locale}: ${sentence}`).toHaveLength(1);
          expect(sentence).toMatch(/[.!?]$/);
        }
      }
    }
  });
  it('traduit des brèves de longueurs différentes et reprend seulement la langue en échec', async () => {
    const editorial = Object.fromEntries(
      [1, 2].map((count) => [
        `https://www.therundown.ai/articles/brief-${count}`,
        {
          title: `Un modèle ouvert numéro ${count}`,
          sentences: ['Le modèle est disponible.', 'Les poids sont publiés.'].slice(0, count),
          category: 'models' as const,
        },
      ]),
    );
    const items = Object.entries(editorial).map(([url, record]) => ({
      id: url,
      project: 'The Rundown AI',
      repository: 'therundown.ai',
      version: 'article',
      url,
      publishedAt: '2026-10-21',
      category: record.category,
      prerelease: false,
      kind: 'article' as const,
    }));
    const translated = await translateNewsEditorialItems(
      items,
      async (texts, locale) => texts.map((text) => `${locale}: ${text}`),
      editorial,
      {},
    );
    expect(translated.map((item) => item.synopses?.['en']?.length)).toEqual([1, 2]);
    const partial = await translateNewsEditorialItems(
      items,
      async (texts, locale) => {
        if (locale === 'es-ES') throw new Error('Indisponible');
        return texts.map((text) => `${locale}: ${text}`);
      },
      editorial,
      {},
      undefined,
      true,
    );
    expect(partial[0]?.titles?.['en']).toBeTruthy();
    expect(partial[0]?.titles?.['es-ES']).toBeUndefined();
    expect(partial[0]?.titles?.['de-DE']).toBeTruthy();
    const retry = vi.fn(async (texts: readonly string[], locale: string) =>
      texts.map((text) => `${locale}: ${text}`),
    );
    const completed = await translateNewsEditorialItems(
      partial,
      retry,
      editorial,
      {},
      undefined,
      true,
    );
    expect(retry.mock.calls.map((call) => call[1])).toEqual(['es-ES', 'es-ES']);
    expect(newsEditorialTranslationsComplete(completed, editorial)).toBe(true);
  });
  it('génère les traductions manquantes au rafraîchissement et les invalide si le texte français change', async () => {
    const path = '/articles/automatic-translation-case';
    const editorial = {
      [path]: {
        title: 'A new benchmark compares small AI models.',
        sentences: [
          'The research compares three models on a public dataset.',
          'Its results apply to the tasks and hardware included in the study.',
          'The authors publish the code and evaluation data alongside the paper.',
        ] as [string, string, string],
        category: 'research' as const,
      },
    };
    const item = {
      id: 'test:auto-translation',
      project: media.name,
      repository: new URL(url).hostname,
      version: 'article',
      url: `https://${new URL(url).hostname}${path}`,
      publishedAt: '2026-10-18',
      category: 'research' as const,
      prerelease: false,
      kind: 'article' as const,
      headline: 'A new benchmark compares small AI models.',
    };
    const translate = vi.fn(async (texts: readonly string[], locale: string) =>
      texts.map((text) => `${locale}: ${text}`),
    );

    const translated = await translateNewsEditorialItems([item], translate, editorial, {});
    expect(translate).toHaveBeenCalledTimes(3);
    expect(newsEditorialTranslationsComplete(translated, editorial)).toBe(true);
    expect(translated[0]?.titles?.['en']).toBe('en: A new benchmark compares small AI models.');
    expect(translated[0]?.synopses?.['es-ES']).toHaveLength(3);
    expect(translated[0]?.editorialSourceHash).toMatch(/^[a-f0-9]{64}$/);

    await translateNewsEditorialItems(translated, translate, editorial, {});
    expect(translate).toHaveBeenCalledTimes(3);

    const updatedEditorial = {
      [path]: {
        ...editorial[path],
        title: 'A new benchmark compares open AI models.',
      },
    };
    const refreshed = await translateNewsEditorialItems(
      translated,
      translate,
      updatedEditorial,
      {},
    );
    expect(translate).toHaveBeenCalledTimes(6);
    expect(refreshed[0]?.titles?.['en']).toBe('en: A new benchmark compares open AI models.');
    expect(refreshed[0]?.editorialSourceHash).not.toBe(translated[0]?.editorialSourceHash);
  });
  it('ne marque pas prête une traduction vide ou restée en français', async () => {
    const path = '/articles/invalid-automatic-translation-case';
    const editorial = {
      [path]: {
        title: 'A new AI model is available.',
        sentences: [
          'The company released the model today.',
          'The model supports two languages.',
          'Its weights are available under an open licence.',
        ] as [string, string, string],
        category: 'models' as const,
      },
    };
    const item = {
      id: 'test:invalid-translation',
      project: media.name,
      repository: new URL(url).hostname,
      version: 'article',
      url: `https://${new URL(url).hostname}${path}`,
      publishedAt: '2026-10-18',
      category: 'models' as const,
      prerelease: false,
      kind: 'article' as const,
      headline: 'A new AI model is available.',
    };
    await expect(
      translateNewsEditorialItems([item], async (texts) => texts.map(() => ''), editorial, {}),
    ).rejects.toThrow('Traduction News invalide');
    await expect(
      translateNewsEditorialItems([item], async (texts) => [...texts], editorial, {}),
    ).rejects.toThrow('Traduction News inchangée');
  });
  it('sert les textes localisés dans la recherche, le rendu et les données structurées', () => {
    const article = parseNewsArticle(html, url, media);
    if (!article) throw new Error('Article attendu');
    const localized = applyNewsEditorial(article);
    expect(selectNews([article], { locale: 'en' }).total).toBe(0);
    expect(selectNews([localized], { locale: 'en', query: 'return on investment' }).total).toBe(1);
    expect(selectNews([localized], { locale: 'en', query: 'Wharton' }).total).toBe(1);
    const markup = renderToStaticMarkup(
      createElement(NewsScreen, {
        initialFeed: { checkedAt: null, sources: [], items: [localized] },
        locale: 'en',
        canonicalUrl: 'https://sandbox.example/en/news',
      }),
    );
    expect(markup).toContain('AI news');
    expect(markup).toContain(
      'Enterprise AI: why productivity gains alone do not prove a return on investment.',
    );
    expect(markup).toContain('A Wharton and GBK Collective study examines AI adoption');
    expect(markup).not.toContain('Une étude de Wharton');
    const data = newsCollectionLd([localized], 'https://sandbox.example/en/news', 'AI news', 'en');
    expect(JSON.stringify(data)).toContain(
      'Enterprise AI: why productivity gains alone do not prove a return on investment.',
    );
    expect(JSON.stringify(data)).not.toContain('IA en entreprise');
  });
  it('rend la synthèse complète dans un volet natif fermé, avec lien vers le média et sans préfixe source', () => {
    const article = parseNewsArticle(html, url, media);
    if (!article) throw new Error('Article attendu');
    const markup = renderToStaticMarkup(
      createElement(NewsScreen, {
        initialFeed: { checkedAt: null, sources: [], items: [article] },
        canonicalUrl: 'https://sandbox.example/news',
      }),
    );
    const row = markup.slice(markup.indexOf('<li>'), markup.indexOf('</li>'));
    expect(row).toMatch(/<details[^>]*><summary/);
    expect(row).not.toMatch(/<details[^>]*\bopen\b/);
    expect(row).toContain(newsSynopsis(article).join(' ').replaceAll("'", '&#x27;'));
    expect(row).toContain(`href="${url}"`);
    expect(row).toContain('Lire l&#x27;article');
    const trigger = row.slice(row.indexOf('<summary'), row.indexOf('</summary>'));
    expect(trigger).not.toContain(media.name);
    expect(trigger).not.toContain(article.headline);
  });
  it('décrit une collection de liens externes sans revendiquer les articles ni inventer une date de mise à jour', () => {
    const article = parseNewsArticle(html, url, media);
    if (!article) throw new Error('Article attendu');
    const data = newsCollectionLd([article], 'https://sandbox.example/news', 'Actualité IA.');
    expect(data).toMatchObject({
      '@graph': [
        {
          '@type': 'CollectionPage',
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: 1,
            itemListElement: [
              {
                position: 1,
                item: {
                  '@type': 'CreativeWork',
                  url,
                  name: newsSentence(article),
                  abstract: newsSynopsis(article).join(' '),
                  datePublished: article.publishedAt,
                  publisher: { name: media.name },
                },
              },
            ],
          },
        },
        { '@type': 'BreadcrumbList' },
      ],
    });
    expect(JSON.stringify(data)).not.toContain('NewsArticle');
    expect(JSON.stringify(data)).not.toContain('dateModified');
  });
  it.each(['fr-FR', 'en', 'es-ES', 'de-DE'])(
    'garde une canonique cohérente et le noindex de prévisualisation en %s',
    (locale) => {
      const metadata = newsPageMetadata(locale);
      expect(metadata.alternates?.canonical).toBe(
        locale === 'fr-FR' ? '/news' : `/${locale.toLowerCase()}/news`,
      );
      expect(metadata.robots).toMatchObject({ index: false, follow: true });
      expect(metadata.alternates?.languages).toBeUndefined();
      expect(metadata.description).toBeTruthy();
    },
  );
  it.each(['fr-FR', 'en', 'es-ES', 'de-DE'])(
    'ouvre les métadonnées et les variantes hreflang en production pour %s',
    (locale) => {
      vi.stubEnv('SANDBOX_NEWS_PUBLIC', '1');
      const metadata = newsPageMetadata(locale);
      expect(metadata.robots).toMatchObject({ index: true, follow: true });
      expect(metadata.alternates?.languages).toBeDefined();
      expect(metadata.alternates?.canonical).toBe(
        locale === 'fr-FR' ? '/news' : `/${locale.toLowerCase()}/news`,
      );
    },
  );
  it.each([
    ['en', 'en', 'AI news for tech teams: announcements and sources'],
    ['es-ES', 'es-es', 'Actualidad de IA para equipos de tecnología: anuncios y fuentes'],
    ['de-DE', 'de-de', 'KI-Nachrichten für Tech-Teams: Ankündigungen und Quellen'],
  ])(
    'sert les métadonnées de la bonne langue pour /%s/news',
    async (locale, routeLocale, title) => {
      const metadata = await localizedRouteMetadata({
        params: Promise.resolve({ locale: routeLocale, path: ['news'] }),
        searchParams: Promise.resolve({}),
      });
      expect(metadata.title).toBe(title);
      expect(metadata.description).toBeTruthy();
      expect(metadata.alternates?.canonical).toContain(`/${routeLocale}/news`);
      expect(metadata.robots).toMatchObject({ index: false, follow: true });
    },
  );
  it('préserve les apostrophes des titres et sépare les blocs HTML', () => {
    const article = parseNewsArticle(
      `<meta property="og:title" content="Apple's tool"><meta property="article:published_time" content="2026-10-16T12:00:00Z">`,
      url,
      media,
    );
    expect(article?.headline).toBe("Apple's tool");
    expect(newsPlainText('<div>Une phrase</div><div>October 16, 2026</div>')).toBe(
      'Une phrase October 16, 2026',
    );
  });
  it('préfère la publication à une date de modification plus récente', () => {
    const article = parseNewsArticle(
      `${html}<meta property="article:modified_time" content="2026-10-18T12:00:00Z">`,
      url,
      media,
    );
    expect(article?.publishedAt).toContain('2026-10-16');
  });
  it('ignore un article sans publication datée, même avec une modification ou une date serveur', () => {
    expect(
      parseNewsArticle(
        '<meta property="og:title" content="Titre"><meta property="article:modified_time" content="2026-10-18T12:00:00Z">',
        url,
        media,
      ),
    ).toBeUndefined();
  });
  it('conserve une précision au jour et ne fabrique pas minuit comme heure de publication', () => {
    const tldr = NEWS_MEDIA[3];
    const article = parseNewsArticle(
      '<meta property="og:title" content="Actualité technique"><h1>TLDR AI 2026-10-16</h1>',
      'https://tldr.tech/ai/2026-10-16',
      tldr,
    );
    expect(article?.publishedAt).toBe('2026-10-16');
    if (!article) throw new Error('Article attendu');
    const markup = renderToStaticMarkup(
      createElement(NewsScreen, {
        initialFeed: { checkedAt: null, sources: [], items: [article] },
      }),
    );
    expect(markup).toContain('heure non publiée');
    expect(markup).not.toContain('00:00');
  });
  it('extrait la date de la carte correspondante sans utiliser celle des autres articles', () => {
    const aiReport = NEWS_MEDIA[7];
    const links = discoverNewsArticles(
      '<a href="/newsletter/story"><h2>Story</h2><div>October 16, 2026</div></a><a href="/newsletter/other"><div>October 18, 2026</div></a>',
      aiReport,
    );
    expect(links.find((link) => link.url.endsWith('/story'))?.date).toBe('2026-10-16');
    expect(links.find((link) => link.url.endsWith('/other'))?.date).toBe('2026-10-18');
  });
  it('ne visite ni domaine tiers, ni lien authentifié, ni archive hors du chemin prévu', () => {
    const links = discoverNewsArticles(
      '<a href="https://evil.example/articles/a">Article</a><a href="https://user:pass@www.thedeepview.com/articles/a">Compte</a><a href="/articles/good?utm_source=test#section">Article</a><a href="/login">Login</a>',
      media,
    );
    expect(links.map((link) => link.url)).toEqual([`${media.url}articles/good`]);
    expect(parseNewsArticle(html, 'https://evil.example/articles/story', media)).toBeUndefined();
    expect(
      newsItemSchema.safeParse({
        ...parseNewsArticle(html, url, media),
        url: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
  });
  it('combine recherche originale, média et discipline', () => {
    const article = parseNewsArticle(html, url, media);
    if (!article) throw new Error('Article attendu');
    expect(
      selectNews([article], { source: media.name, category: 'business', query: 'efficiency' })
        .total,
    ).toBe(1);
    expect(selectNews([article], { source: 'TLDR AI' }).total).toBe(0);
  });
  it('alterne les médias dans le fil diversifié avant de reprendre une deuxième publication', () => {
    const article = parseNewsArticle(html, url, media);
    if (!article) throw new Error('Article attendu');
    const second = {
      ...article,
      id: 'second',
      url: `${url}-second`,
      publishedAt: '2026-10-16T18:00:00Z',
    };
    const other = {
      ...article,
      id: 'other',
      project: 'Superhuman AI',
      url: 'https://www.superhuman.ai/p/robotics',
      publishedAt: '2026-10-15T14:00:00Z',
      category: 'uses' as const,
    };
    expect(
      selectNews([article, second, other], { order: 'balanced' }).items.map((item) => item.id),
    ).toEqual([article.id, 'other', 'second']);
    expect(
      selectNews([article, second, other], { order: 'recent' }).items.map((item) => item.id),
    ).toEqual([article.id, 'second', 'other']);
  });
  it('garde les articles en cas de panne, retire les releases et borne la concurrence à quatre requêtes', async () => {
    const article = parseNewsArticle(html, url, media);
    if (!article) throw new Error('Article attendu');
    let inFlight = 0;
    let peak = 0;
    const transport = vi.fn<typeof fetch>().mockImplementation(async (_input, options) => {
      expect(options?.redirect).toBe('manual');
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return new Response(null, { status: 403 });
    });
    const feed = await collectMediaNewsPreview(
      {
        checkedAt: null,
        sources: [],
        items: [
          article,
          {
            ...article,
            id: 'old',
            kind: undefined,
            url: 'https://github.com/openai/codex/releases/tag/v1',
          },
        ],
      },
      transport,
      new Date('2026-10-18T12:00:00Z'),
    );
    expect(peak).toBeLessThanOrEqual(4);
    expect(transport).toHaveBeenCalledTimes(NEWS_MEDIA.length);
    expect(feed.sources.every((source) => !source.ok)).toBe(true);
    expect(feed.sources.find((source) => source.name === NEWS_MEDIA[0].name)?.reason).toBe(
      'HTTP 403',
    );
    expect(feed.items).toEqual([applyNewsEditorial(article)]);
  });
  it('applique une correction éditoriale au cache même si le média devient indisponible', async () => {
    const article = parseNewsArticle(html, url, media);
    if (!article) throw new Error('Article attendu');
    const feed = await collectMediaNewsPreview(
      {
        checkedAt: null,
        sources: [],
        items: [{ ...article, titles: undefined, synopses: undefined }],
      },
      vi.fn<typeof fetch>().mockRejectedValue(new Error('Hors ligne')),
      new Date('2026-10-18T12:00:00Z'),
    );
    expect(selectNews(feed.items, {}).items).toEqual([applyNewsEditorial(article)]);
  });
  it('collecte une vraie réponse HTML simulée et exclut les publications futures', async () => {
    const transport = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const requested = input instanceof Request ? input.url : input.toString();
      if (requested === media.url) return new Response(`<a href="${url}">L'article</a>`);
      if (requested === url) return new Response(html);
      return new Response(null, { status: 404 });
    });
    const feed = await collectMediaNewsPreview(
      { checkedAt: null, sources: [], items: [] },
      transport,
      new Date('2026-10-17T12:00:00Z'),
    );
    expect(feed.items).toHaveLength(1);
    expect(feed.sources.find((source) => source.name === media.name)?.ok).toBe(true);
    const future = await collectMediaNewsPreview(
      { checkedAt: null, sources: [], items: [] },
      transport,
      new Date('2026-10-15T12:00:00Z'),
    );
    expect(future.items).toHaveLength(0);
  });
  it('retente une erreur serveur temporaire sans conserver le média en échec', async () => {
    let attempts = 0;
    const transport = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const requested = input instanceof Request ? input.url : input.toString();
      if (requested === media.url) {
        attempts += 1;
        return attempts === 1
          ? new Response(null, { status: 503 })
          : new Response(`<a href="${url}">Article</a>`);
      }
      return requested === url ? new Response(html) : new Response(null, { status: 403 });
    });
    const feed = await collectMediaNewsPreview(
      { checkedAt: null, sources: [], items: [] },
      transport,
      new Date('2026-10-18T12:00:00Z'),
    );
    expect(attempts).toBe(2);
    expect(feed.sources.find((source) => source.name === media.name)?.ok).toBe(true);
    expect(feed.items).toHaveLength(1);
    expect(transport.mock.calls.filter(([input]) => input === NEWS_MEDIA[0].url)).toHaveLength(1);
  });
  it('affiche des libellés de formulaire visibles et les dix sources pour filtrer', () => {
    const markup = renderToStaticMarkup(
      createElement(NewsScreen, { initialFeed: { checkedAt: null, sources: [], items: [] } }),
    );
    expect(markup).toMatch(/fieldLabel[^>]*>Rechercher une actualité/);
    expect(markup).toContain('Tous les médias');
    expect(markup).toContain('There&#x27;s An AI For That');
    expect(markup).toContain('Usages et outils');
    expect(markup).toContain('Entreprises');
  });
});
