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
import { HOME_STUDIO_WIDE_IMAGE } from '../src/domain/home-studio.ts';

const { fetch } = globalThis;

// Tous les enregistrements sont des fixtures, dans la base PGlite éphémère locale.
const fixture = await startBadgeFixture();
assert.equal(new URL(fixture.origin).hostname, '127.0.0.1');
const output = new URL('../.local/news-e2e/', import.meta.url);
await mkdir(output, { recursive: true });
const report = { checks: [], browserErrors: [] };
const paths = [['fr-FR', '/news']];
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
  const queueMigration = await readFile(
    new URL('../drizzle/0017_news_candidates.sql', import.meta.url),
    'utf8',
  );
  for (const sql of queueMigration.split('--> statement-breakpoint'))
    if (sql.trim()) await fixture.pg.exec(sql);
  const leaseMigration = await readFile(
    new URL('../drizzle/0018_news_candidate_leases.sql', import.meta.url),
    'utf8',
  );
  for (const sql of leaseMigration.split('--> statement-breakpoint'))
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
  report.checks.push('Le drapeau fermé protège les pages et l’API.');

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
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
    reducedMotion: 'reduce',
  });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === fixture.origin ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => report.browserErrors.push(error.message));
  async function visit(path, indexable) {
    const response = await page.goto(fixture.origin + path, { waitUntil: 'domcontentloaded' });
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
    assert.equal((await page.goto(fixture.origin + path)).status(), 404);
  }
  await page.goto(fixture.origin);
  assert.equal(
    await page
      .locator(
        'a[href="/news"][title="L’actualité IA et développement"], a[href="/news"][title="L\'actualité IA et développement"]',
      )
      .count(),
    0,
  );
  report.checks.push(
    'Le flux vide reste en 404 sans radar ; les accès s’ouvrent dès le premier article publié.',
  );

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
  const queueEndpoint = `${fixture.origin}/api/cron/news-candidates`;
  assert.equal((await fetch(queueEndpoint)).status, 401);
  const queued = await fetch(queueEndpoint, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'collect', items: [item] }),
  });
  assert.equal(queued.status, 200, await queued.clone().text());
  assert.equal((await queued.json()).inserted, 1);
  assert.equal((await (await fetch(queueEndpoint, { headers })).json()).items.length, 1);
  const claimResponse = await fetch(queueEndpoint, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'claim' }),
  });
  assert.equal(claimResponse.status, 200);
  const claimedBatch = await claimResponse.json();
  assert.equal(claimedBatch.items.length, 1);
  assert.ok(claimedBatch.leaseId);
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
  assert.equal((await (await fetch(queueEndpoint, { headers })).json()).items.length, 0);
  assert.equal(
    (
      await fetch(queueEndpoint, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          leaseId: claimedBatch.leaseId,
          published: [item.url],
          skipped: [],
        }),
      })
    ).status,
    200,
  );
  report.checks.push(
    'La file privée conserve le candidat et ne le retraite pas après publication, même avant accusé.',
  );
  report.checks.push('L’API persiste la fiche dans Postgres et évite un second enregistrement.');
  const publishedFeed = await (await fetch(`${fixture.origin}/api/news`)).json();
  assert.ok(publishedFeed.lastPublishedAt);
  assert.ok(Date.parse(publishedFeed.lastPublishedAt) >= Date.parse(now));
  assert.equal(publishedFeed.checkedAt, now);
  await page.goto(fixture.origin);
  assert.ok((await page.locator('a[href="/news"]').count()) >= 2);
  assert.ok(
    (await page.locator(`img[src*="${HOME_STUDIO_WIDE_IMAGE.split('/').at(-1)}"]`).count()) > 0,
  );
  await page.locator('[data-world-explorer] summary').click();
  await page.getByRole('combobox', { name: 'Les pièces', exact: true }).selectOption('news');
  const radarLink = page.locator('[data-room-content="news"] a[href="/news"]').first();
  await radarLink.waitFor({ state: 'visible' });
  await radarLink.click();
  await page.waitForURL(`${fixture.origin}/news`);
  report.checks.push(
    'Le premier article ouvre les accès News et le terminal cliquable de la salle radar.',
  );

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [locale, path] of paths) {
      await visit(path, true);
      const updateTimes = page.locator('dl time');
      assert.equal(await updateTimes.count(), 2);
      assert.equal(
        await updateTimes.nth(0).getAttribute('datetime'),
        publishedFeed.lastPublishedAt,
      );
      assert.equal(await updateTimes.nth(1).getAttribute('datetime'), now);
      for (const time of await updateTimes.all()) {
        assert.ok(await time.isVisible());
        assert.match(await time.innerText(), /Europe\/Paris/);
      }
      const row = page.locator('ol details').filter({ hasText: titles[locale] });
      assert.equal(await row.count(), 1);
      await row.locator('summary').click();
      assert.ok((await row.innerText()).includes(synopses[locale].join(' ')));
      assert.equal(await row.locator('a').getAttribute('href'), item.url);
      const alternates = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((nodes) => nodes.map((node) => new URL(node.href).pathname));
      assert.deepEqual(alternates, []);
      assert.equal(await page.locator('.site-header .locale-switcher').count(), 0);
      assert.match(await page.locator('html').getAttribute('lang'), /^fr(?:-FR)?$/);
      if (locale === 'fr-FR')
        await page.screenshot({
          path: fileURLToPath(new URL(`published-${viewport.width}.png`, output)),
        });
    }
  }
  report.checks.push(
    'Les pages françaises desktop/mobile rendent titre, trois phrases, source et canonique, sans sélecteur de langue ni hreflang étranger.',
  );
  report.checks.push(
    'Les pages affichent séparément les dates réelles de publication et de collecte, en heure de Paris.',
  );
  for (const prefix of ['en', 'es-es', 'de-de']) {
    const response = await fetch(`${fixture.origin}/${prefix}/news?source=test`, {
      redirect: 'manual',
    });
    assert.equal(response.status, 307);
    assert.equal(
      new URL(response.headers.get('location'), fixture.origin).href,
      `${fixture.origin}/news?source=test`,
    );
    await page.goto(`${fixture.origin}/${prefix}/news`);
    assert.equal(new URL(page.url()).pathname, '/news');
    assert.match(await page.locator('html').getAttribute('lang'), /^fr(?:-FR)?$/);
  }
  await page.goto(fixture.origin + '/news', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-news-hydrated="true"]').waitFor();
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

  // Historique déjà publié : conservé en base au-delà de la fenêtre de collecte.
  for (let index = 0; index < 35; index += 1) {
    const id = `${source.id}:/articles/local-news-history-${index}`;
    const url = new URL(`/articles/local-news-history-${index}`, source.url).href;
    const publishedAt = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const historical = {
      ...item,
      id,
      url,
      publishedAt,
      titles: Object.fromEntries(
        Object.entries(titles).map(([locale, title]) => [locale, `${title} ${index}`]),
      ),
    };
    await fixture.pg.query(
      'INSERT INTO news_items (id, canonical_url, source_id, source_name, published_at, category, payload) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, url, source.id, source.name, publishedAt, item.category, JSON.stringify(historical)],
    );
  }
  await page.goto(fixture.origin + '/news', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('ol details').count(), 30);
  const nextPage = page.waitForResponse((response) => response.url().includes('/api/news?'));
  await page.getByRole('button', { name: /Afficher la suite/ }).click();
  assert.equal((await nextPage).status(), 200);
  await page.waitForFunction(() => document.querySelectorAll('ol details').length === 36);
  assert.equal(await page.getByRole('button', { name: /Afficher la suite/ }).count(), 0);
  report.checks.push(
    'La pagination HTTP ajoute l’historique de plus de quatorze jours : 30 puis 36 articles.',
  );

  // Simulation de panne réservée à la base de test créée par ce processus.
  await fixture.pg.exec('DROP TABLE news_items');
  for (const [, path] of paths) {
    assert.equal((await page.goto(fixture.origin + path)).status(), 404);
  }
  assert.equal((await fetch(endpoint, { headers })).status, 503);
  await page.screenshot({ path: fileURLToPath(new URL('unavailable.png', output)) });
  await page.goto(fixture.origin);
  await page.locator('[data-world-explorer] summary').click();
  await page.getByRole('combobox', { name: 'Les pièces', exact: true }).selectOption('news');
  await page.locator('[data-room-content="news"]').waitFor();
  assert.equal(await page.locator('[data-room-content="news"] a[href="/news"]').count(), 0);
  report.checks.push('Une panne SQL masque la rubrique publique et conserve l’API en 503.');
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
