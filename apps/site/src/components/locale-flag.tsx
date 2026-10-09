import { localeCountry } from '@/i18n/routing';

export function LocaleFlag({ locale }: { locale: string }) {
  const country = localeCountry(locale);
  return (
    <img
      className="locale-switcher-flag"
      src={`/flags/${country}.svg`}
      width={21}
      height={14}
      alt=""
      aria-hidden="true"
    />
  );
}
