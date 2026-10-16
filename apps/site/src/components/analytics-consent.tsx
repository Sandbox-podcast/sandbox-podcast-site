'use client';

import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import type { BeforeSend } from '@vercel/analytics';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { BeforeSendMiddleware as BeforeSpeedSend } from '@vercel/speed-insights';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, LocalizedLink as Link } from './localization';
import {
  analyticsConsentStorageKey,
  analyticsConsentRecord,
  analyticsCookieLifetimeSeconds,
  analyticsPageTitle,
  analyticsPageLocation,
  analyticsPageReferrer,
  defaultGoogleAnalyticsMeasurementId,
  googleAnalyticsMeasurementId,
  googleAnalyticsReady,
  isAdminAnalyticsPath,
  filterAnalyticsEvent,
  parseAnalyticsConsent,
  readAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/google-analytics';
import styles from './analytics-consent.module.css';
import { badgeAttribution, recordBadgeEvent } from '@/lib/badge-analytics';
import { analyticsActionFromDataset, type AnalyticsAction } from '@/domain/analytics-actions';

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
        cookie_expires: number;
        cookie_update: false;
      },
    ]
  | ['set', { page_location: string; page_referrer?: string }]
  | ['event', 'page_view', { page_location: string; page_referrer?: string; page_title: string }]
  | ['event', AnalyticsAction['name'], Omit<AnalyticsAction, 'name'> & { page_location: string }];

type GoogleAnalyticsWindow = Window & {
  __sandboxGoogleTagInitialized?: boolean;
  __sandboxGoogleTagLoaded?: boolean;
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
      'Wir verwenden Google Analytics, Vercel Analytics und Speed Insights, um die Nutzung und Geschwindigkeit der Website zu messen. Diese Dienste werden erst nach Ihrer Zustimmung aktiviert. Sie können Ihre Auswahl jederzeit ändern.',
    preferences: 'Mess-Einstellungen',
    reject: 'Ablehnen',
    storageUnavailable:
      'Ihre Auswahl konnte nicht gespeichert werden. Erlauben Sie den lokalen Speicher und versuchen Sie es erneut.',
    title: 'Nutzungsmessung',
    privacy: 'Datenschutz und Speicherdauer',
    withdraw: 'Einwilligung widerrufen',
  },
  en: {
    accept: 'Accept',
    description:
      'We use Google Analytics, Vercel Analytics and Speed Insights to measure site traffic and speed. These services are enabled only with your consent. You can change your choice at any time.',
    preferences: 'Measurement preferences',
    reject: 'Reject',
    storageUnavailable: 'Your choice could not be saved. Allow local storage and try again.',
    title: 'Audience measurement',
    privacy: 'Privacy and retention periods',
    withdraw: 'Withdraw consent',
  },
  es: {
    accept: 'Aceptar',
    description:
      'Usamos Google Analytics, Vercel Analytics y Speed Insights para medir el uso y la velocidad del sitio. Estos servicios solo se activan con tu consentimiento. Puedes cambiar tu elección en cualquier momento.',
    preferences: 'Preferencias de medición',
    reject: 'Rechazar',
    storageUnavailable:
      'No se pudo guardar tu elección. Permite el almacenamiento local e inténtalo de nuevo.',
    title: 'Medición de audiencia',
    privacy: 'Privacidad y plazos de conservación',
    withdraw: 'Retirar mi consentimiento',
  },
  fr: {
    accept: 'Accepter',
    description:
      'Nous utilisons Google Analytics, Vercel Analytics et Speed Insights pour mesurer la fréquentation, les actions et la vitesse du site, avec votre accord. Votre choix vaut 180 jours. Vous pouvez le retirer à tout moment.',
    preferences: 'Préférences de mesure',
    reject: 'Refuser',
    storageUnavailable:
      'Votre choix n’a pas pu être enregistré. Autorisez le stockage local puis réessayez.',
    title: 'Mesure d’audience',
    privacy: 'Confidentialité et durées de conservation',
    withdraw: 'Retirer mon accord',
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

function stopGoogleAnalytics(measurementId: string) {
  setGoogleAnalyticsDisabled(measurementId, true);
  const analyticsWindow = window as GoogleAnalyticsWindow;
  if (analyticsWindow.__sandboxGoogleTagLoaded) {
    analyticsWindow.gtag?.('consent', 'update', deniedConsent);
  } else {
    // Un chargement lent ne doit pas rejouer les événements après le retrait.
    if (analyticsWindow.dataLayer) analyticsWindow.dataLayer.length = 0;
    analyticsWindow.__sandboxGoogleTagInitialized = false;
  }
  clearGoogleAnalyticsCookies();
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
    window.localStorage.setItem(analyticsConsentStorageKey, analyticsConsentRecord(choice));
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
      page_referrer: referrer ?? '',
    });
    gtag('config', measurementId, {
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
      send_page_view: false,
      cookie_expires: analyticsCookieLifetimeSeconds,
      cookie_update: false,
    });
    analyticsWindow.__sandboxGoogleTagInitialized = true;
  }

  gtag('consent', 'update', grantedAnalyticsConsent);
}

function recordPageView(measurementId: string, pageLocation: string, referrer: string | undefined) {
  const analyticsWindow = window as GoogleAnalyticsWindow;
  if (
    !analyticsWindow.gtag ||
    readSavedConsent() !== 'accepted' ||
    isAdminAnalyticsPath(window.location.pathname)
  )
    return;

  analyticsWindow.gtag('set', {
    page_location: pageLocation,
    page_referrer: referrer ?? '',
  });
  analyticsWindow.gtag('event', 'page_view', {
    page_location: pageLocation,
    page_referrer: referrer ?? '',
    page_title: analyticsPageTitle(window.location.pathname, document.title),
  });
  const badgeType = badgeAttribution(window.location.href);
  if (badgeType) recordBadgeEvent('badge_visit', badgeType);
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
  const consentRef = useRef<AnalyticsConsent | null>(null);
  const rejectionNotSaved = useRef(false);
  const measurementId =
    googleAnalyticsMeasurementId(process.env['NEXT_PUBLIC_GA_MEASUREMENT_ID']) ??
    defaultGoogleAnalyticsMeasurementId;
  const googleTagReady = googleAnalyticsReady(process.env['NEXT_PUBLIC_GA4_READY']);
  const isAdmin = isAdminAnalyticsPath(pathname);
  const labels = labelsForLanguage(language);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function synchronizeConsent() {
      if (timer) clearTimeout(timer);
      let record: ReturnType<typeof readAnalyticsConsent>;
      try {
        record = readAnalyticsConsent(window.localStorage.getItem(analyticsConsentStorageKey));
      } catch {
        // Le stockage inaccessible ne vaut pas un accord.
        record = null;
      }
      const choice = rejectionNotSaved.current ? 'rejected' : (record?.choice ?? null);
      consentRef.current = choice;
      if (choice !== 'accepted') stopGoogleAnalytics(measurementId);
      setConsent(choice);
      if (choice === null) setPreferencesOpen(true);
      setReady(true);
      if (record)
        timer = setTimeout(
          synchronizeConsent,
          Math.min(record.expiresAt - Date.now(), 2_147_483_647),
        );
    }
    function storageChanged(event: StorageEvent) {
      if (event.key === analyticsConsentStorageKey || event.key === null) synchronizeConsent();
    }
    function openPreferences() {
      setPreferencesOpen(true);
    }
    synchronizeConsent();
    window.addEventListener('storage', storageChanged);
    window.addEventListener('focus', synchronizeConsent);
    window.addEventListener('sandbox:consent-change', synchronizeConsent);
    window.addEventListener('sandbox:analytics-preferences', openPreferences);
    document.addEventListener('visibilitychange', synchronizeConsent);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('storage', storageChanged);
      window.removeEventListener('focus', synchronizeConsent);
      window.removeEventListener('sandbox:consent-change', synchronizeConsent);
      window.removeEventListener('sandbox:analytics-preferences', openPreferences);
      document.removeEventListener('visibilitychange', synchronizeConsent);
    };
  }, [measurementId]);

  const beforeVercelSend = useCallback<BeforeSend>((event) => {
    if (consentRef.current !== 'accepted' || isAdminAnalyticsPath(window.location.pathname))
      return null;
    return filterAnalyticsEvent(event, readSavedConsent());
  }, []);

  const beforeSpeedSend = useCallback<BeforeSpeedSend>((event) => {
    if (consentRef.current !== 'accepted' || isAdminAnalyticsPath(window.location.pathname))
      return null;
    return filterAnalyticsEvent(event, readSavedConsent());
  }, []);

  useEffect(() => {
    function recordAction(event: MouseEvent) {
      if (
        !googleTagReady ||
        consentRef.current !== 'accepted' ||
        readSavedConsent() !== 'accepted' ||
        isAdminAnalyticsPath(window.location.pathname)
      )
        return;
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-analytics-event]')
          : null;
      if (!target) return;
      const parsed = analyticsActionFromDataset(target.dataset);
      if (!parsed.success) return;
      const { name, ...parameters } = parsed.data;
      (window as GoogleAnalyticsWindow).gtag?.('event', name, {
        ...parameters,
        page_location: analyticsPageLocation(window.location.href),
      });
    }
    document.addEventListener('click', recordAction);
    return () => {
      document.removeEventListener('click', recordAction);
    };
  }, [googleTagReady]);

  useEffect(() => {
    if (!ready) return;

    const canMeasure =
      googleTagReady &&
      consent === 'accepted' &&
      consentRef.current === 'accepted' &&
      readSavedConsent() === 'accepted' &&
      !isAdmin;
    if (!canMeasure) {
      stopGoogleAnalytics(measurementId);
      setGoogleTagRequested(false);
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
        setGoogleTagRequested(true);
      }
    }
  }, [consent, googleTagReady, isAdmin, measurementId, pathname, ready]);

  function chooseConsent(choice: AnalyticsConsent) {
    if (choice === 'rejected') {
      consentRef.current = 'rejected';
      stopGoogleAnalytics(measurementId);
      setConsent('rejected');
      setGoogleTagRequested(false);
    }
    if (!persistConsent(choice)) {
      if (choice === 'rejected') rejectionNotSaved.current = true;
      setStorageUnavailable(true);
      return;
    }
    rejectionNotSaved.current = false;
    consentRef.current = choice;
    setConsent(choice);
    window.dispatchEvent(new Event('sandbox:consent-change'));
    setStorageUnavailable(false);
    setPreferencesOpen(false);
  }

  const showPreferences = ready && !isAdmin && preferencesOpen;

  return (
    <>
      {ready && consent === 'accepted' && !isAdmin ? (
        <>
          <VercelAnalytics beforeSend={beforeVercelSend} />
          <SpeedInsights beforeSend={beforeSpeedSend} />
        </>
      ) : null}
      {googleTagRequested && measurementId ? (
        <Script
          id="google-analytics-tag"
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
          strategy="afterInteractive"
          onReady={() => {
            (window as GoogleAnalyticsWindow).__sandboxGoogleTagLoaded = true;
            if (consentRef.current !== 'accepted' || readSavedConsent() !== 'accepted')
              stopGoogleAnalytics(measurementId);
          }}
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
          <p className={styles['description']}>
            <Link href="/confidentialite" className="underline">
              {labels.privacy}
            </Link>
          </p>
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
              {consent === 'accepted' ? labels.withdraw : labels.reject}
            </button>
            <button
              className={styles['actionButton']}
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

export function MeasurementPreferencesButton() {
  return (
    <button
      className="underline"
      type="button"
      onClick={() => window.dispatchEvent(new Event('sandbox:analytics-preferences'))}
    >
      <Text>{'Préférences de mesure'}</Text>
    </button>
  );
}
