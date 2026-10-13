import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from 'node:console';
import { argv } from 'node:process';
import { SITE_LOCALES, localeRouteSegment } from '../src/i18n/locales.ts';

const dictionaries = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  'src/i18n/dictionaries',
);
const catalog = JSON.parse(readFileSync(join(dictionaries, 'source-catalog.json'), 'utf8'));
const requestedLocale = argv.find((argument) => argument.startsWith('--locale='))?.slice(9);
const targets = SITE_LOCALES.filter(
  (target) => target.locale !== 'fr-FR' && (!requestedLocale || target.locale === requestedLocale),
);
if (!targets.length)
  throw new Error('Locale absente du registre SANDBOX. Utilisez son tag canonique.');
const sourceKeys = Object.keys(catalog);
const results = targets.map(({ locale, name }) => {
  const dictionary = JSON.parse(
    readFileSync(join(dictionaries, `${localeRouteSegment(locale)}.json`), 'utf8'),
  );
  const missing = sourceKeys.filter((key) => !dictionary[key]?.trim());
  return {
    locale,
    name,
    filled: sourceKeys.length - missing.length,
    total: sourceKeys.length,
    missing: argv.includes('--missing')
      ? Object.fromEntries(missing.map((key) => [key, catalog[key]]))
      : missing.length,
  };
});
log(JSON.stringify(results, null, 2));
