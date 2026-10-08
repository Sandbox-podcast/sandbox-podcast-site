'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isNavigationActive } from '@/domain/site-navigation';
import { localeRouteSegment } from '@/i18n/locales';
import { siteMessages } from '@/i18n/messages';

export function MainNav({ locale = 'fr-FR' }: { locale?: string }) {
  const pathname = usePathname();
  const messages = siteMessages(locale);
  const isFrench = locale.startsWith('fr');
  const localePrefix = localeRouteSegment(locale);
  const items = isFrench
    ? [
        { href: '/episodes', label: messages.podcasts },
        { href: '/charts', label: 'Classements' },
        { href: '/about', label: messages.about },
      ]
    : [
        ...(locale.startsWith('en')
          ? [{ href: '/en#podcast-library', label: messages.podcasts }]
          : []),
        { href: `/${localePrefix ?? ''}/charts`, label: messages.rankings },
      ];
  return (
    <nav aria-label={messages.navigationLabel} lang={isFrench ? 'fr' : 'en'}>
      <ul className="main-nav-list">
        {items.map((item) => {
          const active = isNavigationActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="nav-link"
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function LocaleSwitcher({ locale = 'fr-FR' }: { locale?: string }) {
  const pathname = usePathname();
  const isFrench = locale.startsWith('fr');
  const target =
    pathname === '/'
      ? '/en'
      : pathname === '/charts'
        ? '/en/charts'
        : pathname === '/en'
          ? '/'
          : pathname === '/en/charts'
            ? '/charts'
            : undefined;
  if (!target) return null;
  const messages = siteMessages(locale);
  return (
    <Link
      className="locale-switcher"
      href={target}
      lang={isFrench ? 'en' : 'fr'}
      hrefLang={isFrench ? 'en' : 'fr'}
      aria-label={messages.switchLanguage}
    >
      <svg
        className="locale-switcher-flag"
        viewBox="0 0 60 40"
        width="21"
        height="14"
        aria-hidden="true"
        focusable="false"
      >
        {isFrench ? (
          <>
            <path fill="#012169" d="M0 0h60v40H0z" />
            <path stroke="#fff" strokeWidth="8" d="m0 0 60 40M60 0 0 40" />
            <path
              fill="#c8102e"
              d="m0 0 27 18h-6L0 4zm60 0L33 18h6L60 4zM0 40l27-18h-6L0 36zm60 0L33 22h6l21 14z"
            />
            <path stroke="#fff" strokeWidth="13" d="M30 0v40M0 20h60" />
            <path stroke="#c8102e" strokeWidth="8" d="M30 0v40M0 20h60" />
          </>
        ) : (
          <>
            <path fill="#fff" d="M0 0h60v40H0z" />
            <path fill="#002654" d="M0 0h20v40H0z" />
            <path fill="#ed2939" d="M40 0h20v40H40z" />
          </>
        )}
      </svg>
      {isFrench ? 'EN' : 'FR'}
    </Link>
  );
}
