/* global document */
// Vérification du parcours des replays sur un serveur local avec au moins un épisode.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { chromium, request } from 'playwright';

const origin = process.env.SANDBOX_TEST_ORIGIN ?? 'http://127.0.0.1:3327';
// Le serveur personnalisé des fixtures ne sérialise pas les fonctions de next.config.
// Une instance Next standard peut vérifier les redirections séparément.
const redirectOrigin = process.env.SANDBOX_TEST_REDIRECT_ORIGIN ?? origin;
for (const url of [origin, redirectOrigin]) {
  if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
    throw new Error('Ce contrôle utilise uniquement des serveurs locaux.');
}
const output = new URL('../.local/podcast/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.SANDBOX_BROWSER_CHANNEL ? { channel: process.env.SANDBOX_BROWSER_CHANNEL } : {}),
});
const checks = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    const home = await page.goto(origin, { waitUntil: 'networkidle' });
    assert.equal(home.status(), 200);
    const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
    if (await refuse.isVisible()) await refuse.click();
    assert.equal(
      await page.locator('main .latest-replay, main .featured-episode, main .media-shelf').count(),
      0,
    );
    if (width <= 1024) await page.locator('.mobile-menu-trigger').click();
    const nav = page.locator(width <= 1024 ? '.mobile-menu-panel' : '.desktop-navigation');
    const podcastLink = nav.getByRole('link', { name: 'Le podcast', exact: true });
    assert.equal(await podcastLink.getAttribute('href'), '/podcast');
    await podcastLink.click();
    await page.waitForURL(origin + '/podcast');
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal((await page.locator('main h1').textContent()).trim(), 'Le podcast');
    assert.equal(await page.locator('main .latest-replay').count(), 1);
    assert.equal(await page.locator('main a[href^="/topics"], main input, main select').count(), 0);
    assert.equal(await page.locator('main .replay-history').count(), 0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      true,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: fileURLToPath(new URL(`podcast-${String(width)}.png`, output)),
      fullPage: true,
    });
    await page.getByRole('link', { name: 'Voir le replay', exact: true }).click();
    await page.waitForURL(origin + '/episodes/1');
    assert.equal(await page.locator('main a[href^="/topics"]').count(), 0);
    assert.equal(await page.locator('.breadcrumbs a[href="/podcast"]').count(), 1);
    assert.equal(await page.locator('#episode-video').count(), 1);
    assert.deepEqual(errors, []);
    checks.push({ width, home: 200, podcast: 200, replay: 200, overflow: false, errors });
    await page.close();
  }
  for (const prefix of ['', '/en', '/es-es', '/de-de']) {
    for (const path of ['/episodes', '/topics', '/topics/agents']) {
      const response = await request.newContext().then(async (context) => {
        try {
          return await context.get(redirectOrigin + prefix + path, { maxRedirects: 0 });
        } finally {
          await context.dispose();
        }
      });
      assert.equal(response.status(), 308, prefix + path);
      assert.equal(
        new URL(response.headers().location, redirectOrigin).pathname,
        prefix + '/podcast',
      );
      checks.push({ path: prefix + path, redirect: 308, destination: prefix + '/podcast' });
    }
  }
  const page = await browser.newPage();
  for (const [prefix, title] of [
    ['/en', 'The podcast'],
    ['/es-es', 'El pódcast'],
    ['/de-de', 'Der Podcast'],
  ]) {
    await page.goto(origin + prefix + '/podcast', { waitUntil: 'networkidle' });
    assert.equal((await page.locator('main h1').textContent()).trim(), title);
    assert.equal(
      await page.locator('main .latest-replay a').first().getAttribute('href'),
      prefix + '/episodes/1',
    );
    checks.push({ path: prefix + '/podcast', title, linksLocalized: true });
  }
  await page.close();
  await writeFile(new URL('report.json', output), JSON.stringify(checks, null, 2) + '\n');
  process.stdout.write(`${String(checks.length)} contrôles podcast réussis.\n`);
} finally {
  await browser.close();
}
