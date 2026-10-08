import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  extractSlideTitle,
  listSlideDecks,
  renderSlidesIndexHtml,
  slidesPublicRoot,
} from '../src/domain/slide-decks';
import {
  SLIDES_HOST,
  isSlidesHost,
  slidesBrowserRedirect,
  slidesRewriteDestination,
} from '../src/domain/subdomain-routing';

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('slide decks', () => {
  it('extrait le titre HTML ou retombe sur le slug', () => {
    expect(extractSlideTitle('<title>Sandbox — épisode 001</title>', 'episode-001')).toBe(
      'Sandbox — épisode 001',
    );
    expect(extractSlideTitle('<html></html>', 'episode-001')).toBe('episode-001');
  });

  it('liste les dossiers qui contiennent un index.html', () => {
    const root = mkdtempSync(join(tmpdir(), 'slides-'));
    temps.push(root);
    mkdirSync(join(root, 'episode-001'));
    mkdirSync(join(root, 'episode-044'));
    mkdirSync(join(root, 'draft-empty'));
    writeFileSync(join(root, 'episode-044', 'index.html'), '<title>Épisode 044</title>');
    writeFileSync(join(root, 'episode-001', 'index.html'), '<title>Sandbox — épisode 001</title>');

    expect(listSlideDecks(root)).toEqual([
      {
        slug: 'episode-001',
        title: 'Sandbox — épisode 001',
        href: './episode-001/index.html',
      },
      {
        slug: 'episode-044',
        title: 'Épisode 044',
        href: './episode-044/index.html',
      },
    ]);
  });

  it('rend une page d’index statique sans bundle Next', () => {
    const html = renderSlidesIndexHtml([
      {
        slug: 'episode-001',
        title: 'Sandbox — épisode 001',
        href: './episode-001/index.html',
      },
    ]);
    expect(html).toContain('<title>Présentations Sandbox</title>');
    expect(html).toContain('href="./episode-001/index.html"');
    expect(html).not.toContain('/_next/');
  });

  it('garde public/slides/index.html aligné avec les decks du dépôt', () => {
    const decks = listSlideDecks(slidesPublicRoot(process.cwd()));
    const actual = readFileSync(join(process.cwd(), 'public/slides/index.html'), 'utf8');
    expect(decks.length).toBeGreaterThan(0);
    expect(actual).not.toContain('/_next/');
    for (const deck of decks) {
      expect(actual).toContain(`href="${deck.href}"`);
      expect(actual).toContain(deck.title);
      expect(actual).toContain(deck.slug);
    }
  });
});

describe('subdomain routing', () => {
  it('reconnaît l’hôte slides', () => {
    expect(SLIDES_HOST).toBe('slides.sandboxpodcast.fr');
    expect(isSlidesHost('slides.sandboxpodcast.fr')).toBe(true);
    expect(isSlidesHost('www.sandboxpodcast.fr')).toBe(false);
  });

  it('canonise les decks vers index.html pour éviter la boucle de slash', () => {
    expect(slidesBrowserRedirect('/episode-001')).toBe('/episode-001/index.html');
    expect(slidesBrowserRedirect('/episode-001/')).toBe('/episode-001/index.html');
    expect(slidesBrowserRedirect('/episode-001/index.html')).toBeNull();
    expect(slidesBrowserRedirect('/')).toBeNull();
  });

  it('réécrit vers des fichiers index.html et préserve les assets', () => {
    expect(slidesRewriteDestination('/')).toBe('/slides/index.html');
    expect(slidesRewriteDestination('/episode-001/index.html')).toBe(
      '/slides/episode-001/index.html',
    );
    expect(slidesRewriteDestination('/episode-001/assets/logo.png')).toBe(
      '/slides/episode-001/assets/logo.png',
    );
    expect(slidesRewriteDestination('/slides/index.html')).toBeNull();
    expect(slidesRewriteDestination('/_next/static/chunk.js')).toBeNull();
  });
});
