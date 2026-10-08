export type TranslationDictionary = Readonly<Record<string, string>>;

interface Template {
  pattern: RegExp;
  names: string[];
  translation: string;
  literalSize: number;
}
const templates = new WeakMap<TranslationDictionary, Template[]>();

function dictionaryTemplates(dictionary: TranslationDictionary): Template[] {
  const cached = templates.get(dictionary);
  if (cached) return cached;
  const compiled = Object.entries(dictionary).flatMap(([source, translation]) => {
    const names: string[] = [];
    const pattern = source
      .split(/(\{[a-zA-Z][a-zA-Z0-9]*\})/)
      .map((part) => {
        if (part.startsWith('{') && part.endsWith('}')) {
          const name = part.slice(1, -1);
          names.push(name);
          if (/^(?:rank|poolRank)$/.test(name)) return '(\\d+(?:er|e)?)';
          return /^(?:count|number|size|score|delta)$/.test(name)
            ? '([+−-]?\\d+(?:[\\s,.]\\d+)*)'
            : '(.+?)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('');
    const literal = source.replace(/\{[a-zA-Z][a-zA-Z0-9]*\}/g, '').trim();
    return names.length && literal
      ? [{ pattern: new RegExp(`^${pattern}$`), names, translation, literalSize: literal.length }]
      : [];
  });
  compiled.sort((a, b) => b.literalSize - a.literalSize);
  templates.set(dictionary, compiled);
  return compiled;
}

export function normalizeTranslationKey(source: string): string {
  return source.replace(/\s+/g, ' ').trim();
}

export function intlLocale(locale: string): string {
  return Intl.DateTimeFormat.supportedLocalesOf([locale]).length ? locale : 'en';
}

/** Les dictionnaires portent le texte, jamais les identifiants, liens, scores ou assets. */
export function translateText(
  source: string,
  dictionary: TranslationDictionary,
  locale = 'fr-FR',
  namespace?: string,
): string {
  const key = normalizeTranslationKey(source);
  const lookup = (candidate: string): string | undefined =>
    Object.hasOwn(dictionary, candidate) ? dictionary[candidate] : undefined;
  let translated = (namespace ? lookup(`${namespace}:${key}`) : undefined) ?? lookup(key);
  if (!translated) {
    for (const template of dictionaryTemplates(dictionary)) {
      const match = key.match(template.pattern);
      if (!match) continue;
      const values = Object.fromEntries(
        template.names.map((name, i) => [name, match[i + 1] ?? '']),
      );
      translated = template.translation.replace(
        /\{([a-zA-Z][a-zA-Z0-9]*)\}/g,
        (_token, name: string) => translateText(values[name] ?? '', dictionary, locale),
      );
      break;
    }
  }
  translated ??= translatedDate(key, locale);
  if (!translated) return source;
  const leading = /^\s*/.exec(source)?.[0] ?? '';
  const trailing = /\s*$/.exec(source)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
}

const frenchMonths: Readonly<Record<string, number>> = {
  janvier: 0,
  'janv.': 0,
  février: 1,
  'févr.': 1,
  mars: 2,
  avril: 3,
  'avr.': 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  'juil.': 6,
  août: 7,
  septembre: 8,
  'sept.': 8,
  octobre: 9,
  'oct.': 9,
  novembre: 10,
  'nov.': 10,
  décembre: 11,
  'déc.': 11,
};
function translatedDate(source: string, locale: string): string | undefined {
  if (locale.startsWith('fr')) return undefined;
  const match = /^(\d{1,2}) ([a-zéû.]+)(?: (\d{4}))?$/.exec(source);
  const month = match?.[2] ? frenchMonths[match[2]] : undefined;
  if (!match || month === undefined) return undefined;
  const day = Number(match[1]);
  const year = match[3] ? Number(match[3]) : 2000;
  const date = new Date(Date.UTC(year, month, day));
  if (date.getMonth() !== month) return undefined;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: match[2]?.endsWith('.') ? 'short' : 'long',
    ...(match[3] ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(date);
}

export function interpolateText(
  source: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return source.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (token, name: string) =>
    String(values[name] ?? token),
  );
}
