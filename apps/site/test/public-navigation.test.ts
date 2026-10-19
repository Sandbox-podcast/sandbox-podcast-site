import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MainNav, LocaleSwitcher, MobileNav } from '../src/components/nav.tsx';
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
  it('annonce News dans les menus et le footer seulement quand le fil est disponible', () => {
    for (const component of [MainNav, MobileNav, Masthead, Footer]) {
      expect(
        renderToStaticMarkup(createElement(component, { newsAvailable: false })),
      ).not.toContain('href="/news"');
      expect(renderToStaticMarkup(createElement(component, { newsAvailable: true }))).toContain(
        'href="/news"',
      );
    }
  });
  it('présente le podcast en premier et garde les contenus accessibles dans le menu mobile', () => {
    const html = renderToStaticMarkup(createElement(MobileNav));
    expect(html).toContain('<summary class="mobile-menu-trigger">Menu');
    expect(html.indexOf('href="/podcast"')).toBeLessThan(html.indexOf('href="/charts"'));
    for (const path of ['/charts', '/podcast', '/time-machine', '/nos-projets', '/search'])
      expect(html).toContain(`href="${path}"`);
    expect(html).not.toContain('href="/about"');
    expect(renderToStaticMarkup(createElement(Footer))).toContain('href="/about"');
  });
  it('garde la ressource courante lorsque la langue change', () => {
    expect(localizedHref('/topics/ai?q=agent#top', 'en')).toBe('/en/topics/ai?q=agent#top');
    expect(localizedHref('/en/charts/github', 'fr-FR')).toBe('/charts/github');
  });

  it('ouvre directement le podcast sans sous-menu', async () => {
    const html = renderToStaticMarkup(createElement(MainNav));
    const podcastLink = /<a\b[^>]*href="\/podcast"[^>]*>/.exec(html)?.[0];
    expect(podcastLink).toContain('aria-current="page"');
    expect(html).toContain('href="/podcast"');
    expect(html).not.toContain('href="/topics"');
    expect(html).not.toContain('nav-submenu');
    expect(html).toContain('href="/charts"');
    expect(html).toContain('href="/time-machine"');
    expect(html).toContain('href="/nos-projets"');

    const english = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary: await siteDictionary('en'),
        children: createElement(MainNav, { locale: 'en' }),
      }),
    );
    expect(english).toContain('href="/en/podcast"');
    expect(english).toContain('href="/en/nos-projets"');
    expect(english).not.toContain('href="/en/time-machine"');
    expect(english).toContain('The Talk Show');
    expect(english).not.toContain('Topics');
  });

  it('garde le choix de langue visible sur la page podcast', () => {
    const html = renderToStaticMarkup(createElement(LocaleSwitcher));
    expect(html).toContain('aria-label="Changer de langue');
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it('ne propose pas de variantes inexistantes de Time Machine', () => {
    navigation.pathname = '/time-machine';
    expect(renderToStaticMarkup(createElement(LocaleSwitcher))).toBe('');
    const html = renderToStaticMarkup(createElement(MainNav));
    const link = /<a\b[^>]*href="\/time-machine"[^>]*>/.exec(html)?.[0];
    expect(link).toContain('aria-current="page"');
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
    expect(footer).toContain('https://www.youtube.com/@SandboxFR');
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
