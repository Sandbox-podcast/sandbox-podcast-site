import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LocalizedNotFound, { metadata } from '../src/app/[locale]/not-found.tsx';
import { LocalizationProvider } from '../src/components/localization';
import english from '../src/i18n/dictionaries/en.json';

describe('404 des routes localisées', () => {
  it('reprend la page commune dans la langue du contexte, sans props de route', () => {
    const french = renderToStaticMarkup(createElement(LocalizedNotFound));
    expect(french).toContain('Cette page est introuvable.');
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary: english,
        children: createElement(LocalizedNotFound),
      }),
    );
    expect(html).toContain(english['Cette page est introuvable.']);
    expect(html).toContain('href="/en/episodes"');
    expect(html).not.toContain('href="/episodes"');
  });

  it('empêche l’indexation de la page 404', () => {
    expect(metadata).toMatchObject({ robots: { index: false, follow: true } });
  });
});
