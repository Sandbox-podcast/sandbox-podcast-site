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
  it('charge un seul décor responsive prioritaire sur ordinateur et sur mobile', () => {
    const html = renderToStaticMarkup(
      createElement(DiscoveryHome, { episodes: [], videoClubEnabled: true }),
    );
    const image = imageFor(html, '/images/home/studio-wide-lit-v6.webp');
    expect(image).toContain('loading="eager"');
    expect(image).toContain('fetchPriority="high"');
    expect(image).toContain('q=75');
    expect(image).toContain('max(100vw, 178vh)');
    expect(html).not.toContain('entrance-cinematic-v2.webp');
    expect(html).not.toContain('body-no-mic');
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
