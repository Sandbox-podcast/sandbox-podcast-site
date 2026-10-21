type TranslationLocale = 'en' | 'es-ES' | 'de-DE';

const terms = [
  {
    source: /\bpolitique face à l['’]IA\b/giu,
    marker: 'SBXAIPOLICY',
    translations: { en: 'AI policy', 'es-ES': 'política sobre la IA', 'de-DE': 'KI-Politik' },
  },
  {
    source: /\btokens? d['’]entrée\b/giu,
    marker: 'SBXINPUTTOKENS',
    translations: { en: 'input tokens', 'es-ES': 'tokens de entrada', 'de-DE': 'Eingabetokens' },
  },
  {
    source: /\btokens? de sortie\b/giu,
    marker: 'SBXOUTPUTTOKENS',
    translations: { en: 'output tokens', 'es-ES': 'tokens de salida', 'de-DE': 'Ausgabetokens' },
  },
] as const;

const numberPattern = /\d+(?:(?:[ \u00a0\u202f]\d{3})|(?:[.,]\d+))*/gu;
function numberTokens(text: string) {
  return [...text.matchAll(numberPattern)].map((match, index) => ({
    value: match[0],
    marker: `ZXQ${String(index)
      .split('')
      .map((digit) => String.fromCharCode(65 + Number(digit)))
      .join('')}QXZ`,
  }));
}

function protectedTranslation(text: string) {
  const prepared = terms.reduce((value, term) => value.replace(term.source, term.marker), text);
  const tokens = numberTokens(prepared);
  let index = 0;
  const withMarkers = prepared.replace(numberPattern, () => tokens[index++]?.marker ?? '');
  // Un suffixe numérique isolé après une virgule reste hors du moteur de langue.
  const suffixMatch = /,\s*(ZXQ[A-Z]+QXZ)([.!?]?)$/u.exec(withMarkers);
  const suffix = tokens.find((token) => token.marker === suffixMatch?.[1]);
  return {
    text: suffixMatch
      ? withMarkers.slice(0, suffixMatch.index) + (suffixMatch[2] ?? '')
      : withMarkers,
    tokens: tokens.filter((token) => token !== suffix),
    suffix,
  };
}

/** Protège les unités techniques et les valeurs numériques avant traduction. */
export function prepareNewsTranslation(text: string): string {
  return protectedTranslation(text).text;
}

export function restoreNewsTranslation(
  source: string,
  translated: string,
  locale: TranslationLocale,
): string {
  let value = translated;
  const prepared = prepareNewsTranslation(source);
  for (const term of terms) {
    const expected = prepared.split(term.marker).length - 1;
    const received = value.split(term.marker).length - 1;
    if (expected !== received) throw new Error(`Unité technique News perdue en ${locale}.`);
    value = value.replaceAll(term.marker, term.translations[locale]);
  }
  const { tokens, suffix } = protectedTranslation(source);
  const expected = tokens.map((token) => token.marker);
  const received = value.match(/ZXQ[A-Z]+QXZ/gu) ?? [];
  if (
    received.length !== expected.length ||
    expected.some((marker) => received.filter((entry) => entry === marker).length !== 1)
  )
    throw new Error(`Nombre protégé News perdu en ${locale}.`);
  for (const token of tokens) value = value.replaceAll(token.marker, token.value);
  if (suffix) {
    const punctuation = /[.!?]$/u.exec(value.trim())?.[0] ?? '';
    value = value.trim().replace(/[.!?]$/u, '') + `, ${suffix.value}${punctuation}`;
  }
  return value;
}

/** Un nombre absent de la traduction ne doit pas être publié silencieusement. */
export function newsTranslationKeepsNumbers(source: string, translated: string): boolean {
  const numbers = (text: string) =>
    (text.match(/\d+(?:[.,]\d+)*/gu) ?? []).map((value) => value.replaceAll(',', '.'));
  const remaining = numbers(translated);
  for (const number of numbers(source)) {
    const index = remaining.indexOf(number);
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  return true;
}
