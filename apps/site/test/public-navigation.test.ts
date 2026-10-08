import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MainNav, LocaleSwitcher } from '../src/components/nav.tsx';
import { Footer, Masthead } from '../src/components/shell.tsx';
import { languageSwitchTarget } from '../src/domain/site-navigation.ts';

vi.mock('next/navigation', () => ({ usePathname: () => '/topics' }));

describe('navigation publique', () => {
  it('garde une destination de langue valide depuis les familles de pages publiques', () => {
    expect(languageSwitchTarget('/episodes/43', 'fr-FR')).toBe('/en');
    expect(languageSwitchTarget('/topics/ai', 'fr-FR')).toBe('/en');
    expect(languageSwitchTarget('/charts/github/2026-W40', 'fr-FR')).toBe('/en/charts');
    expect(languageSwitchTarget('/projects/codex', 'fr-FR')).toBe('/en/charts');
    expect(languageSwitchTarget('/en/charts', 'en')).toBe('/charts');
    expect(languageSwitchTarget('/en/episodes/43', 'en')).toBe('/');
  });

  it('propose les épisodes et les thèmes sous Podcasts, avec la rubrique active', () => {
    const html = renderToStaticMarkup(createElement(MainNav));
    expect(html).toMatch(/<summary[^>]*aria-current="page"[^>]*>Podcasts/);
    expect(html).toContain('href="/episodes"');
    expect(html).toContain('href="/topics"');
    expect(html).toContain('href="/charts"');
    const english = renderToStaticMarkup(createElement(MainNav, { locale: 'en' }));
    expect(english).toContain('<summary');
    expect(english).toContain('All episodes (FR)');
    expect(english).toContain('Topics (FR)');
  });

  it('garde le choix de langue visible depuis une page de thème', () => {
    const html = renderToStaticMarkup(createElement(LocaleSwitcher));
    expect(html).toContain('href="/en"');
    expect(html).toContain('aria-label="English"');
  });
});

describe('identité et contrôles communs', () => {
  it('sert exactement le logotype fourni dans les deux zones', async () => {
    const logo = await readFile(new URL('../public/sandbox-logo.png', import.meta.url));
    expect(createHash('sha256').update(logo).digest('hex')).toBe(
      '14ac78552a5acf432dbc35fdca0fa2f3896d1531d1e6f61f5778616b691a4068',
    );
    expect(logo.readUInt32BE(16)).toBe(2172);
    expect(logo.readUInt32BE(20)).toBe(724);

    const header = renderToStaticMarkup(createElement(Masthead));
    const footer = renderToStaticMarkup(createElement(Footer));
    expect(header).toContain('sandbox-logo.png');
    expect(footer).toContain('sandbox-logo.png');
    expect(header).not.toContain('Podcasts &amp; classements IA');
    expect(footer).not.toContain('Podcasts &amp; classements IA');
    expect(header).not.toContain('theme-picker');
    expect(footer).not.toContain('theme-picker');
  });
});
