import { z } from 'zod';

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Une heure sans fuseau reste une date au jour ; aucune heure n'est inventée. */
export function newsPublicationDate(raw: string, year?: string): string | undefined {
  const value = raw.trim();
  const normalized = value
    .replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
    .replace(/T(\d{2}:\d{2})(Z|[+-]\d{2}:\d{2})$/, 'T$1:00$2');
  if (z.iso.datetime({ offset: true }).safeParse(normalized).success)
    return new Date(normalized).toISOString();
  const iso = /\b(\d{4})[-/年](\d{2})[-/月](\d{2})(?:日|(?=T)|\b)/u.exec(value);
  let date = iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : undefined;
  if (!date) {
    const text =
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i.exec(
        value,
      );
    const reversed =
      /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{4})\b/i.exec(
        value,
      );
    const month = (text?.[1] ?? reversed?.[2])?.slice(0, 3).toLowerCase();
    const day = text?.[2] ?? reversed?.[1];
    const fullYear = text?.[3] ?? reversed?.[3] ?? year;
    if (month && day && fullYear)
      date = `${fullYear}-${String(months.indexOf(month) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return date && z.iso.date().safeParse(date).success ? date : undefined;
}
