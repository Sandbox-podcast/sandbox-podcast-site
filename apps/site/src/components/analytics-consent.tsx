'use client';

import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  analyticsConsentStorageKey,
  analyticsPageLocation,
  analyticsPageReferrer,
  defaultGoogleAnalyticsMeasurementId,
  googleAnalyticsMeasurementId,
  isAdminAnalyticsPath,
  parseAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/google-analytics';
import styles from './analytics-consent.module.css';

interface ConsentState {
  ad_personalization: 'denied' | 'granted';
  ad_storage: 'denied' | 'granted';
  ad_user_data: 'denied' | 'granted';
  analytics_storage: 'denied' | 'granted';
}

type GoogleTagArguments =
  | ['consent', 'default' | 'update', ConsentState]
  | ['js', Date]
  | [
      'config',
      string,
      {
        allow_ad_personalization_signals: false;
        allow_google_signals: false;
        send_page_view: false;
      },
    ]
  | ['set', { page_location: string; page_referrer?: string }]
  | ['event', 'page_view', { page_location: string; page_referrer?: string; page_title: string }];

type GoogleAnalyticsWindow = Window & {
  __sandboxGoogleTagInitialized?: boolean;
  dataLayer?: IArguments[];
  gtag?: (...args: GoogleTagArguments) => void;
};

const deniedConsent: ConsentState = {
  ad_personalization: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  analytics_storage: 'denied',
};

const grantedAnalyticsConsent: ConsentState = {
  ad_personalization: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  analytics_storage: 'granted',
};

const messages = {
  de: {
    accept: 'Akzeptieren',
    description:
      'Wir verwenden Google Analytics und Vercel Analytics, um die Nutzung der Website zu messen. Diese Dienste werden erst nach Ihrer Zustimmung aktiviert. Sie können Ihre Auswahl jederzeit ändern.',
    preferences: 'Mess-Einstellungen',
    reject: 'Ablehnen',
    storageUnavailable:
      'Ihre Auswahl konnte nicht gespeichert werden. Erlauben Sie den lokalen Speicher und versuchen Sie es erneut.',
    title: 'Nutzungsmessung',
  },
  en: {
    accept: 'Accept',
    description:
      'We use Google Analytics and Vercel Analytics to measure site traffic. These services are enabled only with your consent. You can change your choice at any time.',
    preferences: 'Measurement preferences',
    reject: 'Reject',
    storageUnavailable: 'Your choice could not be saved. Allow local storage and try again.',
    title: 'Audience measurement',
  },
  es: {
    accept: 'Aceptar',
    description:
      'Usamos Google Analytics y Vercel Analytics para medir el uso del sitio. Estos servicios solo se activan con tu consentimiento. Puedes cambiar tu elección en cualquier momento.',
    preferences: 'Preferencias de medición',
    reject: 'Rechazar',
    storageUnavailable:
      'No se pudo guardar tu elección. Permite el almacenamiento local e inténtalo de nuevo.',
    title: 'Medición de audiencia',
  },
  fr: {
    accept: 'Accepter',
    description:
      'Nous utilisons Google Analytics et Vercel Analytics pour mesurer la fréquentation du site. Ces services ne sont activés qu’avec votre accord. Vous pouvez modifier votre choix à tout moment.',
    preferences: 'Préférences de mesure',
    reject: 'Refuser',
    storageUnavailable:
      'Votre choix n’a pas pu être enregistré. Autorisez le stockage local puis réessayez.',
    title: 'Mesure d’audience',
  },
} as const;

function labelsForLanguage(language: string) {
  const shortLanguage = language.toLowerCase().slice(0, 2);
  if (shortLanguage === 'en') return messages.en;
  if (shortLanguage === 'es') return messages.es;
  if (shortLanguage === 'de') return messages.de;
  return messages.fr;
}

function setGoogleAnalyticsDisabled(measurementId: string, disabled: boolean) {
  const analyticsWindow = window as unknown as Window & Record<string, unknown>;
  analyticsWindow[`ga-disable-${measurementId}`] = disabled;
}

function clearGoogleAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(';')
    .map((part) => part.split('=', 1)[0]?.trim())
    .filter((name): name is string => name === '_ga' || Boolean(name?.startsWith('_ga_')));
  const host = window.location.hostname;
  const domains = new Set([undefined, host, `.${host}`]);
  if (host === 'sandboxpodcast.fr' || host.endsWith('.sandboxpodcast.fr')) {
    domains.add('.sandboxpodcast.fr');
  }

  for (const name of cookieNames) {
    for (const domain of domains) {
      const domainAttribute = domain ? `; domain=${domain}` : '';
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domainAttribute}`;
    }
  }
}

function readSavedConsent(): AnalyticsConsent | null {
  try {
    return parseAnalyticsConsent(window.localStorage.getItem(analyticsConsentStorageKey));
  } catch {
    return null;
  }
}

function persistConsent(choice: AnalyticsConsent): boolean {
  try {
    window.localStorage.setItem(analyticsConsentStorageKey, choice);
    return true;
  } catch {
    return false;
  }
}

function initializeGoogleTag(
  measurementId: string,
  pageLocation: string,
  referrer: string | undefined,
) {
  const analyticsWindow = window as GoogleAnalyticsWindow;
  analyticsWindow.dataLayer ??= [];
  let gtag = analyticsWindow.gtag;
  if (!gtag) {
    gtag = function gtagStub() {
      // Google documents this queue as an `arguments` object.
      // eslint-disable-next-line prefer-rest-params
      analyticsWindow.dataLayer?.push(arguments);
    };
    analyticsWindow.gtag = gtag;
  }

  if (!analyticsWindow.__sandboxGoogleTagInitialized) {
    gtag('consent', 'default', deniedConsent);
    gtag('js', new Date());
    gtag('set', {
      page_location: pageLocation,
      ...(referrer ? { page_referrer: referrer } : {}),
    });
    gtag('config', measurementId, {
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
      send_page_view: false,
    });
    analyticsWindow.__sandboxGoogleTagInitialized = true;
  }

  gtag('consent', 'update', grantedAnalyticsConsent);
}

function recordPageView(measurementId: string, pageLocation: string, referrer: string | undefined) {
  const analyticsWindow = window as GoogleAnalyticsWindow;
  if (!analyticsWindow.gtag) return;

  analyticsWindow.gtag('set', {
    page_location: pageLocation,
    ...(referrer ? { page_referrer: referrer } : {}),
  });
  analyticsWindow.gtag('event', 'page_view', {
    page_location: pageLocation,
    ...(referrer ? { page_referrer: referrer } : {}),
    page_title: document.title,
  });
  setGoogleAnalyticsDisabled(measurementId, false);
}

export function AnalyticsConsent({ language }: { language: string }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [ready, setReady] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [googleTagRequested, setGoogleTagRequested] = useState(false);
  const previousPageLocation = useRef<string | undefined>(undefined);
  const measurementId =
    googleAnalyticsMeasurementId(process.env['NEXT_PUBLIC_GA_MEASUREMENT_ID']) ??
    defaultGoogleAnalyticsMeasurementId;
  const isAdmin = isAdminAnalyticsPath(pathname);
  const labels = labelsForLanguage(language);

  useEffect(() => {
    const savedConsent = readSavedConsent();
    setConsent(savedConsent);
    setPreferencesOpen(savedConsent === null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const canMeasure = consent === 'accepted' && !isAdmin;
    if (!canMeasure) {
      if (measurementId) setGoogleAnalyticsDisabled(measurementId, true);
      if (consent === 'rejected') clearGoogleAnalyticsCookies();
      previousPageLocation.current = undefined;
      return;
    }

    if (measurementId) {
      setGoogleAnalyticsDisabled(measurementId, false);
      const pageLocation = analyticsPageLocation(window.location.href);
      if (previousPageLocation.current !== pageLocation) {
        const referrer = previousPageLocation.current ?? analyticsPageReferrer(document.referrer);
        initializeGoogleTag(measurementId, pageLocation, referrer);
        setGoogleTagRequested(true);
        recordPageView(measurementId, pageLocation, referrer);
        previousPageLocation.current = pageLocation;
      } else {
        initializeGoogleTag(measurementId, pageLocation, undefined);
        setGoogleTagRequested(true);
      }
    }
  }, [consent, isAdmin, measurementId, pathname, ready]);

  function chooseConsent(choice: AnalyticsConsent) {
    if (!persistConsent(choice)) {
      setStorageUnavailable(true);
      return;
    }
    setConsent(choice);
    setStorageUnavailable(false);
    setPreferencesOpen(false);
  }

  const showPreferences = ready && !isAdmin && preferencesOpen;

  return (
    <>
      {ready && consent === 'accepted' && !isAdmin ? <VercelAnalytics /> : null}
      {googleTagRequested && measurementId ? (
        <Script
          id="google-analytics-tag"
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
          strategy="afterInteractive"
        />
      ) : null}
      {showPreferences ? (
        <section
          aria-label={labels.title}
          className={styles['panel']}
          id="site-measurement-consent"
        >
          <h2 className={styles['title']}>{labels.title}</h2>
          <p className={styles['description']}>{labels.description}</p>
          {storageUnavailable ? (
            <p className={styles['description']} role="alert">
              {labels.storageUnavailable}
            </p>
          ) : null}
          <div className={styles['actions']}>
            <button
              className={styles['actionButton']}
              onClick={() => {
                chooseConsent('rejected');
              }}
              type="button"
            >
              {labels.reject}
            </button>
            <button
              className={`${styles['actionButton']} ${styles['actionButtonPrimary']}`}
              onClick={() => {
                chooseConsent('accepted');
              }}
              type="button"
            >
              {labels.accept}
            </button>
          </div>
        </section>
      ) : ready && !isAdmin ? (
        <button
          aria-controls="site-measurement-consent"
          aria-expanded={preferencesOpen}
          className={styles['preferencesButton']}
          onClick={() => {
            setPreferencesOpen(true);
          }}
          type="button"
        >
          {labels.preferences}
        </button>
      ) : null}
    </>
  );
}
