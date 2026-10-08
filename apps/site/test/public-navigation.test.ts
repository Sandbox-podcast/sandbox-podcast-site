import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MainNav, LocaleSwitcher } from '../src/components/nav.tsx';
import { Footer, Masthead } from '../src/components/shell.tsx';
import { LocalizationProvider } from '../src/components/localization.tsx';
import { siteDictionary } from '../src/i18n/dictionaries.ts';
import { localizedHref } from '../src/i18n/routing.ts';

vi.mock('next/navigation', () => ({ usePathname: () => '/topics' }));

describe('navigation publique', () => {
  it('garde la ressource courante lorsque la langue change', () => {
    expect(localizedHref('/topics/ai?q=agent#top', 'en')).toBe('/en/topics/ai?q=agent#top');
    expect(localizedHref('/en/charts/github', 'fr-FR')).toBe('/charts/github');
  });

  it('propose les épisodes et les thèmes sous Podcasts', async () => {
    const html = renderToStaticMarkup(createElement(MainNav));
    expect(html).toMatch(/<summary[^>]*aria-current="page"[^>]*>Podcasts/);
    expect(html).toContain('href="/episodes"');
    expect(html).toContain('href="/topics"');
    expect(html).toContain('href="/charts"');

    const english = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary: await siteDictionary('en'),
        children: createElement(MainNav, { locale: 'en' }),
      }),
    );
    expect(english).toContain('href="/en/episodes"');
    expect(english).toContain('All episodes');
    expect(english).toContain('Topics');
  });

  it('garde le choix de langue visible sur une page de thème', () => {
    const html = renderToStaticMarkup(createElement(LocaleSwitcher));
    expect(html).toContain('aria-label="Changer de langue');
    expect(html).toContain('aria-haspopup="dialog"');
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
