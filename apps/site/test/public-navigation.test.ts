import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleSwitcher } from '../src/components/nav.tsx';
import { Footer, Masthead } from '../src/components/shell.tsx';
import { LocalizationProvider } from '../src/components/localization.tsx';
import { siteDictionary } from '../src/i18n/dictionaries.ts';
import { localizedHref } from '../src/i18n/routing.ts';

const navigation = vi.hoisted(() => ({ pathname: '/podcast' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));
afterEach(() => {
  navigation.pathname = '/podcast';
});

describe('navigation publique', () => {
  it('garde la ressource courante lorsque la langue change', () => {
    expect(localizedHref('/topics/ai?q=agent#top', 'en')).toBe('/en/topics/ai?q=agent#top');
    expect(localizedHref('/en/charts/github', 'fr-FR')).toBe('/charts/github');
  });

  it('garde le choix de langue visible sur la page podcast', () => {
    const html = renderToStaticMarkup(createElement(LocaleSwitcher));
    expect(html).toContain('aria-label="Changer de langue');
    expect(html).toContain('aria-haspopup="dialog"');
  });
});

describe('identité et contrôles communs', () => {
  it.each([
    ['fr-FR', '/', 'Accueil Sandbox', 'Menu'],
    ['en', '/en', 'Sandbox home', 'Menu'],
    ['es-ES', '/es-es', 'Inicio de Sandbox', 'Menú'],
    ['de-DE', '/de-de', 'Sandbox-Startseite', 'Menü'],
  ])('rend les deux logos et le menu dans la langue %s', async (locale, href, name, menu) => {
    const dictionary = await siteDictionary(locale);
    const renderLocalized = (component: typeof Masthead | typeof Footer) =>
      renderToStaticMarkup(
        createElement(LocalizationProvider, {
          locale,
          dictionary,
          children: createElement(component, { locale }),
        }),
      );
    for (const component of [Masthead, Footer]) {
      const html = renderLocalized(component);
      const home = /<a\b[^>]*class="site-home-link[^>]*>/.exec(html)?.[0];
      expect(home).toContain(`href="${href}"`);
      expect(home).toContain(`aria-label="${name}"`);
      expect(html).toContain('sandbox-logo.png');
    }
    expect(renderLocalized(Masthead)).toContain(`<summary class="mobile-menu-trigger">${menu}`);
    const footer = renderLocalized(Footer);
    expect(footer.match(/<details class="footer-navigation-mobile">/g)).toHaveLength(2);
    expect(footer).toContain(`href="${href === '/' ? '' : href}/confidentialite"`);
  });

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
    expect(footer).toContain('https://www.youtube.com/@SandboxFR?sub_confirmation=1');
    expect(footer).toContain('https://open.spotify.com/');
    expect(footer).toContain('https://x.com/SandboxTalkShow');
    expect(footer).toContain('https://www.tiktok.com/@sandbox.talkshow');
    expect(footer).toContain('https://www.instagram.com/Sandbox.TalkShow/');
    expect(footer).toContain('data-analytics-platform="spotify"');
    expect(header).not.toContain('Podcasts &amp; classements IA');
    expect(footer).not.toContain('Podcasts &amp; classements IA');
    expect(header).not.toContain('theme-picker');
    expect(footer).not.toContain('theme-picker');
  });
});
