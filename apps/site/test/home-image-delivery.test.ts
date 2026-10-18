import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DiscoveryHome } from '../src/components/discovery-home';
import { Wordmark } from '../src/components/shell';

function imageFor(html: string, path: string): string {
  const image = [...html.matchAll(/<img\b[^>]*>/g)].find((match) =>
    match[0].includes(encodeURIComponent(path)),
  )?.[0];
  if (!image) throw new Error(`Image absente : ${path}`);
  return image;
}

describe('images livrées au navigateur', () => {
  it('charge le visuel LCP mobile en priorité et sélectionne un pixel local quand il est masqué', () => {
    const html = renderToStaticMarkup(
      createElement(DiscoveryHome, { episodes: [], videoClubEnabled: true }),
    );
    const image = imageFor(html, '/video-club/entrance-cinematic-v2.webp');
    expect(image).toContain('loading="eager"');
    expect(image).toContain('fetchPriority="high"');
    expect(html).toContain(
      '<picture><source media="(min-width: 901px) and (min-height: 541px), (min-width: 1101px)" srcSet="data:image/gif;base64,',
    );
    expect(
      [...html.matchAll(/<link\b[^>]*>/g)].some((match) =>
        match[0].includes(encodeURIComponent('/video-club/entrance-cinematic-v2.webp')),
      ),
    ).toBe(false);
    expect(image).toContain('q=75');
    expect(image).not.toContain('loading="lazy"');
  });

  it("n'ajoute pas le vidéoclub quand il est désactivé", () => {
    const html = renderToStaticMarkup(
      createElement(DiscoveryHome, { episodes: [], videoClubEnabled: false }),
    );
    expect(html).not.toContain(encodeURIComponent('/video-club/entrance-cinematic-v2.webp'));
  });

  it('propose un srcset responsive au lieu du seul grand logo à densité fixe', () => {
    const html = renderToStaticMarkup(createElement(Wordmark));
    const image = imageFor(html, '/sandbox-logo.png');
    expect(image).toContain('sizes="252px"');
    expect(image).toContain('256w');
    expect(image).not.toMatch(/srcSet="[^"]+ 1x"/);
    expect(image).toContain('width="2172" height="724"');
  });
});
