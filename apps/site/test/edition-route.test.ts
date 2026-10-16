import { describe, expect, it } from 'vitest';
import { editionFromRoute } from '../src/domain/edition-route.ts';
import { matchSharedPage } from '../src/i18n/page-routes.ts';

describe("identifiants d'édition dans les routes Next", () => {
  it('préserve les archives anciennes et décode une fois les créneaux UTC', () => {
    for (const edition of ['2026-W41', '2026-10-10', '2026-10-14T00:00Z', '2026-10-14T12:00Z']) {
      expect(editionFromRoute(edition)).toBe(edition);
      expect(editionFromRoute(encodeURIComponent(edition))).toBe(edition);
    }
    expect(matchSharedPage('/charts/skills/2026-10-14T12%3A00Z')?.route).toBe(
      '/charts/:slug/:week',
    );
  });
  it('refuse les segments malformés, les chemins et les doubles encodages', () => {
    for (const invalid of [
      '%',
      '%2Fadmin',
      '2026-10-14T12%253A00Z',
      'methodology',
      '2026-10-14T13:00Z',
      '2026-02-31',
      '2026-02-31T12:00Z',
    ])
      expect(editionFromRoute(invalid)).toBeUndefined();
  });
});
