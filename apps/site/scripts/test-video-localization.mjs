/* global document, window */
import assert from 'node:assert/strict';
import { log } from 'node:console';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const origin = process.env.SITE_TEST_ORIGIN ?? 'http://127.0.0.1:3100';
const output = join(process.cwd(), '.local', 'video-localization');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  for (const width of [320, 390, 1440]) {
    for (const locale of ['en', 'es-es', 'de-de']) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      for (const path of ['', '/podcast', '/episodes/2']) {
        const url = `${origin}/${locale}${path}`;
        const response = await page.goto(url, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 200, url);
        const rejectAnalytics = page.getByRole('button', {
          name: /^(?:Reject|Rechazar|Ablehnen)$/,
          exact: true,
        });
        if (await rejectAnalytics.isVisible()) await rejectAnalytics.click();
        await page.locator('[data-localized-episode-artwork]').first().waitFor();
        const text = await page.locator('main').innerText();
        assert(!text.includes('Restaurateurs, artisans, commerçants'), url);
        assert(!text.includes('Que peut faire l’IA dans votre métier'), url);
        if (path === '/episodes/2') {
          assert(!text.includes('Le site et nos ressources'), url);
          assert(!text.includes('Épisode audio sur Spotify'), url);
          assert.equal(await page.locator('iframe').count(), 0, url);
        }
        const layout = await page.locator('main').evaluate((main) => ({
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          artworkCount: main.querySelectorAll('[data-localized-episode-artwork]').length,
        }));
        assert(!layout.overflow, `${url} @${width}: horizontal overflow`);
        assert.equal(errors.length, 0, `${url}: ${errors.join('; ')}`);
        if (path === '/podcast')
          await page.locator('.latest-replay').screenshot({
            path: join(output, `${locale}-${width}-replay.png`),
          });
        if (path === '' && width === 390)
          await page.locator('[data-home-section="replays"]').screenshot({
            path: join(output, `${locale}-${width}-posters.png`),
          });
        checks.push({ locale, width, path: path || '/', ...layout, errors });
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(join(output, 'report.json'), JSON.stringify(checks, null, 2) + '\n');
log(`${checks.length} contrôles vidéo/i18n réussis ; rapport : ${output}`);
