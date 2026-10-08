import { localeCountry } from '@/i18n/routing';

export function LocaleFlag({ locale }: { locale: string }) {
  const country = localeCountry(locale);
  return country ? (
    <img
      className="locale-switcher-flag"
      src={`/flags/${country}.svg`}
      width={21}
      height={14}
      alt=""
      aria-hidden="true"
    />
  ) : (
    <svg
      className="locale-switcher-flag"
      viewBox="0 0 24 24"
      width={21}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18M5 6h14M5 18h14" />
    </svg>
  );
}
