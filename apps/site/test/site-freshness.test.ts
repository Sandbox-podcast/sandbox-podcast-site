import { describe, expect, it } from 'vitest';
import { latestSitePublication } from '../src/domain/site-freshness.ts';

describe('date de mise à jour du pied de page', () => {
  it('retient un épisode publié après le dernier classement', () => {
    expect(
      latestSitePublication('2026-10-06T07:00:00.000Z', [
        { publishedAt: '2026-10-12T10:00:00.000Z' },
      ]),
    ).toBe('2026-10-12T10:00:00.000Z');
  });

  it('conserve la date du classement quand elle est plus récente', () => {
    expect(
      latestSitePublication('2026-10-13T07:00:00.000Z', [
        { publishedAt: '2026-10-12T10:00:00.000Z' },
      ]),
    ).toBe('2026-10-13T07:00:00.000Z');
  });
});
