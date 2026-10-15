// Serveur de fixtures exclusivement sur loopback, partagé par la démonstration et les tests.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { once } from 'node:events';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';
import { PGlite } from '@electric-sql/pglite';
import { neonConfig, Pool } from '@neondatabase/serverless';
import { WebSocketServer, default as WebSocket } from 'ws';
import next from 'next';

export async function startBadgeFixture({ kind = 'e2e', port = 0 } = {}) {
  if (
    !['e2e', 'preview', 'public-routes', 'fronts'].includes(kind) ||
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65535
  )
    throw new Error('Configuration locale invalide.');
  const site = fileURLToPath(new URL('..', import.meta.url));
  const require = createRequire(import.meta.url);
  const artifactName = `${kind}-${process.pid}`;
  const artifactDir = new URL(`../.local/badges-${artifactName}/`, import.meta.url);
  await mkdir(artifactDir, { recursive: true });
  const pg = new PGlite();
  for (const migration of [
    '0000_editorial_records',
    '0001_admin_users',
    '0002_sandbox_charts',
    '0003_ranking_catalog_localization',
    '0004_site_content_localizations',
    '0005_external_chart_sources',
    '0006_manual_content_translations',
    '0007_daily_chart_editions',
    '0008_episode_thumbnails',
    '0010_chart_refresh_slots',
    '0011_host_photos',
    '0012_badges_awards',
    '0013_extended_awards',
    '0014_awards_refresh_slots',
  ]) {
    const sql = await readFile(new URL(`../drizzle/${migration}.sql`, import.meta.url), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint'))
      if (statement.trim()) await pg.exec(statement);
  }

  // Le pilote Neon parle son protocole habituel à une base PGlite locale de test.
  const proxy = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(proxy, 'listening');
  const proxyPort = proxy.address().port;
  let queue = Promise.resolve();
  function packet(type, body) {
    const size = Buffer.alloc(4);
    size.writeInt32BE(body.length + 4);
    return Buffer.concat([Buffer.from(type), size, body]);
  }
  proxy.on('connection', (socket) => {
    let startup = true;
    let pending = Buffer.alloc(0);
    socket.on('message', (data) => {
      pending = Buffer.concat([pending, data]);
      if (startup) {
        if (pending.length < 4 || pending.length < pending.readInt32BE(0)) return;
        pending = pending.subarray(pending.readInt32BE(0));
        startup = false;
        socket.send(
          Buffer.concat([
            packet('R', Buffer.alloc(4)),
            packet('S', Buffer.from('server_version\0' + '17.0\0')),
            packet('S', Buffer.from('client_encoding\0UTF8\0')),
            packet('S', Buffer.from('standard_conforming_strings\0on\0')),
            packet('K', Buffer.alloc(8)),
            packet('Z', Buffer.from('I')),
          ]),
        );
      }
      const packets = [];
      while (pending.length >= 5 && pending.length >= pending.readInt32BE(1) + 1) {
        const message = pending.subarray(0, pending.readInt32BE(1) + 1);
        pending = pending.subarray(message.length);
        if (message[0] === 88) {
          socket.close();
          continue;
        }
        if (message[0] === 112) continue;
        packets.push(Buffer.from(message));
      }
      if (packets.length) {
        queue = queue.then(async () => {
          const response = await pg.execProtocolRaw(Buffer.concat(packets));
          if (response.length && socket.readyState === WebSocket.OPEN) socket.send(response);
        });
        queue.catch((error) => {
          log('Local fixture protocol failed:', error.message);
          socket.close();
        });
      }
    });
  });
  // Next charge son propre module client : suivre aussi ses pools pour les fermer
  // avant le proxy, sans couper brutalement leurs connexions encore inactives.
  const pools = new Set();
  for (const PoolClass of new Set([Pool, require('@neondatabase/serverless').Pool])) {
    const connect = PoolClass.prototype.connect;
    PoolClass.prototype.connect = function (...args) {
      pools.add(this);
      return connect.apply(this, args);
    };
  }
  for (const config of [neonConfig, require('@neondatabase/serverless').neonConfig]) {
    config.webSocketConstructor = WebSocket;
    config.wsProxy = () => `127.0.0.1:${proxyPort}`;
    config.useSecureWebSocket = false;
    config.pipelineConnect = false;
  }
  process.env.DATABASE_URL = `postgres://fixture:fixture@127.0.0.1:${proxyPort}/fixture`;
  delete process.env.POSTGRES_URL;
  process.env.SITE_DATA_MODE = 'mock';
  // La démonstration ne peut lancer aucun collecteur ou service externe payant.
  for (const key of ['CRON_SECRET', 'GITHUB_TOKEN', 'OPENROUTER_API_KEY', 'BLOB_READ_WRITE_TOKEN'])
    process.env[key] = '';
  process.env.NODE_ENV = 'development';

  let app;
  let ready = false;
  const server = createServer((request, response) => {
    if (ready) void app.getRequestHandler()(request, response);
    else {
      response.writeHead(503, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end('Démonstration locale en préparation.');
    }
  });
  try {
    server.listen(port, '127.0.0.1');
    await once(server, 'listening');
  } catch (error) {
    await new Promise((resolve) => proxy.close(resolve));
    await pg.close();
    throw error;
  }
  const origin = `http://127.0.0.1:${server.address().port}`;
  process.env.SITE_URL = origin;
  // Les images de métadonnées Next en développement utilisent PORT pour leur origine.
  process.env.PORT = String(server.address().port);
  const { default: config } = await import('../next.config.ts');
  await writeFile(
    new URL('tsconfig.json', artifactDir),
    JSON.stringify({
      extends: '../../tsconfig.json',
      include: [
        '../../src/**/*.ts',
        '../../src/**/*.tsx',
        '../../next-env.d.ts',
        './next/types/**/*.ts',
        './next/dev/types/**/*.ts',
      ],
      exclude: ['../../node_modules'],
    }),
  );
  const testConfig = {
    ...config,
    allowedDevOrigins: ['127.0.0.1'],
    distDir: `.local/badges-${artifactName}/next`,
    serverExternalPackages: ['ws', '@neondatabase/serverless'],
    typescript: { tsconfigPath: `.local/badges-${artifactName}/tsconfig.json` },
  };
  // Le serveur personnalisé de Next 16 ne transmet pas son option conf au routeur.
  // Sa configuration résolue est donc injectée uniquement dans ce processus de test.
  const loadConfig = require('next/dist/server/config').default;
  const resolvedConfig = await loadConfig('phase-development-server', site, {
    customConfig: testConfig,
  });
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(resolvedConfig);
  app = next({ dev: true, dir: site, hostname: '127.0.0.1', port: server.address().port });

  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    ready = false;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await app.close();
    const { closeDb } = await import('../src/db/client.ts');
    await closeDb();
    await Promise.all([...pools].filter((pool) => !pool.ending).map((pool) => pool.end()));
    await queue;
    for (const client of proxy.clients) client.terminate();
    await new Promise((resolve) => proxy.close(resolve));
    await pg.close();
  }
  try {
    const { upsertDiscoveredRepositories, saveDailyBatch, saveScorecardBatch } =
      await import('../src/lib/charts-store.ts');
    const { calculateGithubWeek } = await import('../src/pipeline/github-jobs.ts');
    const { assignClosedRisingStars, readBadgeAwards } = await import('../src/lib/badges-store.ts');
    const { getDb } = await import('../src/db/client.ts');
    const { githubProjects } = await import('../src/db/schema.ts');
    const { awardSunday, parisWeek } = await import('../src/domain/badges.ts');
    const { previousWeek } = await import('../src/domain/weeks.ts');
    const today = new Date().toISOString().slice(0, 10);
    const sunday = awardSunday(previousWeek(parisWeek(new Date())));
    const days = [
      ...new Set(
        [today, sunday].flatMap((day) =>
          [0, 7, 14].map((offset) =>
            new Date(Date.parse(day) - offset * 86400000).toISOString().slice(0, 10),
          ),
        ),
      ),
    ].sort();
    const fixtureName = (index) =>
      index === 19 ? `fixture-project-19-${'a'.repeat(60)}` : `fixture-project-${index}`;
    process.env.CHARTS_REVIEWED_PROFILE_VERSIONS = 'github-reference-v3,rising-reference-v3';
    await upsertDiscoveredRepositories(
      Array.from({ length: 20 }, (_, index) => ({
        id: 900001 + index,
        name: fixtureName(index),
        full_name: `sandbox-e2e/${fixtureName(index)}`,
        owner: { login: 'sandbox-e2e' },
        description: 'FIXTURE E2E : données de test dans une base locale éphémère.',
        html_url: `https://github.com/sandbox-e2e/${fixtureName(index)}`,
        language: 'TypeScript',
        license: { spdx_id: 'MIT' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: `${today}T00:00:00Z`,
        pushed_at: `${today}T00:00:00Z`,
        default_branch: 'main',
        archived: false,
        fork: false,
        disabled: false,
        private: false,
        stargazers_count: 2000,
        forks_count: 100,
        open_issues_count: 1,
      })),
    );
    const db = getDb();
    await db
      .update(githubProjects)
      .set({ status: 'tracked', discoveredAt: '2026-01-01T00:00:00Z' });
    const repos = await db.select().from(githubProjects);
    await saveDailyBatch(
      repos.flatMap((repo, index) =>
        days.map((day) => {
          const age = (Date.parse(day) - Date.parse(days[0])) / 86400000;
          return {
            projectId: repo.id,
            date: day,
            stars: 1000 + age * age * (index + 1),
            forks: 50 + age * 2,
            watchers: null,
            openIssues: 1,
            contributors: null,
            commits: 5,
            releases: null,
            pushedAt: `${day}T00:00:00Z`,
            collectedAt: `${day}T02:00:00Z`,
          };
        }),
      ),
    );
    for (const day of [sunday, today]) {
      await saveScorecardBatch(
        repos.map((repo) => ({
          entityId: repo.entityId,
          fullName: repo.fullName,
          score: 7,
          overallScore: 7,
          checksUsed: 6,
          checkScores: {
            'Code-Review': 7,
            'Security-Policy': 7,
            'Dangerous-Workflow': 7,
            'Token-Permissions': 7,
            'Pinned-Dependencies': 7,
            Vulnerabilities: 7,
          },
          assessedOn: day,
          collectedAt: `${day}T02:15:00Z`,
        })),
      );
      const result = await calculateGithubWeek({ date: day });
      assert.equal(
        result.written,
        2,
        'Deux éditions réelles du moteur attendues dans la base de test',
      );
    }
    assert.equal((await assignClosedRisingStars()).created, 1);
    const [award] = await readBadgeAwards();
    assert.ok(award);
    const { seedExtendedAwardPreview } = await import('./fixtures/seed-awards.ts');
    const extendedAwards = ['preview', 'fronts'].includes(kind)
      ? await seedExtendedAwardPreview()
      : [];
    await app.prepare();
    ready = true;

    return {
      app,
      pg,
      origin,
      award,
      extendedAwards,
      seedExtensions: seedExtendedAwardPreview,
      artifactDir,
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
