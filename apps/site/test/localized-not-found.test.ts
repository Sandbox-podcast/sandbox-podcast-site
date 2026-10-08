import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LocalizedNotFound, { metadata } from '../src/app/[locale]/not-found.tsx';

describe('404 des routes localisées', () => {
  it('rend une réponse bilingue sans dépendre de props de route absentes', () => {
    const html = renderToStaticMarkup(createElement(LocalizedNotFound));
    expect(html).toContain('Cette page est introuvable.');
    expect(html).toContain('This page could not be found.');
    expect(html).toContain('AI rankings');
  });

  it('empêche l’indexation de la page 404', () => {
    expect(metadata).toMatchObject({ robots: { index: false, follow: true } });
  });
});
