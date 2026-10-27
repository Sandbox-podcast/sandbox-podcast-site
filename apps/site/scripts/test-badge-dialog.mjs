/* global document, window */
// Test navigateur sur fixtures éphémères ; aucun accès à la base distante.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';
import { startBadgeFixture } from './badges-fixture-server.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.SANDBOX_PLAYWRIGHT_PATH ?? 'playwright');
const { origin, artifactDir, close } = await startBadgeFixture();
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.SANDBOX_BROWSER_CHANNEL
      ? { channel: process.env.SANDBOX_BROWSER_CHANNEL }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.route(/https:\/\//, (route) => route.abort());
  await page.goto(`${origin}/charts/github`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Refuser', exact: true }).click();
  const rankingUrl = page.url();
  const badgeButton = page.getByRole('button', { name: 'Obtenir mon badge' }).first();
  const official = page.getByRole('link', { name: 'Projet officiel' }).first();
  assert.match(await official.getAttribute('href'), /^https:\/\/github.com\//);
  assert.equal(await page.locator('details.sc-row[open]').count(), 0);
  await badgeButton.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Copier le Markdown', exact: true }).waitFor();
  assert.equal(page.url(), rankingUrl);
  assert.equal(await dialog.locator('details').count(), 0);
  await dialog.getByRole('button', { name: 'Copier le Markdown', exact: true }).click();
  await dialog.getByRole('status').filter({ hasText: 'Code Markdown copié.' }).waitFor();
  const directMarkdown = await page.evaluate(() => window.navigator.clipboard.readText());
  assert.match(directMarkdown, /badges\/github\/\d+\/rank.svg/);
  await dialog.locator('[aria-busy="false"]').waitFor();
  await page.screenshot({
    path: fileURLToPath(new URL('badge-dialog-desktop.png', artifactDir)),
    fullPage: false,
  });
  await dialog.getByRole('button', { name: 'HTML', exact: true }).click();
  await dialog.getByRole('button', { name: 'Copier le HTML', exact: true }).click();
  assert.match(
    await page.evaluate(() => window.navigator.clipboard.readText()),
    /^<a href=.*<img src=/,
  );
  await dialog.getByRole('button', { name: 'URL SVG', exact: true }).click();
  await dialog.getByRole('button', { name: "Copier l'URL", exact: true }).click();
  assert.match(
    await page.evaluate(() => window.navigator.clipboard.readText()),
    /badges\/github\/\d+\/rank.svg$/,
  );
  const download = page.waitForEvent('download');
  await dialog.getByRole('link', { name: 'Télécharger le SVG', exact: true }).click();
  await (await download).saveAs(fileURLToPath(new URL('badge-dialog.svg', artifactDir)));
  await page.evaluate(() =>
    Object.defineProperty(window.navigator.clipboard, 'writeText', {
      configurable: true,
      value: () => Promise.reject(new Error('Clipboard blocked for test')),
    }),
  );
  await dialog.getByRole('button', { name: "Copier l'URL", exact: true }).click();
  assert.ok(
    await dialog
      .getByLabel('Adresse du badge SVG', { exact: true })
      .evaluate(
        (element) =>
          document.activeElement === element &&
          element.selectionStart === 0 &&
          element.selectionEnd === element.value.length,
      ),
  );
  const choice = dialog.getByRole('combobox', { name: 'Badge', exact: true });
  const choices = await choice
    .locator('option')
    .evaluateAll((items) => items.map((item) => item.value));
  assert.ok(choices.length > 1);
  await choice.selectOption(choices[1]);
  await dialog.locator('img').waitFor();
  assert.match(await dialog.locator('img').getAttribute('src'), /^\/badges\/awards\//);
  await choice.selectOption('rank');
  for (let index = 0; index < 14; index++) {
    await page.keyboard.press('Tab');
    assert.ok(await dialog.evaluate((element) => element.contains(document.activeElement)));
  }
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  assert.equal(await badgeButton.evaluate((element) => document.activeElement === element), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await badgeButton.click();
  await dialog.getByRole('button', { name: 'Copier le Markdown', exact: true }).waitFor();
  await page.screenshot({
    path: fileURLToPath(new URL('badge-dialog-mobile.png', artifactDir)),
    fullPage: false,
  });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  // Erreur de chargement, reprise et changement d'éligibilité après affichage du classement.
  let badgeFailure = 'failed';
  await page.route('**/api/charts/badges/*', (route) =>
    route.fulfill({
      status: badgeFailure === 'failed' ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(badgeFailure === 'failed' ? { error: 'fixture' } : { badges: [] }),
    }),
  );
  await badgeButton.click();
  await dialog.getByRole('alert').waitFor();
  badgeFailure = 'empty';
  await dialog.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await dialog.getByText('Aucun badge disponible pour ce projet.', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.unroute('**/api/charts/badges/*');
  await page.setViewportSize({ width: 1440, height: 1100 });
  assert.deepEqual(errors, []);
  log(
    JSON.stringify({
      status: 'passed',
      fixture: true,
      origin,
      artifacts: fileURLToPath(artifactDir),
      checks: [
        'direct actions',
        'official URL',
        'copy Markdown/HTML/SVG',
        'download',
        'clipboard fallback',
        'desktop/mobile',
        'Escape/focus',
        'error/retry/empty',
      ],
    }),
  );
} catch (error) {
  process.exitCode = 1;
  log('Badge dialog failed:', error);
} finally {
  await browser?.close();
  await close();
}
// Next dev conserve des observateurs de fichiers après close() sur Windows.
process.exit(process.exitCode ?? 0);
