/* global document, innerWidth, scrollY */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';
import { chromium } from 'playwright';

const origin = process.env.SANDBOX_TEST_ORIGIN ?? 'http://127.0.0.1:3100';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Serveur local requis.');
const partial = Boolean(
  process.env.SANDBOX_MOBILE_WIDTHS ||
  process.env.SANDBOX_MOBILE_LOCALES ||
  process.env.SANDBOX_MOBILE_PATHS,
);
const output = new URL(
  partial ? '../.local/mobile-shell-targeted/' : '../.local/mobile-shell/',
  import.meta.url,
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const failures = [];
const configs = [
  { locale: 'fr-FR', prefix: '', homeLabel: 'Accueil Sandbox' },
  { locale: 'en', prefix: '/en', homeLabel: 'Sandbox home' },
  { locale: 'es-ES', prefix: '/es-es', homeLabel: 'Inicio de Sandbox' },
  { locale: 'de-DE', prefix: '/de-de', homeLabel: 'Sandbox-Startseite' },
];

try {
  for (const width of [320, 375, 390].filter(
    (value) =>
      !process.env.SANDBOX_MOBILE_WIDTHS ||
      process.env.SANDBOX_MOBILE_WIDTHS.split(',').includes(String(value)),
  )) {
    for (const config of configs.filter(
      (value) =>
        !process.env.SANDBOX_MOBILE_LOCALES ||
        process.env.SANDBOX_MOBILE_LOCALES.split(',').includes(value.locale),
    )) {
      const context = await browser.newContext({
        viewport: { width, height: 812 },
        hasTouch: true,
        isMobile: true,
      });
      const page = await context.newPage();
      let consentChosen = false;
      page.setDefaultTimeout(60_000);
      page.on('pageerror', (error) => failures.push(`${width} ${config.locale}: ${error.message}`));
      for (const path of ['', '/podcast', '/news', '/charts', '/about']) {
        if (
          process.env.SANDBOX_MOBILE_PATHS &&
          !process.env.SANDBOX_MOBILE_PATHS.split(',').includes(path || '/')
        )
          continue;
        const route = config.prefix + path || '/';
        try {
          const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
          if (response.status() === 404) {
            results.push({ width, route, status: 'unavailable', httpStatus: 404 });
            continue;
          }
          assert.equal(response.status(), 200);
          const reject = page.getByRole('button', { name: /^(Refuser|Reject|Rechazar|Ablehnen)$/ });
          await page.evaluate(() => document.fonts.ready);
          await page.locator('.mobile-navigation[data-hydrated="true"]').waitFor();
          if (!consentChosen) {
            await reject.waitFor();
            await reject.tap();
            await page.locator('#site-measurement-consent').waitFor({ state: 'hidden' });
            consentChosen = true;
          }
          const header = page.locator('.site-header');
          const home = header.locator('.site-home-link');
          assert.equal(await home.getAttribute('href'), config.prefix || '/');
          assert.equal(await home.getAttribute('aria-label'), config.homeLabel);
          assert.ok(
            await home.locator('img').evaluate((img) => img.complete && img.naturalWidth > 0),
          );
          const headerTargets = await header
            .locator('.site-home-link, .locale-switcher, .mobile-menu-trigger')
            .evaluateAll((items) =>
              items.map((item) => {
                const box = item.getBoundingClientRect();
                return { width: box.width, height: box.height, x: box.x, right: box.right };
              }),
            );
          assert.ok(
            headerTargets.length >= 3 &&
              headerTargets.every(
                (box) => box.width >= 44 && box.height >= 44 && box.x >= 0 && box.right <= width,
              ),
            'Logo, langue et menu accessibles au toucher.',
          );
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
            false,
            'Aucun débordement horizontal.',
          );
          if (path === '')
            await page.screenshot({
              path: fileURLToPath(new URL(`${config.locale}-${width}-home.png`, output)),
            });
          const menu = page.locator('.mobile-navigation');
          await menu.locator('summary').tap();
          assert.equal(await menu.getAttribute('open'), '');
          const targets = await menu.locator('.mobile-menu-panel a').evaluateAll((links) =>
            links.map((link) => {
              const box = link.getBoundingClientRect();
              return {
                height: box.height,
                hit:
                  document
                    .elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
                    ?.closest('a') === link,
              };
            }),
          );
          assert.ok(
            targets.length >= 4 && targets.every((target) => target.height >= 44 && target.hit),
            'Liens du menu visibles et cliquables.',
          );
          if (width === 390 && path === '')
            await page.screenshot({
              path: fileURLToPath(new URL(`${config.locale}-${width}-menu.png`, output)),
            });
          await page.keyboard.press('Escape');
          assert.equal(await menu.getAttribute('open'), null);
          await menu.locator('summary').tap();
          await header.locator('.locale-switcher').tap();
          assert.equal(await menu.getAttribute('open'), null, 'Un appui extérieur ferme le menu.');
          assert.equal(await page.locator('.locale-options-list a:visible').count(), 4);
          await page.keyboard.press('Escape');
          const footer = page.locator('footer.site-footer');
          await footer.scrollIntoViewIfNeeded();
          const footerHeight = (await footer.boundingBox()).height;
          assert.ok(footerHeight <= 380, `Footer replié compact : ${footerHeight}px.`);
          assert.equal(await footer.locator('.footer-platforms a:visible').count(), 6);
          for (const summary of await footer.locator('.footer-navigation-mobile summary').all()) {
            await summary.tap();
            assert.ok((await summary.locator('..').locator('a:visible').count()) >= 4);
            await summary.tap();
          }
          assert.equal(await footer.locator('a[href$="/confidentialite"]:visible').count(), 1);
          assert.equal(
            await footer.locator('.footer-home-link').getAttribute('href'),
            config.prefix || '/',
          );
          if (path === '')
            await page.screenshot({
              path: fileURLToPath(new URL(`${config.locale}-${width}-footer.png`, output)),
            });
          if (path === '') {
            await footer.locator('.footer-home-link').tap();
            await page.waitForFunction(() => scrollY < 5);
          }
          if (path === '/podcast') {
            await home.tap();
            await page.waitForURL(origin + (config.prefix || '/'), { waitUntil: 'commit' });
            await page.locator('.mobile-navigation summary').tap();
            await page.locator(`.mobile-menu-panel a[href="${config.prefix}/podcast"]`).tap();
            await page.waitForURL(origin + config.prefix + '/podcast', { waitUntil: 'commit' });
            assert.equal(await page.locator('.mobile-navigation').getAttribute('open'), null);
          }
          results.push({ width, route, footerHeight, status: 'passed', headerTargets });
          log(`PASS ${width}px ${route} — footer ${Math.round(footerHeight)}px`);
        } catch (error) {
          failures.push(`${width}px ${route}: ${error.message}`);
          log(`FAIL ${width}px ${route}: ${error.stack}`);
          await page.screenshot({
            path: fileURLToPath(
              new URL(
                `${config.locale}-${width}-${path.replaceAll('/', '') || 'home'}-failure.png`,
                output,
              ),
            ),
            fullPage: true,
          });
        }
      }
      await context.close();
    }
  }
} finally {
  await writeFile(
    new URL('report.json', output),
    JSON.stringify({ origin, results, failures }, null, 2),
  );
  await browser.close();
}
assert.deepEqual(failures, []);
log(
  `${results.filter((result) => result.status === 'passed').length} parcours mobiles vérifiés ; ${results.filter((result) => result.status === 'unavailable').length} routes non disponibles sur ce serveur.`,
);
