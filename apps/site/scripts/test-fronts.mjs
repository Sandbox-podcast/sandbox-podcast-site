/* global document, getComputedStyle */
// Audit reproductible des fronts locaux. Les requêtes du navigateur vers les services tiers sont bloquées.
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.SANDBOX_PLAYWRIGHT_PATH ?? 'playwright');
const origin = process.env.SANDBOX_TEST_ORIGIN ?? 'http://127.0.0.1:3317';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname))
  throw new Error('Cet audit est réservé au serveur local.');
const output = new URL('../.local/fronts/', import.meta.url);
const reportName = process.env.SANDBOX_TEST_REPORT ?? 'report';
if (!/^[a-z0-9-]+$/.test(reportName)) throw new Error('Nom de rapport invalide.');
await mkdir(output, { recursive: true });
const paths = process.env.SANDBOX_TEST_PATHS?.split(',') ?? [
  '/',
  '/charts',
  '/charts/skills',
  '/charts/ai-models',
  '/charts/rising',
  '/charts/history',
  '/charts/github/methodology',
  '/charts/awards',
  '/nos-projets',
  '/nos-projets/sillage',
  '/about',
  '/episodes',
  '/episodes/1',
  '/topics',
  '/search?q=Claude',
  '/search?q=zzzzzzzz',
  '/admin',
  '/en',
  '/es-es/charts',
  '/de-de/nos-projets',
];
const widths = (process.env.SANDBOX_TEST_WIDTHS ?? '320,375,390,768,1024,1440')
  .split(',')
  .map(Number);
const browser = await chromium.launch({
  headless: true,
  channel: process.env.SANDBOX_BROWSER_CHANNEL ?? 'msedge',
});
const results = [];
try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      isMobile: width < 768,
      hasTouch: width < 768,
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of paths) {
      errors.length = 0;
      const result = { width, path };
      try {
        const response = await page.goto(origin + path, {
          waitUntil: 'networkidle',
          timeout: 60000,
        });
        await page.evaluate(() => document.fonts.ready);
        const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
        if (await refuse.isVisible()) await refuse.click();
        result.status = response.status();
        Object.assign(
          result,
          await page.evaluate(() => {
            const viewport = document.documentElement.clientWidth;
            const overflowing = [...document.querySelectorAll('body *')]
              .filter((el) => {
                if (
                  !el.getClientRects().length ||
                  el.matches('.skip:not(:focus)') ||
                  getComputedStyle(el).position === 'fixed'
                )
                  return false;
                let parent = el.parentElement;
                while (parent && parent !== document.body) {
                  if (
                    ['auto', 'scroll', 'hidden', 'clip'].includes(
                      getComputedStyle(parent).overflowX,
                    )
                  )
                    return false;
                  parent = parent.parentElement;
                }
                const rect = el.getBoundingClientRect();
                return rect.right > viewport + 1 || rect.left < -1;
              })
              .slice(0, 12)
              .map((el) => ({
                tag: el.tagName,
                class: el.className,
                text: el.textContent?.trim().slice(0, 80),
                right: Math.round(el.getBoundingClientRect().right),
              }));
            return {
              viewport,
              scrollWidth: document.documentElement.scrollWidth,
              overflowing,
              h1: [...document.querySelectorAll('h1')].map((el) => el.textContent),
            };
          }),
        );
        result.errors = [...errors];
        result.passed =
          result.status === 200 &&
          result.scrollWidth <= width + 1 &&
          !result.overflowing.length &&
          !errors.length;
        if ([320, 390, 1440].includes(width)) {
          if (path === '/')
            await page.screenshot({ path: fileURLToPath(new URL(`home-${width}.png`, output)) });
          await page.screenshot({
            path: fileURLToPath(
              new URL(`${width}-${path.replace(/[^a-z0-9]/gi, '-') || 'home'}.png`, output),
            ),
            fullPage: true,
          });
        }
      } catch (error) {
        result.passed = false;
        result.failure = error.message;
      }
      results.push(result);
      log(
        `${result.passed ? 'PASS' : 'FAIL'} ${width} ${path}${result.passed ? '' : ' ' + JSON.stringify(result)}`,
      );
      await writeFile(new URL(`${reportName}.json`, output), JSON.stringify(results, null, 2));
    }
    await context.close();
  }
} finally {
  await browser.close();
}
const failed = results.filter((result) => !result.passed);
log(`${results.length - failed.length}/${results.length} pages et largeurs validées.`);
if (failed.length) process.exitCode = 1;
