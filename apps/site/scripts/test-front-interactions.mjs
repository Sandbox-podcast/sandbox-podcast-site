/* global document, window */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.SANDBOX_PLAYWRIGHT_PATH ?? 'playwright');
const origin = process.env.SANDBOX_FRONT_ORIGIN ?? 'http://127.0.0.1:3317';
const output = new URL('../.local/front-interactions/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({
      // Clients de test distincts, pour ne pas cumuler leurs connexions dans le limiteur.
      extraHTTPHeaders: { 'x-forwarded-for': `192.0.2.${[320, 390, 1440].indexOf(width) + 1}` },
      viewport: { width, height: 900 },
      isMobile: width < 768,
      hasTouch: width < 768,
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const check = async (name, run) => {
      try {
        await run();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
          true,
          'Débordement horizontal',
        );
        assert.deepEqual(errors, [], 'Erreur JavaScript');
        results.push({ width, name, passed: true });
        await page.screenshot({
          path: fileURLToPath(new URL(`${width}-${name}.png`, output)),
          fullPage: false,
        });
        log(`PASS ${width} ${name}`);
      } catch (error) {
        results.push({ width, name, passed: false, error: error.message });
        log(`FAIL ${width} ${name}: ${error.message}`);
        await page.screenshot({
          path: fileURLToPath(new URL(`${width}-${name}-failed.png`, output)),
        });
      }
      await writeFile(new URL('report.json', output), JSON.stringify(results, null, 2));
    };
    await check('accueil', async () => {
      await page.goto(origin, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Refuser', exact: true }).click();
      assert.equal(await page.locator('h1').innerText(), 'Sandbox Charts');
      const title = await page.locator('#featured-title').boundingBox();
      const chart = await page.locator('.sc-ranking').boundingBox();
      assert.ok(chart.y < title.y);
      assert.equal(await page.locator('h1').count(), 1);
      if (width < 768) {
        await page.locator('.mobile-menu-trigger').click();
        const links = page.locator('.mobile-menu-panel .nav-link');
        for (const link of await links.all()) assert.ok((await link.boundingBox()).height >= 44);
        await page.locator('.mobile-menu-trigger').press('Escape');
        assert.equal(await page.locator('.mobile-navigation').getAttribute('open'), null);
        await page.locator('.mobile-menu-trigger').click();
        await page
          .locator('.mobile-menu-panel')
          .getByRole('link', { name: 'Classements', exact: true })
          .click();
        await page.waitForURL('**/charts');
        assert.equal(await page.locator('.mobile-navigation').getAttribute('open'), null);
      }
    });
    await check('classement-details', async () => {
      await page.goto(origin + '/');
      await page.getByRole('button', { name: 'Skills', exact: true }).click();
      assert.ok(page.url().includes('chart=skills'));
      await page.reload();
      assert.equal(
        await page
          .getByRole('button', { name: 'Skills', exact: true })
          .getAttribute('aria-pressed'),
        'true',
      );
      await page.getByRole('button', { name: 'GitHub', exact: true }).click();
      await page.locator('.sc-row > summary').first().click();
      assert.equal(await page.locator('.sc-row').first().getAttribute('open'), '');
      await page.locator('.sc-row-detail').first().scrollIntoViewIfNeeded();
    });
    await check('episode', async () => {
      await page.goto(origin + '/episodes/1', { waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').count(), 1);
      assert.ok((await page.locator('h1').innerText()).includes('FIXTURE'));
      assert.equal(await page.locator('iframe').count(), 0);
      const chapter = page.locator('a[href*="t=1550"]').first();
      await chapter.click();
      await page.waitForURL('**t=1550*');
      await page.locator('iframe[src*="start=1550"]').waitFor({ state: 'attached' });
    });
    await check('catalogue', async () => {
      await page.goto(origin + '/nos-projets');
      await page
        .getByRole('searchbox', { name: 'Rechercher un projet', exact: true })
        .fill('zzzz-no-project');
      await page.getByRole('heading', { name: 'Aucun projet trouvé' }).waitFor();
      await page.getByRole('button', { name: 'Afficher tous les projets' }).click();
      await page
        .getByRole('searchbox', { name: 'Rechercher un projet', exact: true })
        .fill('Sillage');
      assert.ok((await page.locator('#catalogue').innerText()).includes('1 projet'));
    });
    await check('galerie', async () => {
      await page.goto(origin + '/nos-projets/sillage');
      await page
        .getByRole('button', { name: /^Agrandir/ })
        .first()
        .click();
      await page.getByRole('dialog', { name: 'Aperçu agrandi' }).waitFor();
      await page.getByRole('button', { name: "Fermer l'aperçu" }).press('Escape');
      assert.equal(await page.getByRole('dialog').isVisible(), false);
    });
    await check('admin', async () => {
      await page.goto(origin + '/admin');
      await page.getByLabel('Identifiant', { exact: true }).fill('fronts-admin');
      await page.getByLabel('Mot de passe', { exact: true }).fill('Fronts-local-test-2026!');
      await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
      await page.getByRole('button', { name: 'Déconnexion', exact: true }).waitFor();
      for (const label of ['Identité du site', 'Slides']) {
        await page.getByRole('button', { name: label, exact: true }).click();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
          true,
          `Débordement ${label}`,
        );
      }
      await page
        .getByRole('button', { name: /Classements/ })
        .first()
        .click();
      await page.locator('.admin-workspace').scrollIntoViewIfNeeded();
    });
    await check('admin-erreur-reprise', async () => {
      await context.route('**/api/admin/session', (route) =>
        route.fulfill({ status: 503, json: { error: 'Panne simulée locale' } }),
      );
      await page.reload();
      await page.getByRole('button', { name: 'Réessayer', exact: true }).waitFor();
      await context.unroute('**/api/admin/session');
      await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
      await page.getByRole('button', { name: 'Déconnexion', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Déconnexion', exact: true }).click();
      await page.getByRole('button', { name: 'Se connecter', exact: true }).waitFor();
      await page.getByLabel('Identifiant', { exact: true }).fill('fronts-viewer');
      await page.getByLabel('Mot de passe', { exact: true }).fill('Fronts-local-test-2026!');
      await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
      await page
        .getByText('Accès en lecture seule : vous pouvez consulter le contenu.', { exact: true })
        .waitFor();
      const published = await (await context.request.get(origin + '/api/admin/content')).json();
      const denied = await context.request.post(origin + '/api/admin/content', {
        headers: { Origin: origin },
        data: {
          action: 'publish',
          content: published.content,
          expectedDraftEtag: published.draftEtag,
        },
      });
      assert.equal(denied.status(), 403);
    });
    await context.close();
  }
} finally {
  await browser.close();
}
const failed = results.filter((result) => !result.passed);
log(`${results.length - failed.length}/${results.length} parcours validés.`);
if (failed.length) process.exitCode = 1;
