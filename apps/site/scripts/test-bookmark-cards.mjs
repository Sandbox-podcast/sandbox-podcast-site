/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import console from 'node:console';
import { URL } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const output = new URL('../.local/bookmark-cards/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const [width, height, locale, touch] of [
    [1440, 1000, '', false],
    [1280, 900, '', false],
    [1050, 900, '', false],
    [701, 900, '', false],
    [820, 1180, '', true],
    [390, 844, '', true],
    [320, 700, '', true],
    [1440, 1000, '/en', false],
    [1440, 1000, '/de-de', false],
    [1440, 1000, '/es-es', false],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:3100${locale}/`, { waitUntil: 'networkidle' });
    const refuse = page.getByRole('button', { name: /^(Refuser|Reject|Rechazar|Ablehnen)$/ });
    if (await refuse.isVisible()) await refuse.click();
    const section = page.locator('[data-home-section="explore"]');
    await section.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
    const cards = section.locator('a');
    assert.equal(await cards.count(), 4);
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      const geometry = await card.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const title = element.querySelector('h3');
        const frame = element.firstElementChild.getBoundingClientRect();
        const artwork = element.querySelector('img').parentElement.getBoundingClientRect();
        const kicker = element.querySelector('[class*="panelKicker"]');
        return {
          kickerPrefix: getComputedStyle(kicker, '::before').content,
          insets: [
            artwork.left - frame.left,
            frame.right - artwork.right,
            artwork.top - frame.top - 48,
          ],
          left: box.left,
          right: box.right,
          width: box.width,
          scroll: element.scrollWidth,
          titleWidth: title.clientWidth,
          titleScroll: title.scrollWidth,
          href: element.getAttribute('href'),
          description: document.getElementById(element.getAttribute('aria-describedby'))
            ?.textContent,
        };
      });
      assert.equal(geometry.kickerPrefix, '"\u2015 "', 'le préfixe des onglets reste lisible');
      assert.ok(
        geometry.insets.every((inset) => Math.abs(inset - 16) < 0.5),
        JSON.stringify(geometry),
      );
      assert.ok(geometry.left >= 0 && geometry.right <= width + 1, JSON.stringify(geometry));
      assert.ok(geometry.scroll <= geometry.width + 1, JSON.stringify(geometry));
      assert.ok(geometry.titleScroll <= geometry.titleWidth + 1, JSON.stringify(geometry));
      assert.ok(geometry.description?.length > 10);
      assert.ok(
        geometry.href === '/time-machine' || geometry.href.startsWith(`${locale}/`),
        geometry.href,
      );
    }
    const first = cards.first();
    await page.keyboard.press('Tab');
    await first.focus();
    await page.waitForTimeout(500);
    assert.equal(await first.evaluate((el) => getComputedStyle(el).outlineStyle), 'solid');
    await section.screenshot({
      path: new URL(`${width}${locale.replace('/', '-') || '-fr'}.png`, output).pathname.replace(
        /^\/(\w:)/,
        '$1',
      ),
    });
    if (!touch && !locale) {
      await page.mouse.move(0, 0);
      await first.evaluate((el) => el.blur());
      const frame = cards.nth(1).locator('div').first();
      const before = await frame.boundingBox();
      await cards.nth(1).hover();
      await page.waitForTimeout(750);
      const after = await frame.boundingBox();
      assert.ok(Math.abs(before.y - after.y - 8) < 1, 'la carte remonte de 8 px');
      assert.ok(
        (await frame.evaluate((el) => getComputedStyle(el).clipPath)).startsWith('shape('),
        'le masque contient aussi les images et les textes',
      );
      await section.screenshot({
        path: new URL(`desktop-hover-${width}.png`, output).pathname.replace(/^\/(\w:)/, '$1'),
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const duration = await first
        .locator('span')
        .first()
        .evaluate((el) => getComputedStyle(el, '::after').transitionDuration);
      assert.ok(parseFloat(duration) <= 0.001);
    }
    assert.deepEqual(errors, []);
    console.log(
      `OK ${width} ${locale || 'fr'} : 4 cartes, limites, titres, descriptions, destinations et focus`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
