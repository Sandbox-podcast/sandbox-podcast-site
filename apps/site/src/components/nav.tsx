'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { isNavigationActive } from '@/domain/site-navigation';
import { DEFAULT_SITE_LOCALE, EUROPEAN_LOCALE_TARGETS, localeLabel } from '@/i18n/locales';
import { localizedHref, sourcePath } from '@/i18n/routing';
import { LocalizedLink, useLocalization } from './localization';
import { LocaleFlag } from './locale-flag';

const ITEMS = [
  { href: '/episodes', label: 'Podcasts' },
  { href: '/charts', label: 'Classements' },
  { href: '/about', label: 'À propos' },
];

export function MainNav({ locale = DEFAULT_SITE_LOCALE }: { locale?: string }) {
  const pathname = usePathname();
  const { t } = useLocalization();
  const submenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent): void => {
      if (
        event.target instanceof Node &&
        !submenu.current?.contains(event.target) &&
        submenu.current
      )
        submenu.current.open = false;
    };
    document.addEventListener('pointerdown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
    };
  }, []);
  return (
    <nav aria-label={t('Navigation principale')} lang={locale}>
      <ul className="main-nav-list">
        {ITEMS.map((item) => {
          const active = isNavigationActive(sourcePath(pathname), item.href);
          return (
            <li key={item.href} className={item.href === '/episodes' ? 'nav-submenu' : undefined}>
              {item.href === '/episodes' ? (
                <details
                  ref={submenu}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape' && event.currentTarget.open) {
                      event.currentTarget.open = false;
                      event.currentTarget.querySelector('summary')?.focus();
                    }
                  }}
                >
                  <summary className="nav-link" aria-current={active ? 'page' : undefined}>
                    {t(item.label)}
                    <span className="nav-submenu-chevron" aria-hidden="true">
                      ▾
                    </span>
                  </summary>
                  <div className="nav-submenu-panel">
                    <LocalizedLink
                      href="/episodes"
                      onClick={() => {
                        if (submenu.current) submenu.current.open = false;
                      }}
                    >
                      {t('Tous les épisodes')}
                    </LocalizedLink>
                    <LocalizedLink
                      href="/topics"
                      onClick={() => {
                        if (submenu.current) submenu.current.open = false;
                      }}
                    >
                      {t('Les thèmes')}
                    </LocalizedLink>
                  </div>
                </details>
              ) : (
                <LocalizedLink
                  href={item.href}
                  className="nav-link"
                  aria-current={active ? 'page' : undefined}
                >
                  {t(item.label)}
                </LocalizedLink>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const displayNames = new Intl.DisplayNames(['fr'], { type: 'language' });
const englishDisplayNames = new Intl.DisplayNames(['en'], { type: 'language' });
const languages = [...EUROPEAN_LOCALE_TARGETS].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

export function LocaleSwitcher({ locale = DEFAULT_SITE_LOCALE }: { locale?: string }) {
  const pathname = usePathname();
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suffix, setSuffix] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const visible = languages.filter((item) =>
    normalize(
      `${item.name} ${displayNames.of(item.locale) ?? ''} ${englishDisplayNames.of(item.locale) ?? ''} ${item.locale}`,
    ).includes(normalize(query)),
  );

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
    };
  }, [open]);

  if (sourcePath(pathname).startsWith('/admin')) return null;

  return (
    <div
      className="locale-menu"
      ref={container}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className="locale-switcher"
        type="button"
        aria-label={`${t('Changer de langue')} : ${localeLabel(locale)}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="locale-options"
        onClick={() => {
          setSuffix(window.location.search + window.location.hash);
          setQuery('');
          setOpen(!open);
        }}
      >
        <LocaleFlag locale={locale} />
        <span>{locale.split('-')[0]?.toUpperCase()}</span>
        <span className="locale-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div
          className="locale-options"
          id="locale-options"
          role="dialog"
          aria-label={t('Choisir une langue')}
        >
          <div className="locale-options-heading">
            <span>{t('Choisir une langue')}</span>
            <button
              type="button"
              className="locale-close"
              aria-label={t('Fermer')}
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              ×
            </button>
          </div>
          <label className="locale-search">
            <span className="sr-only">{t('Rechercher une langue')}</span>
            <input
              ref={input}
              type="search"
              value={query}
              placeholder={t('Rechercher une langue')}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          </label>
          <ul className="locale-options-list">
            {visible.map((item) => (
              <li key={item.locale}>
                <a
                  href={localizedHref(sourcePath(pathname) + suffix, item.locale)}
                  lang={item.locale}
                  hrefLang={item.locale}
                  aria-current={item.locale === locale ? 'true' : undefined}
                >
                  <LocaleFlag locale={item.locale} />
                  <span>{item.name}</span>
                  <span className="locale-option-code">{item.locale.toUpperCase()}</span>
                  {item.locale === locale ? <span aria-hidden="true">✓</span> : null}
                </a>
              </li>
            ))}
          </ul>
          {visible.length === 0 ? (
            <p role="status" className="locale-empty">
              {t('Aucune langue trouvée')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
