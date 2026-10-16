import { z } from 'zod';

export type AnalyticsConsent = 'accepted' | 'rejected';

export const analyticsConsentStorageKey = 'sandbox.analytics-consent.v2';
export const legacyAnalyticsConsentStorageKey = 'sandbox.analytics-consent.v1';
export const analyticsConsentLifetimeMs = 180 * 24 * 60 * 60 * 1000;
export const analyticsCookieLifetimeSeconds = analyticsConsentLifetimeMs / 1000;
export const defaultGoogleAnalyticsMeasurementId = 'G-45XWR4KJ1M';

const consentRecordSchema = z
  .object({
    version: z.literal(2),
    choice: z.enum(['accepted', 'rejected']),
    chosenAt: z.number().int().nonnegative(),
  })
  .strict();

export function analyticsConsentRecord(choice: AnalyticsConsent, now = Date.now()): string {
  return JSON.stringify(consentRecordSchema.parse({ version: 2, choice, chosenAt: now }));
}

export function readAnalyticsConsent(value: string | null, now = Date.now()) {
  if (!value) return null;
  try {
    const parsed = consentRecordSchema.safeParse(JSON.parse(value));
    if (!parsed.success || parsed.data.chosenAt > now) return null;
    const expiresAt = parsed.data.chosenAt + analyticsConsentLifetimeMs;
    return now < expiresAt ? { ...parsed.data, expiresAt } : null;
  } catch {
    return null;
  }
}

export function parseAnalyticsConsent(
  value: string | null,
  now = Date.now(),
): AnalyticsConsent | null {
  return readAnalyticsConsent(value, now)?.choice ?? null;
}

/** Activer seulement après contrôle du flux GA4, notamment de la mesure améliorée. */
export function googleAnalyticsReady(value: string | undefined): boolean {
  return value === 'true';
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

export function analyticsPageTitle(pathname: string, title: string): string {
  return /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/search\/?$/.test(pathname)
    ? 'Sandbox · Recherche'
    : title;
}

/** Le script Vercel peut survivre à son composant : le choix est relu à chaque envoi. */
export function filterAnalyticsEvent<T extends { url: string }>(
  event: T,
  consent: AnalyticsConsent | null,
): T | null {
  if (consent !== 'accepted') return null;
  try {
    const url = new URL(event.url);
    if (!['https:', 'http:'].includes(url.protocol) || isAdminAnalyticsPath(url.pathname))
      return null;
    return { ...event, url: analyticsPageLocation(event.url) };
  } catch {
    return null;
  }
}
