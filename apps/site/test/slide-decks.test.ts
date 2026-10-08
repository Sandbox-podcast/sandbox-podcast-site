import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { extractSlideTitle, listSlideDecks, slidesPublicRoot } from '../src/domain/slide-decks';
import {
  SLIDES_HOST,
  subdomainRedirectRules,
  subdomainRewriteRules,
} from '../src/domain/subdomain-routing';

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('slide decks', () => {
  it('extrait le titre HTML ou retombe sur le slug', () => {
    expect(extractSlideTitle('<title>Sandbox — épisode 043</title>', 'episode-043')).toBe(
      'Sandbox — épisode 043',
    );
    expect(extractSlideTitle('<html></html>', 'episode-043')).toBe('episode-043');
  });

  it('liste les dossiers qui contiennent un index.html', () => {
    const root = mkdtempSync(join(tmpdir(), 'slides-'));
    temps.push(root);
    mkdirSync(join(root, 'episode-043'));
    mkdirSync(join(root, 'episode-044'));
    mkdirSync(join(root, 'draft-empty'));
    writeFileSync(join(root, 'episode-044', 'index.html'), '<title>Épisode 044</title>');
    writeFileSync(join(root, 'episode-043', 'index.html'), '<title>Sandbox — épisode 043</title>');

    expect(listSlideDecks(root)).toEqual([
      {
        slug: 'episode-043',
        title: 'Sandbox — épisode 043',
        href: '/episode-043/',
      },
      {
        slug: 'episode-044',
        title: 'Épisode 044',
        href: '/episode-044/',
      },
    ]);
  });

  it('résout le dossier public/slides depuis la racine du site', () => {
    expect(slidesPublicRoot('/tmp/site').replace(/\\/g, '/')).toBe('/tmp/site/public/slides');
  });

  it('découvre le deck 043 du dépôt', () => {
    const decks = listSlideDecks(slidesPublicRoot(process.cwd()));
    expect(decks.some((deck) => deck.slug === 'episode-043')).toBe(true);
  });
});

describe('subdomain routing', () => {
  it('expose la racine slides vers la page d’index et les chemins vers /slides/', () => {
    expect(SLIDES_HOST).toBe('slides.sandboxpodcast.fr');
    expect(subdomainRewriteRules).toEqual([
      {
        source: '/',
        has: [{ type: 'host', value: SLIDES_HOST }],
        destination: '/presentations',
      },
      {
        source: '/:path+',
        has: [{ type: 'host', value: SLIDES_HOST }],
        destination: '/slides/:path+',
      },
    ]);
  });

  it('redirige un deck sans slash final vers le dossier', () => {
    expect(subdomainRedirectRules).toEqual([
      {
        source: '/:deck(episode-[^/.]+)',
        has: [{ type: 'host', value: SLIDES_HOST }],
        destination: '/:deck/',
        permanent: false,
      },
    ]);
  });
});
