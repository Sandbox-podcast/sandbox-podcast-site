import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { log } from 'node:console';
import { newsAutomationCycle } from '../src/domain/automation-watchdog.ts';

const { Response } = globalThis;

const require = createRequire(import.meta.url);
const {
  Miniflare,
  convertV4MiniflareOptions,
} = require('../.local/watchdog-tools/node_modules/miniflare');
const bundle = fileURLToPath(new URL('../.local/watchdog/bundle/worker.js', import.meta.url));
const output = fileURLToPath(new URL('../.local/watchdog/', import.meta.url));
await mkdir(output, { recursive: true });
assert.ok((await readFile(bundle, 'utf8')).includes('SandboxAutomationWatchdog'));
// L'horloge est gelée dans un module de recette séparé ; le bundle produit reste intact.
const testEntry = join(output, 'test-entry.mjs');
await writeFile(
  testEntry,
  `
import worker, { SandboxAutomationWatchdog } from './bundle/worker.js';
const NativeDate = Date;
let testNow = '2026-10-20T04:00:00Z';
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [testNow])); }
  static now() { return NativeDate.parse(testNow); }
};
export { SandboxAutomationWatchdog };
export default {
  ...worker,
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/_test/clock') {
      testNow = await request.text();
      return new Response(null, { status: 204 });
    }
    return worker.fetch(request, env);
  },
};
`,
);
const persistence = await mkdtemp(join(tmpdir(), 'sandbox-watchdog-'));
const calls = [];
const checks = [];
const instant = new Date('2026-10-20T04:00:00Z');
const cycle = newsAutomationCycle(instant);
const slot = `${instant.toISOString().slice(0, 10)}T${instant.getUTCHours() < 12 ? '00' : '12'}:00Z`;
const discoveryStart = new Date(instant);
discoveryStart.setUTCHours(1, 17, 0, 0);
let stale = false;
const outbound = async (request) => {
  const url = new URL(request.url);
  calls.push({ method: request.method, url: request.url });
  assert.ok(['api.github.com', 'www.sandboxpodcast.fr'].includes(url.hostname));
  if (url.hostname === 'www.sandboxpodcast.fr')
    assert.equal(request.headers.has('authorization'), false);
  if (url.pathname === '/api/news')
    return Response.json({
      checkedAt: stale ? '2026-01-01T00:00:00Z' : instant.toISOString(),
      sources: [{ ok: true }],
      items: [{ id: 'fixture', publishedAt: '2026-01-01T00:00:00Z' }],
    });
  if (url.pathname.startsWith('/api/charts/')) {
    const chart = url.pathname.split('/')[3];
    return Response.json({
      chart,
      weekId: slot,
      publishedAt: new Date(instant.getTime() - 60_000).toISOString(),
      entries: [{ rank: 1 }],
    });
  }
  if (request.method === 'POST') {
    const body = await request.json();
    assert.deepEqual(body, { ref: 'main', inputs: { mode: 'due' } });
    return new Response(null, { status: 204 });
  }
  assert.equal(url.hostname, 'api.github.com');
  const discovery = url.pathname.includes('charts-refresh.yml');
  const createdAt = discoveryStart.toISOString();
  return Response.json({
    workflow_runs:
      discovery && discoveryStart.getTime() <= instant.getTime()
        ? [
            {
              id: 1,
              head_branch: 'main',
              repository: { full_name: 'Sandbox-podcast/sandbox-podcast-site' },
              head_repository: { full_name: 'Sandbox-podcast/sandbox-podcast-site' },
              path: '.github/workflows/charts-refresh.yml',
              display_title: 'SANDBOX CHARTS discovery',
              event: 'workflow_dispatch',
              status: 'completed',
              conclusion: 'success',
              created_at: createdAt,
              updated_at: createdAt,
            },
          ]
        : [],
  });
};
const options = (enabled) =>
  convertV4MiniflareOptions({
    modules: [
      {
        type: 'ESModule',
        path: testEntry,
        contents: require('node:fs').readFileSync(testEntry, 'utf8'),
      },
      { type: 'ESModule', path: bundle, contents: require('node:fs').readFileSync(bundle, 'utf8') },
    ],
    modulesRoot: output,
    compatibilityDate: '2026-10-20',
    bindings: {
      ENABLED: String(enabled),
      DRY_RUN: 'false',
      GITHUB_ACTIONS_TOKEN: 'fixture-token-not-real',
    },
    durableObjects: { WATCHDOG: { className: 'SandboxAutomationWatchdog', useSQLite: true } },
    resourcePersistencePath: persistence,
    outboundService: outbound,
  });
let emulator = new Miniflare(options(true));
try {
  assert.equal((await emulator.dispatchFetch('https://local.test/health')).status, 503);
  for (const path of ['/tick', '/', '/health'])
    assert.equal(
      (await emulator.dispatchFetch(`https://local.test${path}`, { method: 'POST' })).status,
      404,
    );
  checks.push(
    'Le contrôle public est en échec avant son premier passage et aucun POST public ne déclenche le travail.',
  );
  let namespace = await emulator.getDurableObjectNamespace('WATCHDOG');
  let stub = namespace.get(namespace.idFromName('sandbox-production'));
  const first = await stub.fetch('https://watchdog.internal/tick', { method: 'POST' });
  if (first.status !== 200) log({ calls, report: await first.clone().json() });
  assert.equal(first.status, 200);
  assert.equal((await emulator.dispatchFetch('https://local.test/health')).status, 200);
  assert.equal(calls.filter((call) => call.method === 'POST').length, 0);
  checks.push(
    'Le vrai Worker et son stockage SQLite reconnaissent les données fraîches sans dispatch.',
  );
  stale = true;
  await Promise.all(
    Array.from({ length: 3 }, () =>
      stub.fetch('https://watchdog.internal/tick', { method: 'POST' }),
    ),
  );
  const due = instant.getTime() >= Date.parse(cycle.dueAt);
  assert.equal(due, true, 'La recette doit réellement provoquer le dispatch.');
  assert.equal(calls.filter((call) => call.method === 'POST').length, due ? 1 : 0);
  if (due) {
    const pending = await emulator.dispatchFetch('https://local.test/health');
    assert.equal(pending.status, 202);
    assert.deepEqual(await pending.json(), {
      ok: false,
      schedulerOk: true,
      dataFresh: null,
      checkedAt: (await (await stub.fetch('https://watchdog.internal/health')).json()).checkedAt,
      enabled: true,
      recent: true,
    });
  }
  checks.push('Trois passages concurrents partagent une seule réservation persistante.');
  await emulator.dispose();
  emulator = new Miniflare(options(true));
  namespace = await emulator.getDurableObjectNamespace('WATCHDOG');
  stub = namespace.get(namespace.idFromName('sandbox-production'));
  await stub.fetch('https://watchdog.internal/tick', { method: 'POST' });
  assert.equal(calls.filter((call) => call.method === 'POST').length, due ? 1 : 0);
  checks.push(
    'Le redémarrage du runtime conserve le cooldown SQLite et ne redéclenche pas le même travail.',
  );
  for (const [time, status] of [
    ['2026-10-21T04:00:00Z', 202],
    ['2026-10-21T07:00:00Z', 202],
    ['2026-10-21T07:00:01Z', 503],
  ]) {
    await emulator.dispatchFetch('https://local.test/_test/clock', { method: 'POST', body: time });
    assert.equal((await emulator.dispatchFetch('https://local.test/health')).status, status);
  }
  checks.push(
    'Le contrôle quotidien reste récent pendant vingt-sept heures puis signale le retard.',
  );
  await emulator.dispose();
  emulator = new Miniflare(options(false));
  namespace = await emulator.getDurableObjectNamespace('WATCHDOG');
  stub = namespace.get(namespace.idFromName('sandbox-production'));
  const before = calls.length;
  await stub.fetch('https://watchdog.internal/tick', { method: 'POST' });
  assert.equal(calls.length, before);
  assert.equal((await emulator.dispatchFetch('https://local.test/health')).status, 503);
  checks.push(
    'Désactiver le service coupe tous les appels réseau et son état public reste explicite.',
  );
  await writeFile(
    join(output, 'worker-report.json'),
    JSON.stringify({ checks, remoteWrite: false }, null, 2),
  );
  log(`${checks.length} contrôles Worker/SQLite réussis, sans accès distant.`);
} finally {
  await emulator.dispose();
}
