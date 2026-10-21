import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import { URL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const origin = process.env.SANDBOX_VHS_TEST_ORIGIN ?? 'http://127.0.0.1:3100';
const output = fileURLToPath(new URL('../.local/portal-project-covers/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
  ]) {
    const context = await browser.newContext({ locale: 'fr-FR', viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    const covers = new Set();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (
        url.pathname === '/_next/image' &&
        url.searchParams.get('url')?.includes('/vhs-projects/')
      ) {
        assert.equal(response.status(), 200);
        covers.add(url.searchParams.get('url'));
      }
    });
    await page.goto(`${origin}/#room-projects`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('[data-world-ready="true"]', { timeout: 60000 });
    const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
    if (await refuse.isVisible()) await refuse.click();
    await page.mouse.move(-10, -10);
    const tape = page.locator('[data-vhs-project="akasha-os"]');
    await tape.locator('img').evaluate((image) => image.decode());
    const bounds = await tape.boundingBox();
    assert.ok(bounds);
    const clip = {
      x: Math.round(bounds.x + bounds.width * 0.2),
      y: Math.round(bounds.y + bounds.height * 0.2),
      width: Math.floor(bounds.width * 0.6),
      height: Math.floor(bounds.height * 0.4),
    };
    const room = await page.screenshot({ clip });
    await page.screenshot({ path: `${output}/${width}-room.png` });
    await page.goto(`${origin}/#room-studio`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-sandbox-room="studio"][data-world-ready="true"]');
    const x = clip.x + clip.width / 2;
    const y = clip.y + clip.height / 2;
    await page.mouse.move(x, y);
    await page.waitForSelector('[data-world-preview="projects"]', { timeout: 60000 });
    await page.waitForTimeout(1200);
    const preview = await page.screenshot({ clip });
    await page.screenshot({ path: `${output}/${width}-preview.png` });
    const a = await sharp(room).removeAlpha().raw().toBuffer();
    const b = await sharp(preview).removeAlpha().raw().toBuffer();
    assert.equal(a.length, b.length);
    const meanDifference =
      a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0) / a.length;
    assert.ok(
      meanDifference < 30,
      `Écart entre jaquette et aperçu : ${meanDifference.toFixed(2)}/255`,
    );
    assert.ok(covers.has('/images/vhs-projects/akasha-os-v1.webp'));
    await page.mouse.click(x, y);
    await page.waitForSelector('[data-sandbox-room="projects"][data-world-traveling="false"]');
    await page.mouse.move(-10, -10);
    assert.equal(await tape.count(), 1);
    assert.deepEqual(errors, []);
    report.push({ width, height, meanDifference, coversLoaded: covers.size, errors });
    await context.close();
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
