import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import process from 'node:process';
import { chromium } from 'playwright';
import { startBadgeFixture } from './badges-fixture-server.mjs';

// Données et compte éphémères ; aucune publication ni requête YouTube réelle.
process.env.SANDBOX_FRONT_PREVIEW = '1';
process.env.SANDBOX_FRONT_CONTENT_FILE = `episode-publication-e2e-${process.pid}.json`;
process.env.SITE_ADMIN_SECRET = 'episode-publication-local-test-secret';
process.env.SANDBOX_NEWS_PUBLIC = '0';
process.env.SANDBOX_NEWS_PREVIEW = '0';
const output = new URL('../.local/episode-publication-e2e/', import.meta.url);
await mkdir(output, { recursive: true });
const fixture = await startBadgeFixture({ kind: 'fronts' });
let browser;
const report = { checks: [], browserErrors: [], remoteWrite: false };
try {
  const { loadContent } = await import('../src/lib/load.ts');
  const { editableContentSchema } = await import('../src/domain/admin-content.ts');
  const { createDatabaseAdmin } = await import('../src/lib/admin-users-store.ts');
  const { hashAdminPassword } = await import('../src/lib/admin-auth-db.ts');
  const content = editableContentSchema.parse(
    Object.fromEntries(Object.entries(loadContent()).filter(([key]) => key !== 'snapshots')),
  );
  content.episodes = [];
  await writeFile(
    new URL(`../.local/${process.env.SANDBOX_FRONT_CONTENT_FILE}`, import.meta.url),
    JSON.stringify({ published: content }),
  );
  await createDatabaseAdmin({
    username: 'lou',
    displayName: 'Lou',
    role: 'admin',
    passwordHash: hashAdminPassword('Episode-local-test-only-2026!'),
  });
  browser = await chromium.launch({
    headless: true,
    channel: process.platform === 'win32' ? 'msedge' : undefined,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(60_000);
  page.on('pageerror', (error) => report.browserErrors.push(error.message));
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === fixture.origin ? route.continue() : route.abort(),
  );
  await page.route('**/_next/image?**', (route) => {
    const source = new URL(route.request().url()).searchParams.get('url') ?? '';
    return source.includes('i.ytimg.com') || source.startsWith('/api/youtube-thumbnail/')
      ? route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="#143044"/><text x="30" y="140" fill="white" font-size="24">FIXTURE : miniature YouTube</text></svg>',
        })
      : route.continue();
  });
  const videoId = 'dQw4w9WgXcQ';
  await page.route('**/api/admin/youtube-metadata', (route) =>
    route.fulfill({
      json: {
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: 'FIXTURE : épisode sans date ni durée',
        channel: 'Sandbox',
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        source: 'oembed',
      },
    }),
  );
  await page.goto(`${fixture.origin}/admin`);
  await page.getByLabel('Identifiant', { exact: true }).fill('lou');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Episode-local-test-only-2026!');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await page.getByRole('button', { name: 'Déconnexion', exact: true }).waitFor();
  await page.getByRole('button', { name: /Nouvel épisode/ }).click();
  const addedAfter = Date.now();
  await page
    .getByLabel('Lien YouTube', { exact: false })
    .fill(`https://www.youtube.com/watch?v=${videoId}`);
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await page.getByText('Vidéo importée : Sandbox.', { exact: true }).waitFor();
  assert.equal(await page.locator('.episode-readiness').count(), 0);
  assert.equal(await page.locator('.episode-markdown-preview').count(), 0);
  assert.equal(await page.locator('iframe').count(), 0);
  await page.getByLabel("Titre de l'épisode", { exact: true }).fill('FIXTURE : titre corrigé');
  await page
    .getByLabel('Description et chapitres (facultatif)', { exact: false })
    .fill('00:00 Introduction\n12:34 Démonstration');
  await page.screenshot({ path: fileURLToPath(new URL('creation.png', output)), fullPage: true });
  async function publish() {
    const response = page.waitForResponse(
      (entry) => entry.url().endsWith('/api/admin/content') && entry.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Publier l’épisode', exact: true }).click();
    const result = await response;
    assert.equal(result.status(), 200, await result.text());
  }
  await publish();
  let stored = await (await page.request.get(`${fixture.origin}/api/admin/content`)).json();
  const episode = stored.content.episodes.find((entry) => entry.platforms.youtubeId === videoId);
  assert.ok(episode);
  assert.equal(episode.title, 'FIXTURE : titre corrigé');
  assert.equal(episode.durationSec, undefined);
  assert.ok(Date.parse(episode.publishedAt) >= addedAfter);
  assert.ok(Date.parse(episode.publishedAt) <= Date.now());
  assert.equal(episode.chapters.length, 2);
  report.checks.push(
    'Création publiée sans date ni durée ; titre modifiable, date d’ajout et chapitres conservés.',
  );
  await page.getByLabel('Date de publication (facultatif)', { exact: true }).fill('');
  await publish();
  stored = await (await page.request.get(`${fixture.origin}/api/admin/content`)).json();
  assert.equal(
    stored.content.episodes.find((entry) => entry.number === episode.number).publishedAt,
    episode.publishedAt,
  );
  report.checks.push('Une republication avec date vide conserve la date enregistrée.');
  const episodeUrl = `${fixture.origin}/episodes/${episode.number}`;
  // La lecture éditoriale publique possède un cache court de cinq secondes.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if ((await page.request.get(episodeUrl)).status() === 200) break;
    await delay(500);
  }
  assert.equal((await page.goto(episodeUrl)).status(), 200);
  const consent = page.getByRole('button', { name: 'Refuser', exact: true });
  if (await consent.count()) await consent.click();
  await page.getByRole('button', { name: /Lire.*vidéo|Lancer.*vidéo|Regarder.*vidéo/ }).click();
  assert.ok((await page.locator('iframe').getAttribute('src')).includes(videoId));
  await page.getByRole('link', { name: /Démonstration/ }).click();
  assert.ok(page.url().includes('t=754'));
  assert.equal(await page.locator('body').getByText('NaN').count(), 0);
  report.checks.push('Lecteur iframe et lien de chapitre accessibles sans durée.');
  for (const path of ['/news', '/en/news', '/es-es/news', '/de-de/news']) {
    const response = await page.goto(fixture.origin + path);
    assert.equal(response.status(), 404);
    assert.ok(
      (await page.locator('meta[name="robots"]').first().getAttribute('content')).includes(
        'noindex',
      ),
    );
  }
  await page.goto(fixture.origin);
  assert.equal(await page.locator('a[href="/news"]').count(), 0);
  assert.equal(await page.locator('[data-object="news"]').count(), 0);
  await page.screenshot({
    path: fileURLToPath(new URL('accueil-radar.png', output)),
    fullPage: true,
  });
  report.checks.push(
    'News FR/EN/ES/DE et les accès de l’accueil restent fermés sans contenu public.',
  );
  assert.deepEqual(report.browserErrors, []);
  await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report));
} catch (error) {
  process.stderr.write(String(error));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await fixture.close();
  process.exit(process.exitCode ?? 0);
}
