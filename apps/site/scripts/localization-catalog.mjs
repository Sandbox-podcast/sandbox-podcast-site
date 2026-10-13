import ts from 'typescript';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from 'node:console';
import { SITE_LOCALES, localeRouteSegment } from '../src/i18n/locales.ts';
import { rankingMessages } from '../src/i18n/ranking-messages.ts';
import { parseInline } from '../src/domain/markup.ts';

const site = dirname(dirname(fileURLToPath(import.meta.url)));
const walk = (path) =>
  readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)],
  );
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
const sources = new Map();
const implementationStrings = new Set([
  'use client',
  'Escape',
  'min',
  'px',
  'sc-studio',
  'tag tag-hl',
  'tag tag-line',
]);
const add = (text, file) => {
  const key = normalize(text);
  if (
    !key ||
    implementationStrings.has(key) ||
    !/\p{L}/u.test(key) ||
    /^https?:|^\/|^@|^--|^var\(|^rgb\(|^clamp\(|^cubic-bezier\(|^\(max-width|^\(prefers-reduced|^\d+px/.test(
      key,
    ) ||
    /(?:^|\s)(?:bg-|text-|font-|border-|items-|leading-|md:|xl:|gap-|max-|min-|py-|p-)/.test(key)
  )
    return;
  const paths = sources.get(key) ?? new Set();
  paths.add(relative(site, file).replaceAll('\\', '/'));
  sources.set(key, paths);
};
const fields = new Set([
  'title',
  'description',
  'dek',
  'text',
  'label',
  'note',
  'tagline',
  'bio',
  'role',
  'kicker',
  'summary',
  'intro',
  'introduction',
  'caption',
  'reason',
  'limitations',
  'commentary',
  'strapline',
  'heroTitle',
  'heroDek',
  'heroEyebrow',
  'category',
  'alt',
  'cite',
]);
const collectJson = (value, file, field = '') => {
  if (typeof value === 'string' && (fields.has(field) || field === 'items')) {
    add(value, file);
    const collectNodes = (nodes) =>
      nodes.forEach((node) => {
        if (node.t === 'text') add(node.v, file);
        if ('c' in node) collectNodes(node.c);
      });
    collectNodes(parseInline(value));
  } else if (Array.isArray(value)) value.forEach((item) => collectJson(item, file, field));
  else if (value && typeof value === 'object')
    Object.entries(value).forEach(([key, item]) => collectJson(item, file, key));
};

for (const file of walk(join(site, 'content')).filter(
  (file) => file.endsWith('.json') && !file.includes(`${join('content', 'stories')}`),
))
  collectJson(JSON.parse(readFileSync(file, 'utf8')), file);
for (const file of [
  ...walk(join(site, 'src/app/(fr)')),
  ...walk(join(site, 'src/components')),
  ...walk(join(site, 'src/domain')),
  join(site, 'src/i18n/messages.ts'),
].filter(
  (file) =>
    /\.tsx?$/.test(file) &&
    !/admin|episode-composer|site-settings-editor|opengraph-image|localization|localized-pages|content-translation/.test(
      file,
    ),
)) {
  const parsed = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const visit = (node) => {
    if (ts.isJsxText(node)) add(node.text, file);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      const ignored =
        ts.isImportDeclaration(parent) ||
        (ts.isJsxAttribute(parent) &&
          [
            'className',
            'href',
            'id',
            'src',
            'as',
            'type',
            'name',
            'value',
            'htmlFor',
            'sizes',
            'allow',
            'rel',
            'd',
            'role',
            'data-tone',
            'key',
          ].includes(parent.name.getText(parsed)));
      if (!ignored && (/[\sÀ-ÿ]/.test(node.text) || /^[A-ZÀ-Ý][a-zà-ÿ]+[.!?]?$/.test(node.text)))
        add(node.text, file);
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
}
const dictionaries = join(site, 'src/i18n/dictionaries');
mkdirSync(dictionaries, { recursive: true });
const englishDictionary = join(dictionaries, 'en.json');
if (existsSync(englishDictionary)) {
  // Les modèles rédigés manuellement gardent les noms de paramètres, y compris quand
  // leur texte d'origine est construit par plusieurs expressions TypeScript.
  for (const key of Object.keys(JSON.parse(readFileSync(englishDictionary, 'utf8'))))
    if (/\{[a-zA-Z][a-zA-Z0-9]*\}/.test(key)) add(key, englishDictionary);
}
const french = rankingMessages('fr-FR');
for (const target of SITE_LOCALES) {
  if (target.locale === 'fr-FR') continue;
  const file = join(dictionaries, `${localeRouteSegment(target.locale)}.json`);
  const translated = rankingMessages(target.locale);
  const dictionary = {};
  for (const key of Object.keys(french).filter((key) => key !== 'sourceLocale'))
    dictionary[french[key]] = translated[key];
  dictionary['Classements'] = translated.rankings;
  dictionary['Les classements'] = translated.rankings;
  dictionary['Dernière mise à jour :'] = translated.updated;
  dictionary['Méthode'] = translated.methodology;
  dictionary['Position'] = translated.rank;
  dictionary['Sources'] = translated.source;
  dictionary['Limites'] = translated.limitations;
  dictionary['Mouvements'] = translated.movement;
  if (existsSync(file)) Object.assign(dictionary, JSON.parse(readFileSync(file, 'utf8')));
  writeFileSync(file, JSON.stringify(dictionary, null, 2) + '\n');
}
const catalog = Object.fromEntries(
  [...sources]
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([key, paths]) => [key, { translation: '', sources: [...paths] }]),
);
writeFileSync(join(dictionaries, 'source-catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
const imports = SITE_LOCALES.filter((target) => target.locale !== 'fr-FR')
  .map(
    (target) =>
      `  '${target.locale}': () => import('./dictionaries/${localeRouteSegment(target.locale)}.json').then(module => module.default),`,
  )
  .join('\n');
writeFileSync(
  join(site, 'src/i18n/dictionary-loaders.ts'),
  `// Généré par scripts/localization-catalog.mjs.\nimport type { TranslationDictionary } from './translation';\nexport const dictionaryLoaders: Record<string, () => Promise<TranslationDictionary>> = {\n${imports}\n};\n`,
);
log(`${sources.size} textes sources et ${SITE_LOCALES.length - 1} dictionnaires locaux.`);
