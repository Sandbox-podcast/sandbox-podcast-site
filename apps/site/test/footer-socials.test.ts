import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Footer } from '../src/components/shell';

describe('réseaux du footer', () => {
  it('ajoute la page LinkedIn de Sandbox aux réseaux existants avec un lien externe et sa mesure', () => {
    const html = renderToStaticMarkup(createElement(Footer));
    const link =
      /<a\b[^>]*href="https:\/\/www\.linkedin\.com\/company\/sandbox-podcast-fr\/"[^>]*>/.exec(
        html,
      )?.[0];
    expect(link).toBeTruthy();
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener noreferrer"');
    expect(link).toContain('data-analytics-platform="linkedin"');
    expect(link).toContain('data-analytics-placement="footer"');
    expect(html).toContain('LinkedIn');
    for (const name of ['YouTube', 'Spotify', 'TikTok', 'Instagram', 'SandboxTalkShow'])
      expect(html).toContain(name);
  });
});
