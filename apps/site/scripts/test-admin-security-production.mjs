import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { log } from 'node:console';
import next from 'next';
const { fetch } = globalThis;

// Only disposable credentials and loopback; never open a real database connection.
process.env.DATABASE_URL = '';
process.env.POSTGRES_URL = '';
process.env.NODE_ENV = 'production';
process.env.SITE_ADMIN_SECRET = randomBytes(32).toString('hex');
process.env.SITE_ADMIN_USERS = JSON.stringify([
  { username: 'fixture', passwordHash: `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}` },
]);
let app;
const server = createServer((request, response) => app.getRequestHandler()(request, response));
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  app = next({
    dev: false,
    dir: process.cwd(),
    hostname: 'localhost',
    port: server.address().port,
  });
  await app.prepare();
  const origin = `http://localhost:${server.address().port}`;
  const nonces = [];
  for (let index = 0; index < 2; index += 1) {
    const response = await fetch(`${origin}/admin`, {
      headers: { 'x-nonce': 'attacker-supplied-nonce' },
    });
    assert.equal(response.status, 200);
    const policy = response.headers.get('content-security-policy');
    const scriptPolicy = policy.split(';').find((part) => part.trim().startsWith('script-src '));
    assert.doesNotMatch(scriptPolicy, /unsafe-inline|unsafe-eval|attacker-supplied/);
    assert.match(scriptPolicy, /'strict-dynamic'/);
    assert.match(policy, /script-src-attr 'none'/);
    assert.match(response.headers.get('cache-control'), /private.*no-store/);
    const nonce = /'nonce-([^']+)'/.exec(scriptPolicy)?.[1];
    assert.ok(nonce && Buffer.from(nonce, 'base64').length === 16);
    nonces.push(nonce);
    const html = await response.text();
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)];
    assert.ok(scripts.length > 0);
    for (const [, attributes] of scripts) {
      if (/type="application\/ld\+json"/.test(attributes)) continue;
      assert.ok(
        attributes.includes(`nonce="${nonce}"`),
        `Script without response nonce: ${attributes}`,
      );
    }
  }
  assert.notEqual(nonces[0], nonces[1]);
  const login = await fetch(`${origin}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ username: 'fixture', password: 'disposable-test' }),
  });
  assert.equal(login.status, 503);
  assert.match((await login.json()).error, /Protection des connexions indisponible/);
  assert.equal(login.headers.get('set-cookie'), null);
  const publicPage = await fetch(`${origin}/`);
  assert.equal(publicPage.status, 200);
  assert.match(publicPage.headers.get('content-security-policy'), /script-src-attr 'none'/);
  assert.doesNotMatch(publicPage.headers.get('content-security-policy'), /nonce-/);
  await mkdir('.local/admin-security', { recursive: true });
  await writeFile(
    '.local/admin-security/production-http.json',
    JSON.stringify(
      {
        status: 'passed',
        database: 'disabled',
        checks: [
          'fresh-128-bit-nonces',
          'client-nonce-overwritten',
          'all-executable-scripts-have-nonce',
          'no-inline-or-eval-script-permission',
          'inline-handlers-blocked',
          'private-no-store',
          'login-fails-closed-without-database',
          'no-session-cookie',
          'public-isr-preserved',
        ],
      },
      null,
      2,
    ),
  );
  log('Production admin security HTTP checks passed, without database access.');
} catch (error) {
  process.exitCode = 1;
  log('Production admin security HTTP checks failed:', error.message);
} finally {
  await app?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
