import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { log } from 'node:console';
import next from 'next';
const { fetch } = globalThis;

// Ce test n'ouvre aucune connexion à la base, même si .env.local en configure une.
process.env.DATABASE_URL = '';
process.env.POSTGRES_URL = '';
process.env.NODE_ENV = 'production';
const app = next({ dev: false, dir: process.cwd(), hostname: '127.0.0.1' });
const server = createServer(app.getRequestHandler());
await mkdir('.local/badges-e2e', { recursive: true });
try {
  await app.prepare();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const invalid = await fetch(`${origin}/badges/github/invalid/rank.svg`);
  assert.equal(invalid.status, 400);
  assert.match(invalid.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(invalid.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(invalid.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(invalid.headers.get('set-cookie'), null);
  const invalidWeek = await fetch(`${origin}/badges/github/123/rising-star/invalid.svg`);
  assert.equal(invalidWeek.status, 400);
  assert.doesNotMatch(await invalidWeek.text(), /RISING STAR/);
  const unavailable = await fetch(`${origin}/badges/github/123/rank.svg`);
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await unavailable.text(), /TOP 100/);
  const head = await fetch(`${origin}/badges/github/invalid/rank.svg`, { method: 'HEAD' });
  assert.equal(head.status, 400);
  assert.equal(await head.text(), '');
  const award = await fetch(`${origin}/badges/github/123/rising-star/2026-W41.svg`);
  assert.equal(award.status, 503);
  assert.doesNotMatch(await award.text(), /RISING STAR/);
  const image = await fetch(`${origin}/api/awards/2026-W41/image`);
  assert.equal(image.status, 503);
  assert.equal(image.headers.get('cache-control'), 'no-store');
  assert.match(image.headers.get('content-type'), /text\/plain/);
  assert.equal(image.headers.get('set-cookie'), null);
  const invalidImage = await fetch(`${origin}/api/awards/invalid/image`);
  assert.equal(invalidImage.status, 400);
  const id = '11111111-1111-4111-8111-111111111111';
  const invalidExtended = await fetch(`${origin}/badges/awards/invalid.svg`);
  assert.equal(invalidExtended.status, 400);
  assert.match(invalidExtended.headers.get('content-security-policy'), /default-src 'none'/);
  const extended = await fetch(`${origin}/badges/awards/${id}.svg`);
  assert.equal(extended.status, 503);
  assert.equal(extended.headers.get('cache-control'), 'no-store');
  assert.equal(extended.headers.get('set-cookie'), null);
  assert.match(await extended.text(), /DATA UNAVAILABLE/);
  const extendedHead = await fetch(`${origin}/badges/awards/${id}.svg`, { method: 'HEAD' });
  assert.equal(extendedHead.status, 503);
  assert.equal(await extendedHead.text(), '');
  const extendedImage = await fetch(`${origin}/api/awards/edition/${id}/image`);
  assert.equal(extendedImage.status, 503);
  assert.equal(extendedImage.headers.get('cache-control'), 'no-store');
  assert.match(extendedImage.headers.get('content-type'), /text\/plain/);
  assert.equal((await fetch(`${origin}/api/awards/edition/invalid/image`)).status, 400);
  await writeFile(
    '.local/badges-e2e/production-http.json',
    JSON.stringify(
      {
        status: 'passed',
        database: 'disabled',
        checks: [
          '400-parameters',
          '400-award-week',
          'svg-mime',
          'restrictive-csp',
          'nosniff',
          'no-session-cookie',
          '503-no-store',
          'neutral-ranking',
          'neutral-award',
          'head',
          'social-image-503-no-store',
          'social-image-invalid-week-400',
          'extension-invalid-id-400',
          'extension-restrictive-csp',
          'extension-neutral-503-no-store',
          'extension-head',
          'extension-social-image-503-no-store',
          'extension-social-image-invalid-id-400',
        ],
      },
      null,
      2,
    ),
  );
  log('Production badge HTTP checks passed, without database access.');
} catch (error) {
  process.exitCode = 1;
  log('Production badge HTTP checks failed:', error.message);
} finally {
  await app.close();
  server.closeAllConnections();
  await new Promise((resolve) => {
    server.close(resolve);
  });
}
