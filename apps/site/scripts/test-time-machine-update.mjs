/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.SANDBOX_PLAYWRIGHT_PATH ?? 'playwright');
const origin = process.env.SANDBOX_FRONT_ORIGIN ?? 'http://127.0.0.1:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const output = new URL('../.local/time-machine-update/', import.meta.url);
await mkdir(output, { recursive: true });
const corpus = JSON.parse(await readFile(new URL('../content/ai-history.json', import.meta.url)));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 950 },
      reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
      log(`${page.url()}\n${error.stack}`);
    });
    for (const locale of ['', '/en', '/es-es', '/de-de']) {
      for (const route of ['/nos-projets', '/nos-projets/sillage']) {
        const response = await page.goto(origin + locale + route, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        log(`CHECK ${width}px ${locale}${route}`);
        const colors = await page
          .locator('main > :is(div, article)')
          .first()
          .evaluate((element) => ({
            page: getComputedStyle(element).backgroundColor,
            body: getComputedStyle(document.body).backgroundColor,
            font: getComputedStyle(element).fontFamily,
            bodyFont: getComputedStyle(document.body).fontFamily,
            overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          }));
        assert.equal(colors.page, colors.body, `${locale}${route}: fond commun`);
        assert.equal(colors.font, colors.bodyFont, `${locale}${route}: police commune`);
        assert.equal(colors.overflow, false, `${locale}${route}: débordement`);
        results.push({ width, route: locale + route, ...colors });
        if (width < 640) {
          await page.locator('.mobile-menu-trigger').click();
          await page
            .locator('.mobile-menu-panel .mobile-search-link')
            .waitFor({ state: 'visible' });
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
            false,
          );
          await page.locator('.mobile-menu-trigger').click();
        }
      }
    }
    await page.goto(origin + '/nos-projets', { waitUntil: 'networkidle' });
    const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
    if (await refuse.isVisible()) await refuse.click();
    assert.equal(
      await page
        .locator('[class*="featureFooter"]')
        .first()
        .evaluate((element) => getComputedStyle(element).backgroundColor),
      'rgb(7, 26, 41)',
    );
    await page
      .getByRole('searchbox', { name: 'Rechercher un projet', exact: true })
      .fill('zzzz-no-project');
    await page.getByRole('heading', { name: 'Aucun projet trouvé' }).waitFor();
    const reset = page.getByRole('button', { name: 'Afficher tous les projets' });
    const buttonColors = await reset.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      text: getComputedStyle(element).color,
    }));
    assert.equal(buttonColors.background, 'rgb(28, 181, 237)');
    assert.equal(buttonColors.text, 'rgb(5, 9, 13)');
    await reset.click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: fileURLToPath(new URL(`projects-${width}.png`, output)) });
    await page.goto(origin + '/nos-projets/sillage', { waitUntil: 'networkidle' });
    await page
      .getByRole('button', { name: /^Agrandir/ })
      .first()
      .click();
    const dialog = page.getByRole('dialog', { name: 'Aperçu agrandi' });
    await dialog.waitFor();
    assert.equal(
      await dialog.evaluate((element) => getComputedStyle(element).backgroundColor),
      'rgb(7, 26, 41)',
    );
    await page.getByRole('button', { name: "Fermer l'aperçu" }).press('Escape');
    assert.equal(await dialog.isVisible(), false);
    await page.screenshot({ path: fileURLToPath(new URL(`project-detail-${width}.png`, output)) });
    await page.goto(origin + '/time-machine', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('article[id^="ia-"]').count(), corpus.events.length);
    assert.ok(
      (await page.locator('header').allTextContents())
        .join(' ')
        .includes('Revue au 15 octobre 2026'),
    );
    await page.getByLabel('Année de début', { exact: true }).selectOption('2026');
    const search = page.getByRole('searchbox', {
      name: 'Rechercher une annonce, un modèle ou une organisation',
    });
    for (const [query, id] of [
      ['Grok Bots', 'grok-bot'],
      ['Dots', 'openai-dots'],
      ['6.1 Sol', 'gpt-6-1-sol'],
      ['millenaire', 'navier-stokes-proposed-proof'],
      ['CRISPR', 'claude-art-enzyme'],
      ['HiRO', 'hiro-ace-v2'],
    ]) {
      await search.fill(query);
      await page.locator('#ia-' + id).waitFor({ state: 'visible' });
    }
    await search.fill('');
    assert.equal(
      await page.locator('article[id^="ia-"]').count(),
      corpus.events.filter((event) => event.date.startsWith('2026')).length,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
      false,
    );
    await page.screenshot({ path: fileURLToPath(new URL(`history-2026-${width}.png`, output)) });
    assert.deepEqual(errors, []);
    results.push({ width, route: '/time-machine', searches: 6, errors });
    await page.close();
    log(
      `PASS ${width}px : quatre langues, catalogue, fiche, galerie et six recherches historiques`,
    );
  }
} finally {
  await browser.close();
  await writeFile(new URL('report.json', output), JSON.stringify(results, null, 2) + '\n');
}
