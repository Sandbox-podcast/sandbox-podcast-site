import { describe, expect, it } from 'vitest';
import {
  analyticsPageLocation,
  analyticsPageReferrer,
  defaultGoogleAnalyticsMeasurementId,
  googleAnalyticsMeasurementId,
  isAdminAnalyticsPath,
  parseAnalyticsConsent,
} from '../src/lib/google-analytics.ts';

describe('configuration Google Analytics', () => {
  it('accepte un identifiant GA4 et ignore une valeur absente ou mal formée', () => {
    expect(googleAnalyticsMeasurementId(' G-ABC123XYZ ')).toBe('G-ABC123XYZ');
    expect(googleAnalyticsMeasurementId('G-45XWR4KJ1M')).toBe('G-45XWR4KJ1M');
    expect(googleAnalyticsMeasurementId(defaultGoogleAnalyticsMeasurementId)).toBe('G-45XWR4KJ1M');
    expect(googleAnalyticsMeasurementId(undefined)).toBeUndefined();
    expect(googleAnalyticsMeasurementId('UA-123456')).toBeUndefined();
  });

  it('ne restaure que les choix de consentement reconnus', () => {
    expect(parseAnalyticsConsent('accepted')).toBe('accepted');
    expect(parseAnalyticsConsent('rejected')).toBe('rejected');
    expect(parseAnalyticsConsent('anything-else')).toBeNull();
    expect(parseAnalyticsConsent(null)).toBeNull();
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
