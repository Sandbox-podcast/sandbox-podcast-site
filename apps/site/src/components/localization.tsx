'use client';

import {
  cloneElement,
  createContext,
  createElement,
  Fragment,
  isValidElement,
  useContext,
  type ReactNode,
  type JSX,
} from 'react';
import NextLink from 'next/link';
import { DEFAULT_SITE_LOCALE } from '@/i18n/locales';
import { localizedHref } from '@/i18n/routing';
import {
  interpolateText,
  intlLocale,
  translateText,
  type TranslationDictionary,
} from '@/i18n/translation';

const LocalizationContext = createContext<{ locale: string; dictionary: TranslationDictionary }>({
  locale: DEFAULT_SITE_LOCALE,
  dictionary: {},
});

export function LocalizationProvider({
  locale,
  dictionary,
  children,
}: {
  locale: string;
  dictionary: TranslationDictionary;
  children: ReactNode;
}) {
  return (
    <LocalizationContext.Provider value={{ locale, dictionary }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const { locale, dictionary } = useContext(LocalizationContext);
  return {
    locale,
    t: (source: string, namespace?: string) => translateText(source, dictionary, locale, namespace),
  };
}

export function Text({
  children,
  values,
  namespace,
}: {
  children?: ReactNode;
  values?: Readonly<Record<string, string | number>>;
  namespace?: string;
}) {
  const { t } = useLocalization();
  const translateNode = (node: ReactNode): ReactNode => {
    if (typeof node === 'string') {
      const translated = t(node, namespace);
      return values ? interpolateText(translated, values) : translated;
    }
    if (Array.isArray(node)) return node.map(translateNode);
    if (isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment)
      return cloneElement(node, { children: translateNode(node.props.children) });
    return node;
  };
  return translateNode(children);
}

export function LocalizedDate({
  iso,
  format = 'long',
}: {
  iso: string;
  format?: 'long' | 'short' | 'month';
}) {
  const { locale } = useLocalization();
  const options: Intl.DateTimeFormatOptions =
    format === 'month'
      ? { month: 'short' }
      : {
          day: 'numeric',
          month: format === 'long' ? 'long' : 'short',
          year: format === 'long' ? 'numeric' : undefined,
        };
  return new Intl.DateTimeFormat(intlLocale(locale), { ...options, timeZone: 'UTC' }).format(
    new Date(iso),
  );
}

type LinkProps = Parameters<typeof NextLink>[0];

export function LocalizedLink({ href, children, ...props }: LinkProps) {
  const { locale, t } = useLocalization();
  return (
    <NextLink
      {...props}
      href={
        typeof href === 'string'
          ? localizedHref(href, locale)
          : {
              ...href,
              pathname:
                typeof href.pathname === 'string'
                  ? localizedHref(href.pathname, locale)
                  : href.pathname,
            }
      }
      aria-label={props['aria-label'] ? t(props['aria-label']) : undefined}
      title={props.title ? t(props.title) : undefined}
    >
      {typeof children === 'string' ? t(children) : children}
    </NextLink>
  );
}

/** Attributs textuels localisés avec les mêmes éléments HTML et les mêmes interactions. */
export function LocalizedElement<Tag extends keyof JSX.IntrinsicElements>({
  as,
  ...props
}: { as: Tag } & JSX.IntrinsicElements[Tag]) {
  const { locale, t } = useLocalization();
  const translated: Record<string, unknown> = { ...props };
  for (const key of ['aria-label', 'title', 'placeholder', 'alt']) {
    const value = translated[key];
    if (typeof value === 'string') translated[key] = t(value);
  }
  for (const key of ['href', 'action']) {
    const value = translated[key];
    if (typeof value === 'string') translated[key] = localizedHref(value, locale);
  }
  if (typeof translated['children'] === 'string')
    translated['children'] = t(translated['children']);
  return createElement(as, translated);
}
