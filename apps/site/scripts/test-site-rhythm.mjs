/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';
import { chromium } from 'playwright';

const origin = process.env.SANDBOX_FRONT_ORIGIN ?? 'http://127.0.0.1:3219';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const auditOnly = process.env.SANDBOX_RHYTHM_AUDIT === '1';
const output = new URL(`../.local/site-rhythm-${auditOnly ? 'before' : 'after'}/`, import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 950 },
      reducedMotion: 'reduce',
    });
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'sandbox.analytics-consent.v2',
        JSON.stringify({ version: 2, choice: 'rejected', chosenAt: Date.now() }),
      );
    });
    for (const route of [
      '/',
      '/podcast',
      '/episodes/1',
      '/about',
      '/nos-projets',
      '/nos-projets/song-maker',
      '/nos-projets/video-club?from=studio',
      '/charts',
      '/charts/history',
      '/time-machine',
      '/search',
      '/confidentialite',
    ]) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded' });
      await page.locator('main h1').first().waitFor();
      const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
      if (await refuse.isVisible()) await refuse.click();
      await page.evaluate(() => document.fonts.ready);
      const waitForVisibleImages = () =>
        page.waitForFunction(() =>
          [...document.querySelectorAll('main img')]
            .filter((image) => {
              const box = image.getBoundingClientRect();
              return (
                image.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
                box.width > 0 &&
                box.height > 0 &&
                box.right > 0 &&
                box.left < window.innerWidth &&
                box.bottom > 0 &&
                box.top < window.innerHeight
              );
            })
            .every((image) => image.complete && image.naturalWidth > 0),
        );
      if (route === '/') await waitForVisibleImages();
      const metrics = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect();
        const action = rect('[data-home-section="projects"] a[href="/nos-projets"]');
        const explore = rect('#home-explore-title');
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          height: document.documentElement.scrollHeight,
          title: document.querySelector('h1')?.textContent,
          privacyLabelSize: document.querySelector('.privacy-page header .label')
            ? parseFloat(
                getComputedStyle(document.querySelector('.privacy-page header .label')).fontSize,
              )
            : null,
          projectToExplore: action && explore ? Math.round(explore.top - action.bottom) : null,
          sections: [...document.querySelectorAll('main > *, main section')]
            .filter((el) => el.getBoundingClientRect().height > 0)
            .slice(0, 14)
            .map((el) => ({
              selector: el.tagName + '.' + el.className,
              top: Math.round(el.getBoundingClientRect().top + window.scrollY),
              height: Math.round(el.getBoundingClientRect().height),
              padding: getComputedStyle(el).paddingBlock,
            })),
        };
      });
      assert.equal(response.status(), 200, route);
      assert.ok(metrics.title, `Titre de page : ${route}`);
      assert.ok(metrics.overflow <= 1, `Débordement ${route} à ${width} : ${metrics.overflow}`);
      assert.deepEqual(errors, [], `Erreurs JavaScript : ${route}`);
      if (!auditOnly && metrics.privacyLabelSize !== null)
        assert.ok(metrics.privacyLabelSize <= 16, 'La date de mise à jour reste une légende');
      if (!auditOnly && route === '/')
        assert.ok(
          metrics.projectToExplore <= (width <= 900 ? 125 : 150),
          `Transition projets / exploration : ${metrics.projectToExplore}px`,
        );
      const slug = route === '/' ? 'home' : route.split('?')[0].slice(1).replaceAll('/', '-');
      if ([390, 1440].includes(width)) {
        await page.screenshot({ path: fileURLToPath(new URL(`${slug}-${width}.png`, output)) });
        if (route === '/') {
          await page
            .locator('[data-home-section="projects"] a[href="/nos-projets"]')
            .evaluate((el) =>
              window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 260),
            );
          await waitForVisibleImages();
          await page.screenshot({
            path: fileURLToPath(new URL(`home-transition-${width}.png`, output)),
          });
        }
      }
      results.push({ route, width, status: response.status(), ...metrics });
      log(
        `PASS ${width} ${route}${metrics.projectToExplore === null ? '' : ` gap=${metrics.projectToExplore}px`}`,
      );
      await writeFile(new URL('report.json', output), JSON.stringify(results, null, 2) + '\n');
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
log(`${results.length} pages et tailles vérifiées.`);
