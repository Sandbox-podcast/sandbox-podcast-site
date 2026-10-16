import assert from 'node:assert/strict';
import { log } from 'node:console';
import { readFile, readdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve('.next/server/app');
const traces = (await readdir(root, { recursive: true })).filter(
  (path) => /opengraph-image/.test(path) && path.endsWith('route.js.nft.json'),
);
assert.ok(traces.length > 0, 'Un build de production doit précéder ce contrôle.');
const expected = [
  'archivo-latin-900-normal.woff',
  'archivo-latin-800-normal.woff',
  'jetbrains-mono-latin-500-normal.woff',
  'jetbrains-mono-latin-700-normal.woff',
  'newsreader-latin-400-italic.woff',
];
for (const path of traces) {
  const file = resolve(root, path);
  const trace = JSON.parse(await readFile(file, 'utf8'));
  for (const name of expected) {
    const entry = trace.files.find((value) => value.endsWith('/' + name));
    assert.ok(entry, `${path} : police absente du déploiement ${name}`);
    await access(resolve(dirname(file), entry));
  }
}
log(`OpenGraph : ${traces.length} routes incluent leurs cinq polices dans le déploiement.`);
