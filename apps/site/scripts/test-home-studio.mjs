/* global document, window, innerHeight, innerWidth, scrollY, requestAnimationFrame, getComputedStyle */
import assert from 'node:assert/strict';
import process from 'node:process';
import { URL } from 'node:url';
import { log } from 'node:console';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.SANDBOX_TEST_ORIGIN ?? 'http://127.0.0.1:3100';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('Cette recette est réservée au serveur local.');
const output = new URL('../.local/home-studio/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const failures = [];
try {
  for (const config of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'compact', width: 1280, height: 720 },
    { name: 'mobile', width: 375, height: 812 },
    { name: 'mobile-reduced', width: 375, height: 812, reducedMotion: 'reduce' },
    { name: 'reduced', width: 1440, height: 900, reducedMotion: 'reduce' },
    { name: 'no-js', width: 1440, height: 900, javaScriptEnabled: false },
  ]) {
    const context = await browser.newContext({
      viewport: { width: config.width, height: config.height },
      reducedMotion: config.reducedMotion ?? 'no-preference',
      javaScriptEnabled: config.javaScriptEnabled ?? true,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => failures.push(`${config.name}: ${error.message}`));
    const response = await page.goto(origin, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
    if (await refuse.isVisible()) await refuse.click();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('[data-person], [data-host-card]').count(), 0);
    const animated =
      config.width > 900 && config.reducedMotion !== 'reduce' && config.javaScriptEnabled !== false;
    if (animated) {
      await page.waitForSelector('[data-scroll-studio="active"][data-studio-phase]');
      for (const progress of [0, 0.25, 0.4, 0.65, 0.85, 1, 0.4, 0]) {
        await page.evaluate((p) => {
          const root = document.querySelector('[data-scroll-studio]');
          window.scrollTo(
            0,
            root.getBoundingClientRect().top +
              window.scrollY +
              (root.offsetHeight - innerHeight) * p,
          );
        }, progress);
        await page.waitForFunction((p) => {
          const root = document.querySelector('[data-scroll-studio]');
          return (
            Math.abs(
              (scrollY - (root.getBoundingClientRect().top + scrollY)) /
                (root.offsetHeight - innerHeight) -
                p,
            ) < 0.002
          );
        }, progress);
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        const state = await page.evaluate(() => {
          const root = document.querySelector('[data-scroll-studio]');
          return {
            phase: root.dataset.studioPhase,
            light: Number(root.style.getPropertyValue('--studio-light')),
            frontInert: root.querySelector('[data-studio-front]').inert,
            wallInert: root.querySelector('[data-studio-wall]').inert,
            viewportTop:
              root.firstElementChild.nextElementSibling.nextElementSibling.getBoundingClientRect()
                .top,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        assert.equal(state.overflow, false);
        assert.ok(
          Math.abs(state.viewportTop) <= 1,
          'Le plateau reste épinglé pendant la séquence.',
        );
        if (progress === 0) {
          assert.equal(state.light, 0);
          assert.equal(state.wallInert, true);
        }
        if (progress === 0.85) {
          assert.equal(state.phase, 'replays');
          assert.equal(state.wallInert, false);
          const content = await page.locator('[data-studio-wall]').evaluate((el) =>
            [...el.querySelectorAll('h2, ul, a')].map((item) => {
              const rect = item.getBoundingClientRect();
              return { top: rect.top, bottom: rect.bottom };
            }),
          );
          assert.ok(
            content.every((rect) => rect.top >= 0 && rect.bottom <= config.height - 40),
            'Le titre, les affiches et les liens restent entièrement visibles.',
          );
        }
        if (progress === 0.4) {
          const targets = await page.locator('[data-studio-front] nav a').evaluateAll((links) =>
            links.map((link) => {
              const box = link.getBoundingClientRect();
              return (
                document
                  .elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
                  ?.closest('a') === link
              );
            }),
          );
          assert.ok(
            targets.length >= 3 && targets.every(Boolean),
            'Les objets du décor reçoivent les clics.',
          );
        }
        results.push({ viewport: config.name, progress, ...state });
        await page.screenshot({
          path: new URL(`${config.name}-${progress}.png`, output).pathname.replace(
            /^\/(?:([A-Z]:))/,
            '$1',
          ),
        });
      }
      // Les raccourcis natifs permettent de sauter l'allumage ou d'aller aux replays.
      await page.getByRole('link', { name: 'Scroll pour allumer le plateau' }).click();
      await page.waitForFunction(
        () => document.querySelector('[data-scroll-studio]').dataset.studioPhase === 'explore',
      );
      await page.keyboard.press('Home');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      await page.getByRole('link', { name: 'Voir les replays', exact: true }).click();
      await page.waitForFunction(
        () => document.querySelector('[data-scroll-studio]').dataset.studioPhase === 'replays',
      );
      const replay = page.locator('[data-studio-wall] a[href^="/episodes/"]').first();
      if (await replay.count()) {
        await replay.focus();
        assert.ok(await replay.evaluate((el) => el === document.activeElement));
        // Huit affiches dupliquées uniquement dans le navigateur de test pour contrôler la géométrie.
        const originalCount = await page.locator('[data-studio-wall] ul').evaluate((list) => {
          const count = list.children.length;
          while (list.children.length < 8) list.append(list.firstElementChild.cloneNode(true));
          list.dataset.count = '8';
          return count;
        });
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        const fits = await page.locator('[data-studio-wall]').evaluate((wall) =>
          [...wall.querySelectorAll('h2, ul, a')].every((item) => {
            const box = item.getBoundingClientRect();
            return box.top >= 0 && box.bottom <= innerHeight - 40;
          }),
        );
        assert.ok(
          fits,
          `Le mur de huit affiches tient aussi dans la fenêtre ${config.name} : ${JSON.stringify(await page.locator('[data-studio-wall]').evaluate((wall) => [...wall.querySelectorAll('h2, ul, a')].map((item) => ({ top: item.getBoundingClientRect().top, bottom: item.getBoundingClientRect().bottom }))))}`,
        );
        await page.screenshot({
          path: new URL(`${config.name}-fixture-eight.png`, output).pathname.replace(
            /^\/(?:([A-Z]:))/,
            '$1',
          ),
        });
        await page.locator('[data-studio-wall] ul').evaluate((list, count) => {
          while (list.children.length > count) list.lastElementChild.remove();
          list.dataset.count = String(count);
        }, originalCount);
      }
      await page.getByRole('button', { name: 'Réduire les mouvements', exact: true }).click();
      await page.waitForSelector('[data-scroll-studio="static"]');
      assert.equal(await page.locator('[data-studio-wall]').evaluate((el) => el.inert), false);
    } else {
      assert.equal(
        await page.locator('[data-studio-wall]').evaluate((el) => getComputedStyle(el).position),
        'relative',
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await page.screenshot({
        path: new URL(`${config.name}.png`, output).pathname.replace(/^\/(?:([A-Z]:))/, '$1'),
        fullPage: true,
      });
      results.push({ viewport: config.name, static: true, overflow: false });
    }
    if (config.javaScriptEnabled !== false) {
      const portraits = page.locator('[data-home-section="team"] img');
      for (const portrait of await portraits.all()) {
        await portrait.scrollIntoViewIfNeeded();
        await page.waitForFunction(
          (src) =>
            [...document.images].some(
              (img) => img.getAttribute('src') === src && img.naturalWidth > 0,
            ),
          await portrait.getAttribute('src'),
        );
      }
      await page.locator('[data-home-section="team"]').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: new URL(`${config.name}-team.png`, output).pathname.replace(/^\/(?:([A-Z]:))/, '$1'),
      });
      const linkedin = page.locator(
        'footer a[href="https://www.linkedin.com/company/sandbox-podcast-fr/"]',
      );
      assert.equal(await linkedin.count(), 1);
      await linkedin.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: new URL(`${config.name}-footer.png`, output).pathname.replace(
          /^\/(?:([A-Z]:))/,
          '$1',
        ),
      });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
    }
    await context.close();
  }
  assert.deepEqual(failures, [], 'Aucune erreur JavaScript navigateur.');
  await writeFile(new URL('report.json', output), JSON.stringify(results, null, 2));
  log(
    `${results.length} contrôles de progression et de rendu validés ; six configurations, retour arrière, raccourcis et pause.`,
  );
} finally {
  await browser.close();
}
