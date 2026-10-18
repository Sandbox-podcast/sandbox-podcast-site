/* global document, innerWidth */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';
import { chromium } from 'playwright';
import { startBadgeFixture } from './badges-fixture-server.mjs';
import { NEWS_MEDIA } from '../src/domain/news-media.ts';

const { fetch } = globalThis;

// Tous les enregistrements sont des fixtures, dans la base PGlite éphémère locale.
const fixture = await startBadgeFixture();
assert.equal(new URL(fixture.origin).hostname, '127.0.0.1');
const output = new URL('../.local/news-e2e/', import.meta.url);
await mkdir(output, { recursive: true });
const report = { checks: [], browserErrors: [] };
const paths = [
  ['fr-FR', '/news'],
  ['en', '/en/news'],
  ['es-ES', '/es-es/news'],
  ['de-DE', '/de-de/news'],
];
const titles = {
  'fr-FR': 'FIXTURE FR : un modèle de test.',
  en: 'FIXTURE EN: a test model.',
  'es-ES': 'FIXTURE ES: un modelo de prueba.',
  'de-DE': 'FIXTURE DE: ein Testmodell.',
};
const synopses = {
  'fr-FR': [
    'Ceci est une fiche de test locale.',
    'Elle vérifie le parcours de publication.',
    'Aucune actualité réelle ne lui est attribuée.',
  ],
  en: [
    'This is a local test item.',
    'It checks the publishing flow.',
    'It does not describe real news.',
  ],
  'es-ES': [
    'Esta es una ficha de prueba local.',
    'Comprueba el proceso de publicación.',
    'No describe noticias reales.',
  ],
  'de-DE': [
    'Dies ist ein lokaler Testeintrag.',
    'Er prüft den Veröffentlichungsablauf.',
    'Er beschreibt keine echten Nachrichten.',
  ],
};
let browser;
try {
  const migration = await readFile(
    new URL('../drizzle/0016_sandbox_news_autopublishing.sql', import.meta.url),
    'utf8',
  );
  for (const sql of migration.split('--> statement-breakpoint'))
    if (sql.trim()) await fixture.pg.exec(sql);
  process.env.CRON_SECRET = randomBytes(32).toString('hex');
  process.env.SANDBOX_NEWS_PREVIEW = '0';
  process.env.SANDBOX_NEWS_PUBLIC = '0';
  const endpoint = `${fixture.origin}/api/cron/news-ingest`;
  const headers = { authorization: `Bearer ${process.env.CRON_SECRET}` };
  for (const [, path] of paths) {
    assert.equal((await fetch(fixture.origin + path)).status, 404);
  }
  assert.equal((await fetch(endpoint, { headers })).status, 404);
  report.checks.push('Le drapeau fermé protège les quatre pages et l’API.');

  process.env.SANDBOX_NEWS_PUBLIC = '1';
  assert.equal((await fetch(endpoint)).status, 401);
  assert.equal(
    (await fetch(endpoint, { headers: { authorization: 'Bearer invalid' } })).status,
    401,
  );
  const deniedPost = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(deniedPost.status, 401);
  report.checks.push('Le secret est obligatoire en lecture et en écriture.');

  browser = await chromium.launch({
    headless: true,
    channel:
      process.env.SANDBOX_NEWS_BROWSER_CHANNEL ??
      (process.platform === 'win32' ? 'msedge' : undefined),
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === fixture.origin ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => report.browserErrors.push(error.message));
  async function visit(path, indexable) {
    const response = await page.goto(fixture.origin + path, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, path);
    assert.equal(
      new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).pathname,
      path,
    );
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    assert.equal(robots.includes('noindex'), !indexable, `${path}: ${robots}`);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      true,
      path,
    );
  }

  for (const [, path] of paths) {
    await visit(path, false);
    const consent = page.getByRole('button', { name: 'Refuser', exact: true });
    if (await consent.count()) await consent.click();
    assert.equal(await page.locator('ol details').count(), 0);
    assert.equal(await page.locator('p[role="status"]').count(), 0);
    const linkedData = await page.locator('script[type="application/ld+json"]').allTextContents();
    assert.ok(linkedData.every((value) => !value.includes('CollectionPage')));
  }
  report.checks.push('Les quatre flux vides répondent 200 avec attente et noindex.');

  const now = new Date().toISOString();
  const source = NEWS_MEDIA[1];
  const item = {
    id: `${source.id}:/articles/local-news-e2e-fixture`,
    project: source.name,
    repository: new URL(source.url).hostname,
    version: 'article',
    url: new URL('/articles/local-news-e2e-fixture', source.url).href,
    publishedAt: now,
    category: 'models',
    prerelease: false,
    kind: 'article',
    headline: titles.en,
    titles,
    synopses,
    editorialSourceHash: 'a'.repeat(64),
  };
  const payload = {
    checkedAt: now,
    sources: NEWS_MEDIA.map((media) => ({
      id: media.id,
      name: media.name,
      url: media.url,
      ok: true,
    })),
    items: [{ item, sourceExcerptHash: 'b'.repeat(64) }],
  };
  const post = () =>
    fetch(endpoint, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  const first = await post();
  assert.equal(first.status, 200, await first.clone().text());
  assert.equal((await first.json()).inserted, 1);
  const duplicate = await post();
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).inserted, 0);
  assert.deepEqual((await (await fetch(endpoint, { headers })).json()).urls, [item.url]);
  report.checks.push('L’API persiste la fiche dans Postgres et évite un second enregistrement.');

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [locale, path] of paths) {
      await visit(path, true);
      const row = page.locator('ol details').filter({ hasText: titles[locale] });
      assert.equal(await row.count(), 1);
      await row.locator('summary').click();
      assert.ok((await row.innerText()).includes(synopses[locale].join(' ')));
      assert.equal(await row.locator('a').getAttribute('href'), item.url);
      const alternates = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((nodes) => nodes.map((node) => new URL(node.href).pathname));
      for (const [, alternate] of paths) assert.ok(alternates.includes(alternate));
      if (locale === 'fr-FR')
        await page.screenshot({
          path: fileURLToPath(new URL(`published-${viewport.width}.png`, output)),
        });
    }
  }
  report.checks.push(
    'Les huit pages desktop/mobile rendent titre, trois phrases, source, canonique et hreflang.',
  );
  await page.goto(fixture.origin + '/news', { waitUntil: 'networkidle' });
  await page.locator('input[type="search"]').fill('no-fixture-matches-this');
  await page.waitForFunction(() => document.querySelectorAll('ol details').length === 0);
  await page.getByRole('button', { name: 'Effacer les filtres' }).click();
  await page.waitForFunction(() => document.querySelectorAll('ol details').length === 1);
  await page.getByRole('button', { name: 'Filtres', exact: true }).click();
  await page.locator('select').first().selectOption(NEWS_MEDIA[0].name);
  await page.waitForFunction(() => document.querySelectorAll('ol details').length === 0);
  await page.getByRole('button', { name: 'Effacer les filtres' }).click();
  await page.waitForFunction(() => document.querySelectorAll('ol details').length === 1);
  report.checks.push(
    'La recherche, le filtre média et leur réinitialisation fonctionnent dans le navigateur.',
  );

  // Simulation de panne réservée à la base de test créée par ce processus.
  await fixture.pg.exec('DROP TABLE news_items');
  for (const [, path] of paths) {
    await visit(path, false);
    assert.equal(await page.locator('ol details').count(), 0);
    assert.equal(await page.locator('p[role="status"]').count(), 1);
  }
  assert.equal((await fetch(endpoint, { headers })).status, 503);
  await page.screenshot({ path: fileURLToPath(new URL('unavailable.png', output)) });
  report.checks.push('Une panne SQL affiche une indisponibilité distincte, noindex et API 503.');
  assert.deepEqual(report.browserErrors, []);
  log(`PASS News: ${report.checks.length} groupes de vérification, aucune erreur JavaScript.`);
} catch (error) {
  report.failure = error.stack;
  log(error);
  process.exitCode = 1;
} finally {
  await writeFile(new URL('report.json', output), `${JSON.stringify(report, null, 2)}\n`);
  await browser?.close();
  await fixture.close();
  log('Navigateur, serveur et base de test fermés.');
}
// Next conserve des handles de développement après close(), comme dans les autres recettes HTTP.
process.exit(process.exitCode ?? 0);
