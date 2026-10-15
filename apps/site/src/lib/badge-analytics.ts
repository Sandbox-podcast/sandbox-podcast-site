import { analyticsConsentStorageKey, parseAnalyticsConsent } from './google-analytics.ts';

export type BadgeAnalyticsEvent =
  'badge_generator_open' | 'badge_preview' | 'badge_copy' | 'badge_share' | 'badge_visit';
export const BADGE_CAMPAIGNS = [
  'github_top_100',
  'rising_star',
  'github_category',
  'biggest_mover',
  'rookie_month',
  'skill_week',
  'best_model',
  'annual',
] as const;
export type BadgeCampaign = (typeof BADGE_CAMPAIGNS)[number];
/** Seuls le type de badge et le format sont mesurés, après consentement. */
export function recordBadgeEvent(
  event: BadgeAnalyticsEvent,
  badgeType: BadgeCampaign,
  format?: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    if (
      parseAnalyticsConsent(window.localStorage.getItem(analyticsConsentStorageKey)) !== 'accepted'
    )
      return;
    const analyticsWindow = window as Window & {
      gtag?: (command: 'event', event: string, parameters: Record<string, string>) => void;
    };
    analyticsWindow.gtag?.('event', event, {
      badge_type: badgeType,
      ...(format ? { format } : {}),
    });
  } catch {
    // Le blocage du stockage privé ne doit empêcher ni l'affichage ni la copie.
    return;
  }
}

export function badgeAttribution(value: string): BadgeCampaign | null {
  const url = new URL(value);
  if (
    !/^\/(?:en\/|es-es\/|de-de\/)?charts\/(?:project|entity)\/[a-z0-9-]+$/.test(url.pathname) ||
    url.searchParams.get('utm_source') !== 'sandbox_badge' ||
    url.searchParams.get('utm_medium') !== 'badge'
  )
    return null;
  const campaign = url.searchParams.get('utm_campaign');
  return BADGE_CAMPAIGNS.find((known) => known === campaign) ?? null;
}
