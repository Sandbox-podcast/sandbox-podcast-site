import { describe, expect, it } from 'vitest';
import { uniqueSitemapEntries } from '../src/domain/site-sitemap.ts';

describe('sitemap', () => {
  it('supprime les URL dupliquées tout en gardant le premier ordre et les métadonnées', () => {
    const entries = [
      { url: 'https://example.com/', priority: 1 },
      { url: 'https://example.com/en/charts', priority: 0.8 },
      { url: 'https://example.com/en/charts', priority: 0.6 },
    ];

    expect(uniqueSitemapEntries(entries)).toEqual(entries.slice(0, 2));
  });
});
