import { z } from 'zod';

export const DEFAULT_SITE_LOCALE = 'fr-FR';

/**
 * Langues visées pour l'Europe : les 24 langues officielles de l'UE, les langues nationales
 * voisines et un large ensemble de langues régionales ou minoritaires. Le registre est extensible.
 */
export const EUROPEAN_LOCALE_TARGETS = [
  { locale: 'bg-BG', name: 'български', group: 'eu' },
  { locale: 'hr-HR', name: 'hrvatski', group: 'eu' },
  { locale: 'cs-CZ', name: 'čeština', group: 'eu' },
  { locale: 'da-DK', name: 'dansk', group: 'eu' },
  { locale: 'nl-NL', name: 'Nederlands', group: 'eu' },
  { locale: 'en', name: 'English', group: 'eu' },
  { locale: 'et-EE', name: 'eesti', group: 'eu' },
  { locale: 'fi-FI', name: 'suomi', group: 'eu' },
  { locale: 'fr-FR', name: 'français', group: 'eu' },
  { locale: 'de-DE', name: 'Deutsch', group: 'eu' },
  { locale: 'el-GR', name: 'Ελληνικά', group: 'eu' },
  { locale: 'hu-HU', name: 'magyar', group: 'eu' },
  { locale: 'ga-IE', name: 'Gaeilge', group: 'eu' },
  { locale: 'it-IT', name: 'italiano', group: 'eu' },
  { locale: 'lv-LV', name: 'latviešu', group: 'eu' },
  { locale: 'lt-LT', name: 'lietuvių', group: 'eu' },
  { locale: 'mt-MT', name: 'Malti', group: 'eu' },
  { locale: 'pl-PL', name: 'polski', group: 'eu' },
  { locale: 'pt-PT', name: 'português', group: 'eu' },
  { locale: 'ro-RO', name: 'română', group: 'eu' },
  { locale: 'sk-SK', name: 'slovenčina', group: 'eu' },
  { locale: 'sl-SI', name: 'slovenščina', group: 'eu' },
  { locale: 'es-ES', name: 'español', group: 'eu' },
  { locale: 'sv-SE', name: 'svenska', group: 'eu' },
  { locale: 'sq-AL', name: 'shqip', group: 'national' },
  { locale: 'be-BY', name: 'беларуская', group: 'national' },
  { locale: 'bs-BA', name: 'bosanski', group: 'national' },
  { locale: 'is-IS', name: 'íslenska', group: 'national' },
  { locale: 'mk-MK', name: 'македонски', group: 'national' },
  { locale: 'nb-NO', name: 'norsk bokmål', group: 'national' },
  { locale: 'nn-NO', name: 'norsk nynorsk', group: 'national' },
  { locale: 'ru-RU', name: 'русский', group: 'national' },
  { locale: 'sr-Cyrl-RS', name: 'српски', group: 'national' },
  { locale: 'sr-Latn-RS', name: 'srpski', group: 'national' },
  { locale: 'uk-UA', name: 'українська', group: 'national' },
  { locale: 'tr-TR', name: 'Türkçe', group: 'national' },
  { locale: 'hy-AM', name: 'հայերեն', group: 'national' },
  { locale: 'az-AZ', name: 'azərbaycan dili', group: 'national' },
  { locale: 'ka-GE', name: 'ქართული', group: 'national' },
  { locale: 'lb-LU', name: 'Lëtzebuergesch', group: 'national' },
  { locale: 'ca-ES', name: 'català', group: 'regional' },
  { locale: 'eu-ES', name: 'euskara', group: 'regional' },
  { locale: 'gl-ES', name: 'galego', group: 'regional' },
  { locale: 'cy-GB', name: 'Cymraeg', group: 'regional' },
  { locale: 'gd-GB', name: 'Gàidhlig', group: 'regional' },
  { locale: 'fo-FO', name: 'føroyskt', group: 'regional' },
  { locale: 'rm-CH', name: 'rumantsch', group: 'regional' },
  { locale: 'se-NO', name: 'davvisámegiella', group: 'regional' },
  { locale: 'sma-NO', name: 'åarjelsaemien', group: 'regional' },
  { locale: 'smj-SE', name: 'julevsámegiella', group: 'regional' },
  { locale: 'smn-FI', name: 'anarâškielâ', group: 'regional' },
  { locale: 'sms-FI', name: 'sää´mǩiõll', group: 'regional' },
  { locale: 'yi', name: 'ייִדיש', group: 'regional' },
  { locale: 'rom', name: 'romani', group: 'regional' },
  { locale: 'br-FR', name: 'brezhoneg', group: 'regional' },
  { locale: 'co-FR', name: 'corsu', group: 'regional' },
  { locale: 'oc-FR', name: 'occitan', group: 'regional' },
  { locale: 'fur-IT', name: 'furlan', group: 'regional' },
  { locale: 'sc-IT', name: 'sardu', group: 'regional' },
  { locale: 'ast-ES', name: 'asturianu', group: 'regional' },
  { locale: 'an-ES', name: 'aragonés', group: 'regional' },
  { locale: 'ext-ES', name: 'estremeñu', group: 'regional' },
  { locale: 'vec-IT', name: 'vèneto', group: 'regional' },
  { locale: 'lij-IT', name: 'ligure', group: 'regional' },
  { locale: 'lmo-IT', name: 'lombard', group: 'regional' },
  { locale: 'pms-IT', name: 'piemontèis', group: 'regional' },
  { locale: 'nap-IT', name: 'napulitano', group: 'regional' },
  { locale: 'frp-FR', name: 'arpitan', group: 'regional' },
  { locale: 'gsw-CH', name: 'Schwiizertüütsch', group: 'regional' },
  { locale: 'wa-BE', name: 'walon', group: 'regional' },
  { locale: 'fy-NL', name: 'Frysk', group: 'regional' },
  { locale: 'frr-DE', name: 'Frasch', group: 'regional' },
  { locale: 'csb-PL', name: 'kaszëbsczi', group: 'regional' },
  { locale: 'gag-MD', name: 'Gagauz', group: 'regional' },
  { locale: 'rup-RO', name: 'armãneashce', group: 'regional' },
  { locale: 'rue-UA', name: 'русиньскый', group: 'regional' },
  { locale: 'aii-AM', name: 'ܣܘܪܝܝܐ', group: 'regional' },
  { locale: 'acy-CY', name: 'Sanna', group: 'regional' },
  { locale: 'ary-ES', name: 'الدارجة المغربية', group: 'regional' },
  { locale: 'av-RU', name: 'магӀарул мацӀ', group: 'regional' },
  { locale: 'ca-ES-valencia', name: 'valencià', group: 'regional' },
  { locale: 'sr-Latn-ME', name: 'crnogorski', group: 'national' },
  { locale: 'crh-UA', name: 'qırımtatarca', group: 'regional' },
  { locale: 'dsb-DE', name: 'dolnoserbšćina', group: 'regional' },
  { locale: 'fax-ES', name: 'fala', group: 'regional' },
  { locale: 'fkv-NO', name: 'kvääni', group: 'regional' },
  { locale: 'fit-SE', name: 'meänkieli', group: 'regional' },
  { locale: 'gv-IM', name: 'Gaelg', group: 'regional' },
  { locale: 'hsb-DE', name: 'hornjoserbšćina', group: 'regional' },
  { locale: 'jct-UA', name: 'кърымчах тили', group: 'regional' },
  { locale: 'kdr-PL', name: 'къарай тили', group: 'regional' },
  { locale: 'krl-FI', name: 'karjala', group: 'regional' },
  { locale: 'kw-GB', name: 'Kernewek', group: 'regional' },
  { locale: 'lad-BA', name: 'dzhudezmo', group: 'regional' },
  { locale: 'lez-RU', name: 'лезги чӀал', group: 'regional' },
  { locale: 'li-NL', name: 'Limburgs', group: 'regional' },
  { locale: 'lbe-RU', name: 'лакку маз', group: 'regional' },
  { locale: 'ku-AM', name: 'kurdî', group: 'regional' },
  { locale: 'mdf-RU', name: 'мокшень кяль', group: 'regional' },
  { locale: 'mwl-PT', name: 'mirandés', group: 'regional' },
  { locale: 'nds-DE', name: 'Plattdüütsch', group: 'regional' },
  { locale: 'nds-NL', name: 'Nedersaksisch', group: 'regional' },
  { locale: 'os-GE', name: 'ирон æвзаг', group: 'regional' },
  { locale: 'pap-CW', name: 'Papiamentu', group: 'regional' },
  { locale: 'rif-ES', name: 'Tarifit', group: 'regional' },
  { locale: 'ro-MD', name: 'limba moldovenească', group: 'national' },
  { locale: 'sco-GB', name: 'Scots', group: 'regional' },
  { locale: 'stq-DE', name: 'Seeltersk', group: 'regional' },
  { locale: 'tt-FI', name: 'татар теле', group: 'regional' },
  { locale: 'tly-AZ', name: 'tolışə zıvon', group: 'regional' },
  { locale: 'udi-AZ', name: 'удин муз', group: 'regional' },
  { locale: 'yec-CH', name: 'Jenisch', group: 'regional' },
  { locale: 'zgh-MA', name: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', group: 'regional' },
  { locale: 'se-SE', name: 'davvisámegiella', group: 'regional' },
  { locale: 'sma-SE', name: 'åarjelsaemien', group: 'regional' },
] as const;

export type EuropeanLocaleTarget = (typeof EUROPEAN_LOCALE_TARGETS)[number];

export const bcp47LocaleSchema = z
  .string()
  .min(2)
  .max(64)
  .refine((value) => {
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*$/.test(value)) return false;
    try {
      return new Intl.Locale(value).toString() === value;
    } catch {
      return false;
    }
  }, 'balise BCP 47 canonique requise');

/** Préfixe d'URL stable : / pour le français, /en/ pour l'anglais et le tag complet ailleurs. */
export function localeRouteSegment(locale: string): string | null {
  const canonical = new Intl.Locale(locale).toString();
  if (canonical === DEFAULT_SITE_LOCALE) return null;
  return canonical.toLowerCase();
}

/** Retourne un tag BCP 47 canonique depuis un préfixe de route, par exemple `sr-cyrl-rs`. */
export function localeTagFromRouteSegment(segment: string): string | undefined {
  // Tous les codes de langue européens ciblés sont en 2 ou 3 lettres. Cette limite évite
  // d'interpréter des slugs français comme « charts » ou « episodes » comme des langues.
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/i.test(segment) || segment !== segment.toLowerCase()) {
    return undefined;
  }
  try {
    const canonical = new Intl.Locale(segment).toString();
    return localeRouteSegment(canonical) === segment ? canonical : undefined;
  } catch {
    return undefined;
  }
}

export function localizedPathMatchesLocale(path: string, locale: string): boolean {
  const prefix = localeRouteSegment(locale);
  if (!prefix) {
    const firstSegment = path.split('/').find(Boolean);
    return (
      path.startsWith('/') &&
      !path.startsWith('//') &&
      !firstSegment?.match(/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/i)
    );
  }
  return path.startsWith(`/${prefix}/`) || path === `/${prefix}`;
}

export function localeLabel(locale: string): string {
  const canonical = new Intl.Locale(locale).toString();
  return (
    EUROPEAN_LOCALE_TARGETS.find((item) => item.locale === canonical)?.name ??
    new Intl.DisplayNames([canonical], { type: 'language' }).of(canonical) ??
    canonical
  );
}
