import { describe, expect, it } from 'vitest';
import { parseSiteTheme, SITE_THEME_STORAGE_KEY, SITE_THEMES } from '../src/domain/theme.ts';

describe('thèmes du site', () => {
  it('reconnaît le thème rouge et retombe sur le bleu nuit pour une valeur inconnue', () => {
    expect(parseSiteTheme('red')).toBe('red');
    expect(parseSiteTheme('blue')).toBe('blue');
    expect(parseSiteTheme('dark')).toBe('blue');
    expect(parseSiteTheme(null)).toBe('blue');
  });

  it('expose les deux thèmes disponibles sous une clé de préférence dédiée', () => {
    expect(SITE_THEMES).toEqual(['blue', 'red']);
    expect(SITE_THEME_STORAGE_KEY).toBe('sandbox-theme');
  });
});
