export type AnalyticsConsent = 'accepted' | 'rejected';

export const analyticsConsentStorageKey = 'sandbox.analytics-consent.v1';
export const defaultGoogleAnalyticsMeasurementId = 'G-45XWR4KJ1M';

export function parseAnalyticsConsent(value: string | null): AnalyticsConsent | null {
  return value === 'accepted' || value === 'rejected' ? value : null;
}

export function googleAnalyticsMeasurementId(value: string | undefined): string | undefined {
  const measurementId = value?.trim();
  return measurementId && /^G-[A-Z0-9]+$/.test(measurementId) ? measurementId : undefined;
}

export function analyticsPageLocation(value: string): string {
  const url = new URL(value);
  return `${url.origin}${url.pathname}`;
}

export function analyticsPageReferrer(value: string): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

export function isAdminAnalyticsPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}
