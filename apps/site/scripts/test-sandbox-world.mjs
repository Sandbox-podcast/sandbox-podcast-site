/* global document, window */
import console from 'node:console';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const out = '.local/sandbox-world';
await mkdir(out, { recursive: true });
const errors = [];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let page;
try {
  page = await browser.newPage({ locale: 'fr-FR', viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (e) => {
    if (e.type() === 'error') errors.push(e.text());
  });
  await page.goto('http://127.0.0.1:3100/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-world-ready="true"]', { timeout: 60000 });
  const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
  await refuse.waitFor({ state: 'visible', timeout: 15000 });
  await refuse.click();
  await page.mouse.move(-10, -10);
  await page.screenshot({ path: out + '/studio.png' });
  assert.equal(await page.locator('[data-room-content="studio"] a').count(), 0);
  assert.equal(await page.locator('[data-room-door]').count(), 0);
  assert.equal(await page.locator('[data-room-link]').count(), 0);
  assert.equal(await page.locator('[data-world-controls]').isVisible(), false);
  const surface = page.locator('[data-world-surface]');
  for (const [name, x, y] of [
    ['left', 100, 300],
    ['right', 1300, 300],
    ['bottom', 720, 770],
  ]) {
    await page.mouse.move(x, y);
    await page.waitForSelector('[data-world-preview="projects"]', { timeout: 60000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: out + '/portal-' + name + '.png' });
  }
  console.log('global preview at left, right, bottom');
  await page.mouse.click(720, 430);
  await page.waitForSelector('[data-world-traveling="true"]');
  await page.waitForTimeout(650);
  await page.screenshot({ path: out + '/crossing.png' });
  await page.waitForSelector('[data-sandbox-room="projects"][data-world-traveling="false"]', {
    timeout: 30000,
  });
  await page.mouse.move(-10, -10);
  await page.waitForTimeout(400);
  await page.screenshot({ path: out + '/projects.png' });
  for (const room of ['rankings', 'history', 'cinema', 'news', 'studio']) {
    await page.locator('[data-world-explorer] summary').click();
    await page.getByRole('combobox', { name: 'Les pièces', exact: true }).selectOption(room);
    await page.waitForSelector(`[data-sandbox-room="${room}"][data-world-traveling="false"]`, {
      timeout: 30000,
    });
    await page.mouse.move(-10, -10);
    await page.waitForTimeout(600);
    await page.screenshot({ path: out + '/' + room + '.png' });
    console.log(room, 'arrived');
  }
  const explorerSummary = page.locator('[data-world-explorer] summary');
  await explorerSummary.focus();
  await page.keyboard.press('Enter');
  const roomSelect = page.getByRole('combobox', { name: 'Les pièces', exact: true });
  await roomSelect.focus();
  await roomSelect.selectOption('projects');
  await page.waitForSelector('[data-world-traveling="true"]');
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-world-traveling="false"]');
  assert.equal(
    await explorerSummary.evaluate((element) => document.activeElement === element),
    true,
  );
  assert.equal(await roomSelect.isVisible(), false);
  await surface.focus();
  await page.waitForSelector('[data-world-preview="projects"]');
  await page.keyboard.press('ArrowRight');
  await page.waitForSelector('[data-world-preview="rankings"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-sandbox-room="rankings"][data-world-traveling="false"]');
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'room-title-rankings');
  await page.goBack();
  await page.waitForSelector('[data-sandbox-room="studio"][data-world-ready="true"]');
  await surface.focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-world-traveling="true"]');
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-world-traveling="false"]');
  assert.equal(
    await page.locator('[data-sandbox-room]').getAttribute('data-sandbox-room'),
    'studio',
  );
  await page.waitForFunction(() => document.activeElement.hasAttribute('data-world-surface'));
  assert.equal(await page.locator('[data-sandbox-room]').getAttribute('data-world-preview'), '');
  await page.evaluate(() => window.scrollTo(0, 1200));
  assert.equal(
    await page.locator('[data-sandbox-room]').getAttribute('data-sandbox-room'),
    'studio',
  );
  assert.equal(await page.locator('[data-scroll-studio]').count(), 0);
  await page.goto('http://127.0.0.1:3100/#room-cinema', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-sandbox-room="cinema"][data-world-ready="true"]', {
    timeout: 30000,
  });
  console.log('keyboard, back, escape, scroll, direct hash passed');
  const resizeResults = [];
  for (const [width, height] of [
    [901, 700],
    [1366, 768],
    [2560, 1080],
    [3440, 1440],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:3100/#room-studio', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-sandbox-room="studio"][data-world-ready="true"]');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.mouse.move(width * 0.5, height * 0.35);
    await page.waitForSelector('[data-world-preview="projects"]');
    await page.mouse.click(width * 0.5, height * 0.35);
    await page.waitForSelector('[data-sandbox-room="projects"][data-world-traveling="false"]');
    await page.mouse.move(-10, -10);
    const geometry = await page.locator('canvas').evaluate((canvas) => {
      const bounds = canvas.getBoundingClientRect();
      return {
        width: bounds.width,
        height: bounds.height,
        bufferWidth: canvas.width,
        bufferHeight: canvas.height,
      };
    });
    assert.equal(geometry.width, width);
    assert.equal(geometry.height, height);
    assert.ok(geometry.bufferWidth > 0 && geometry.bufferHeight > 0);
    resizeResults.push({ width, height, arrived: 'projects', ...geometry });
    console.log(`${width}x${height} WebGL passed`);
  }
  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.waitForSelector('[data-world-ready="false"]');
  await page.locator('[data-world-explorer] summary').click();
  await page.getByRole('combobox', { name: 'Les pièces', exact: true }).selectOption('history');
  await page.waitForSelector('[data-sandbox-room="history"]');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForSelector('[data-sandbox-room="history"][data-world-ready="true"]');
  console.log('portrait fallback and WebGL restoration passed');
  await writeFile(out + '/resize-report.json', JSON.stringify(resizeResults, null, 2));
  await writeFile(out + '/browser-errors.json', JSON.stringify(errors, null, 2));
  assert.deepEqual(errors, []);
} catch (error) {
  if (page) {
    await page.screenshot({ path: out + '/failure.png' });
    console.log(
      await page.evaluate(() => ({
        room: { ...document.querySelector('[data-sandbox-room]')?.dataset },
        canvas: { ...document.querySelector('canvas')?.dataset },
        scrollY: window.scrollY,
        focused: document.activeElement?.outerHTML,
      })),
      errors,
    );
  }
  throw error;
} finally {
  await browser.close();
}
