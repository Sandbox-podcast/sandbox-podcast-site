/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import console from 'node:console';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';

const output = new URL('../.local/radar-room/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const errors = [];
try {
  for (const [width, height, locale] of [
    [320, 568, ''],
    [390, 844, ''],
    [820, 1180, ''],
    [901, 700, ''],
    [1440, 900, ''],
    [1920, 1080, ''],
    [2560, 1080, ''],
    [1440, 900, '/en'],
    [1440, 900, '/es-es'],
    [1440, 900, '/de-de'],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:3100${locale}/#room-news`);
    const terminal = page.locator('[data-news-terminal]');
    await terminal.waitFor();
    await page.waitForFunction(() => {
      const terminal = document.querySelector('[data-news-terminal]');
      const view = terminal?.closest('[data-sandbox-room]')?.querySelector('canvas')?.parentElement;
      return (
        view &&
        Math.abs(
          parseFloat(getComputedStyle(terminal).getPropertyValue('--room-view-width')) -
            view.clientWidth,
        ) < 1
      );
    });
    const refuse = page.getByRole('button', { name: /^(Refuser|Reject|Rechazar|Ablehnen)$/ });
    if (await refuse.isVisible()) await refuse.click();
    await page.evaluate(() => document.fonts.ready);
    await terminal.scrollIntoViewIfNeeded();
    await page.keyboard.press('Tab');
    await terminal.focus();
    const geometry = await terminal.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      const photoWidth = parseFloat(css.getPropertyValue('--room-photo-width'));
      const photoHeight = parseFloat(css.getPropertyValue('--room-photo-height'));
      const view = element
        .closest('[data-sandbox-room]')
        .querySelector('canvas')
        .parentElement.getBoundingClientRect();
      const projected = window.matchMedia('(width > 900px) and (aspect-ratio >= 6/5)').matches;
      const content = element.querySelector('strong').getBoundingClientRect();
      return {
        projected,
        actual: [box.x, box.y, box.width, box.height],
        expected: [
          view.x + (view.width - photoWidth) / 2 + (photoWidth * 266) / 1672,
          view.y + (view.height - photoHeight) / 2 + (photoHeight * 272) / 941,
          (photoWidth * 432) / 1672,
          (photoHeight * 122) / 941,
        ],
        textFits:
          content.x >= box.x &&
          content.right <= box.right &&
          element.scrollWidth <= element.clientWidth + 1 &&
          element.scrollHeight <= element.clientHeight + 1,
        focused: document.activeElement === element && css.outlineStyle !== 'none',
        terminalFits: box.x >= 0 && box.right <= window.innerWidth,
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        href: element.getAttribute('href'),
      };
    });
    assert.equal(geometry.href, `${locale}/news`);
    assert.ok(geometry.terminalFits, `Panneau hors de la fenêtre à ${width}`);
    assert.ok(geometry.textFits, `Texte hors du moniteur à ${width} ${locale}`);
    assert.ok(geometry.focused, `Focus invisible à ${width}`);
    if (geometry.projected)
      geometry.actual.forEach((value, index) =>
        assert.ok(
          Math.abs(value - geometry.expected[index]) < 1,
          `Décalage du moniteur à ${width}`,
        ),
      );
    await page.screenshot({
      path: fileURLToPath(new URL(`${width}-${height}${locale.replace('/', '-')}.png`, output)),
    });
    results.push({ width, height, locale: locale || 'fr', ...geometry });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(new URL('results.json', output), JSON.stringify(results, null, 2));
  console.log(
    `${results.length} contrôles Radar réussis : cadrage, texte, focus, langues, limites du panneau.`,
  );
} finally {
  await browser.close();
}
