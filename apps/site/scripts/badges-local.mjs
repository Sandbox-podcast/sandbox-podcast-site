// Démonstration locale volontaire, sans dépendance Playwright ni accès Neon.
import { writeFile } from 'node:fs/promises';
import { URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';
import { startBadgeFixture } from './badges-fixture-server.mjs';

const args = process.argv.slice(2).filter((value) => value !== '--');
if (args.length > 1 || (args[0] && !/^--port=\d{4,5}$/.test(args[0])))
  throw new Error('Usage : badges-local.mjs [--port=3100]');
const port = args[0] ? Number(args[0].slice(7)) : 3100;
if (port < 1024 || port > 65535) throw new Error('Port local invalide.');
const fixture = await startBadgeFixture({ kind: 'preview', port });
const routes = {
  charts: `${fixture.origin}/charts/github`,
  project: `${fixture.origin}/charts/project/${fixture.award.slug}#badges`,
  awards: `${fixture.origin}/charts/awards`,
  award: `${fixture.origin}/charts/awards/${fixture.award.week}`,
  extensions: fixture.extendedAwards.map((award) => ({
    type: award.type,
    scope: award.scope,
    page: `${fixture.origin}/charts/awards/edition/${award.id}`,
    svg: `${fixture.origin}/badges/awards/${award.id}.svg`,
  })),
};
await writeFile(
  new URL('preview.json', fixture.artifactDir),
  JSON.stringify(
    { fixture: true, database: 'PGlite éphémère sur loopback', pid: process.pid, routes },
    null,
    2,
  ),
);
log('DÉMONSTRATION LOCALE : tous les projets et leurs mesures sont des FIXTURES E2E.');
log('La base est en mémoire. Fermer le serveur efface ces données de démonstration.');
log(JSON.stringify(routes, null, 2));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await fixture.close();
  process.exit(0);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
