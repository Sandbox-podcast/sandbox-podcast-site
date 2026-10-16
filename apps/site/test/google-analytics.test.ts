import { describe, expect, it } from 'vitest';
import {
  analyticsPageLocation,
  analyticsPageReferrer,
  defaultGoogleAnalyticsMeasurementId,
  googleAnalyticsMeasurementId,
  googleAnalyticsReady,
  isAdminAnalyticsPath,
  parseAnalyticsConsent,
  analyticsConsentRecord,
  analyticsConsentLifetimeMs,
  readAnalyticsConsent,
  filterAnalyticsEvent,
  analyticsPageTitle,
} from '../src/lib/google-analytics.ts';

describe('configuration Google Analytics', () => {
  it('bloque le tag tant que le flux et la mesure améliorée ne sont pas validés', () => {
    for (const value of [undefined, '', 'false', 'TRUE', '1'])
      expect(googleAnalyticsReady(value)).toBe(false);
    expect(googleAnalyticsReady('true')).toBe(true);
  });

  it('accepte un identifiant GA4 et ignore une valeur absente ou mal formée', () => {
    expect(googleAnalyticsMeasurementId(' G-ABC123XYZ ')).toBe('G-ABC123XYZ');
    expect(googleAnalyticsMeasurementId('G-45XWR4KJ1M')).toBe('G-45XWR4KJ1M');
    expect(googleAnalyticsMeasurementId(defaultGoogleAnalyticsMeasurementId)).toBe('G-45XWR4KJ1M');
    expect(googleAnalyticsMeasurementId(undefined)).toBeUndefined();
    expect(googleAnalyticsMeasurementId('UA-123456')).toBeUndefined();
  });

  it('ne restaure que les choix datés, valides et non expirés', () => {
    const now = Date.UTC(2026, 9, 14);
    expect(parseAnalyticsConsent(analyticsConsentRecord('accepted', now), now)).toBe('accepted');
    expect(parseAnalyticsConsent(analyticsConsentRecord('rejected', now), now)).toBe('rejected');
    expect(parseAnalyticsConsent('accepted', now)).toBeNull();
    expect(parseAnalyticsConsent('rejected', now)).toBeNull();
    expect(
      parseAnalyticsConsent(
        analyticsConsentRecord('accepted', now),
        now + analyticsConsentLifetimeMs,
      ),
    ).toBeNull();
    expect(
      parseAnalyticsConsent(
        analyticsConsentRecord('rejected', now),
        now + analyticsConsentLifetimeMs,
      ),
    ).toBeNull();
    expect(parseAnalyticsConsent(analyticsConsentRecord('accepted', now + 1), now)).toBeNull();
    expect(readAnalyticsConsent(analyticsConsentRecord('accepted', now), now)?.expiresAt).toBe(
      now + analyticsConsentLifetimeMs,
    );
    expect(parseAnalyticsConsent('anything-else')).toBeNull();
    expect(parseAnalyticsConsent(null)).toBeNull();
  });

  it('bloque tout événement refusé ou retiré et exclut les pages administratives', () => {
    const event = {
      type: 'pageview',
      url: 'https://www.sandboxpodcast.fr/search?q=secret#results',
    };
    expect(filterAnalyticsEvent(event, null)).toBeNull();
    expect(filterAnalyticsEvent(event, 'rejected')).toBeNull();
    expect(filterAnalyticsEvent(event, 'accepted')).toEqual({
      type: 'pageview',
      url: 'https://www.sandboxpodcast.fr/search',
    });
    expect(
      filterAnalyticsEvent({ url: 'https://www.sandboxpodcast.fr/admin/users' }, 'accepted'),
    ).toBeNull();
    expect(filterAnalyticsEvent({ url: 'not a url' }, 'accepted')).toBeNull();
    expect(analyticsPageTitle('/search', 'Recherche : secret')).toBe('Sandbox · Recherche');
    expect(analyticsPageTitle('/en/search', 'Search : secret')).toBe('Sandbox · Recherche');
  });

  it('retire la requête et le fragment de l’URL de page envoyée', () => {
    expect(analyticsPageLocation('https://www.sandboxpodcast.fr/search?q=secret#results')).toBe(
      'https://www.sandboxpodcast.fr/search',
    );
  });

  it('retire également la requête et le fragment du référent', () => {
    expect(analyticsPageReferrer('https://example.com/path?token=private#top')).toBe(
      'https://example.com/path',
    );
    expect(analyticsPageReferrer('')).toBeUndefined();
    expect(analyticsPageReferrer('not a url')).toBeUndefined();
  });

  it('identifie uniquement la zone administration et ses sous-routes', () => {
    expect(isAdminAnalyticsPath('/admin')).toBe(true);
    expect(isAdminAnalyticsPath('/admin/episodes')).toBe(true);
    expect(isAdminAnalyticsPath('/administrator')).toBe(false);
  });
});
