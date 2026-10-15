import { afterEach, describe, expect, it, vi } from 'vitest';
import { BADGE_CAMPAIGNS, badgeAttribution, recordBadgeEvent } from '../src/lib/badge-analytics.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});
describe('mesure consentie des badges', () => {
  it.each(BADGE_CAMPAIGNS)(
    'attribue une visite de fiche pour %s sans mesurer une image',
    (campaign) => {
      expect(
        badgeAttribution(
          `https://sandbox.test/en/charts/entity/test?utm_source=sandbox_badge&utm_medium=badge&utm_campaign=${campaign}`,
        ),
      ).toBe(campaign);
      expect(
        badgeAttribution(
          `https://sandbox.test/badges/awards/test.svg?utm_source=sandbox_badge&utm_medium=badge&utm_campaign=${campaign}`,
        ),
      ).toBeNull();
    },
  );
  it('ne mesure rien sans consentement et ne transmet que le type et le format', () => {
    const gtag = vi.fn();
    const getItem = vi.fn().mockReturnValue('rejected');
    vi.stubGlobal('window', { localStorage: { getItem }, gtag });
    recordBadgeEvent('badge_copy', 'github_top_100', 'markdown');
    expect(gtag).not.toHaveBeenCalled();
    getItem.mockReturnValue('accepted');
    recordBadgeEvent('badge_copy', 'github_top_100', 'markdown');
    expect(gtag).toHaveBeenCalledWith('event', 'badge_copy', {
      badge_type: 'github_top_100',
      format: 'markdown',
    });
  });
  it('ignore le stockage bloqué et valide strictement les liens attribués', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('Storage blocked');
        },
      },
    });
    expect(() => {
      recordBadgeEvent('badge_copy', 'rising_star');
    }).not.toThrow();
    expect(
      badgeAttribution(
        'https://sandbox.test/charts/project/demo?utm_source=sandbox_badge&utm_medium=badge&utm_campaign=rising_star',
      ),
    ).toBe('rising_star');
    expect(
      badgeAttribution(
        'https://sandbox.test/en/charts/project/demo?utm_source=sandbox_badge&utm_medium=badge&utm_campaign=github_top_100&token=secret',
      ),
    ).toBe('github_top_100');
    expect(
      badgeAttribution(
        'https://sandbox.test/admin?utm_source=sandbox_badge&utm_medium=badge&utm_campaign=rising_star',
      ),
    ).toBeNull();
    expect(
      badgeAttribution('https://sandbox.test/charts/project/demo?utm_source=unknown'),
    ).toBeNull();
  });
});
