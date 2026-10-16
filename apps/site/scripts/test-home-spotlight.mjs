/* global document, window */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';
import process from 'node:process';
import { log } from 'node:console';

const origin = process.env.SANDBOX_FRONT_ORIGIN ?? 'http://127.0.0.1:3219';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const output = new URL('../.local/home-spotlight/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 950 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin, { waitUntil: 'networkidle' });
    const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
    if (await refuse.isVisible()) await refuse.click();
    const carousel = page.getByRole('region', { name: "Projets de l'équipe" });
    await carousel.scrollIntoViewIfNeeded();
    const current = carousel.locator('a[data-position="active"]');
    const layoutBefore = await carousel.locator('a[data-position]').evaluateAll((cards) =>
      cards.map((card) => ({
        href: card.getAttribute('href'),
        width: card.offsetWidth,
        height: card.offsetHeight,
      })),
    );
    assert.ok((await current.getAttribute('href')).endsWith('/okodukai'));
    await carousel.getByRole('button', { name: 'Projet suivant' }).click();
    assert.ok((await current.getAttribute('href')).endsWith('/song-maker'));
    assert.deepEqual(
      await carousel.locator('a[data-position]').evaluateAll((cards) =>
        cards.map((card) => ({
          href: card.getAttribute('href'),
          width: card.offsetWidth,
          height: card.offsetHeight,
        })),
      ),
      layoutBefore,
      'Les panneaux gardent leurs dimensions pendant le changement de projet',
    );
    await carousel.getByRole('button', { name: 'Projet précédent' }).click();
    assert.ok((await current.getAttribute('href')).endsWith('/okodukai'));
    await current.press('ArrowLeft');
    assert.ok((await current.getAttribute('href')).endsWith('/sillage'));
    await page.waitForFunction(() => document.activeElement?.matches('a[data-position="active"]'));
    await current.press('Home');
    assert.ok((await current.getAttribute('href')).endsWith('/okodukai'));
    await page.waitForFunction(() => document.activeElement?.matches('a[data-position="active"]'));
    await current.press('End');
    assert.ok((await current.getAttribute('href')).endsWith('/sillage'));
    await page.waitForFunction(() => document.activeElement?.matches('a[data-position="active"]'));
    await carousel.getByRole('button', { name: 'Okodukai', exact: true }).click();
    assert.equal(await carousel.locator('button[aria-pressed="true"]').count(), 1);
    assert.ok((await current.getAttribute('href')).endsWith('/okodukai'));
    // Déplacement tactile simulé par le même trajet de pointeur, sans déclencher le lien.
    const box = await current.boundingBox();
    await page.mouse.move(box.x + box.width * 0.8, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, box.y + 102, { steps: 8 });
    await page.mouse.up();
    assert.ok((await current.getAttribute('href')).endsWith('/song-maker'));
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      true,
    );
    assert.deepEqual(errors, []);
    await page.waitForFunction(() => {
      const image = document.querySelector('a[data-position="active"] img');
      return image?.complete && image.naturalWidth > 0;
    });
    assert.equal(
      await current.locator('img').evaluate((image) => image.complete && image.naturalWidth > 0),
      true,
    );
    await carousel.screenshot({ path: fileURLToPath(new URL(`carousel-${width}.png`, output)) });
    await page.screenshot({ path: fileURLToPath(new URL(`home-projects-${width}.png`, output)) });
    await current.click();
    await page.waitForURL('**/nos-projets/song-maker');
    assert.ok(await page.getByRole('heading', { name: 'Song Maker', exact: true }).isVisible());
    results.push({
      width,
      navigation: true,
      stablePanelDimensions: true,
      clavier: true,
      swipe: true,
      link: true,
      overflow: false,
    });
    log(`PASS ${width} carrousel, clavier, swipe, lien natif, zéro débordement`);
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(new URL('report.json', output), JSON.stringify(results, null, 2) + '\n');
}
