/* global document */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { URL, fileURLToPath } from 'node:url';
import process from 'node:process';
import console from 'node:console';
import { chromium } from 'playwright';

const origin = process.env.SANDBOX_VHS_TEST_ORIGIN ?? 'http://127.0.0.1:3102';
const output = new URL('../.local/vhs-projects/', import.meta.url);
const projects = JSON.parse(
  await readFile(new URL('../content/personal-projects.json', import.meta.url), 'utf8'),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      locale: 'fr-FR',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}/#room-projects`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
    if (await refuse.isVisible()) await refuse.click();
    const shelf = page.locator('[data-room-content="projects"]');
    await shelf.waitFor({ state: 'visible', timeout: 60_000 });
    console.log(`Vérification des rayons à ${width}px`);
    const seen = new Set();
    for (const creator of ['Lou', 'Loïc', 'Nicolas']) {
      const bay = shelf.getByRole('region', { name: creator, exact: true });
      for (let index = 0; index < 2; index++) {
        await bay.scrollIntoViewIfNeeded();
        await bay.locator('img').evaluateAll((images) => {
          for (const image of images) image.loading = 'eager';
          return Promise.all(images.map((image) => image.decode()));
        });
        for (const slug of await bay
          .locator('[data-vhs-project]')
          .evaluateAll((links) => links.map((link) => link.dataset.vhsProject)))
          seen.add(slug);
        assert.equal(await bay.locator('img:not([src*="vhs-projects"])').count(), 0);
        if (await refuse.isVisible()) await refuse.click();
        await page.screenshot({
          path: fileURLToPath(new URL(`${width}-${creator}-${index}.png`, output)),
        });
        const next = bay.getByRole('button', { name: 'Suivant', exact: true });
        if (!(await next.count()) || (await next.isDisabled())) break;
        await next.click();
      }
    }
    assert.deepEqual([...seen].sort(), projects.map(({ slug }) => slug).sort());
    assert.equal(await shelf.getByText('MindOdyssey', { exact: true }).count(), 0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
      true,
    );
    const first = shelf.locator('[data-vhs-project="not-my-fault"]');
    await first.scrollIntoViewIfNeeded();
    await first.focus();
    await page.screenshot({
      path: fileURLToPath(new URL(`${width}-focus.png`, output)),
    });
    await first.click();
    await page.waitForURL('**/nos-projets/not-my-fault');
    assert.match(await page.locator('h1').innerText(), /Not My Fault/);
    assert.deepEqual(errors, []);
    report.push({ width, projects: seen.size, missingImages: 0, navigation: 'passed', errors });
    if (width === 1440) {
      for (const prefix of ['', '/en', '/es-es', '/de-de']) {
        const removed = await context.request.get(`${origin}${prefix}/nos-projets/mindodyssey`);
        assert.equal(removed.status(), 404);
      }
    }
    await context.close();
  }
  await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
