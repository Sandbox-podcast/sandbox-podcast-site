import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { log } from 'node:console';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';
import { startBadgeFixture } from './badges-fixture-server.mjs';
import { inspectSitemapPage, sitemapUrls } from '../src/domain/sitemap-health.ts';
import { skillGuides, skillGuidePath } from '../src/domain/skill-guides.ts';
const { fetch } = globalThis;

// Base et serveur isolés : aucune lecture des identifiants ni des données de production.
const fixture = await startBadgeFixture({ kind: 'public-routes' });
const artifacts = new URL('../.local/skill-guides-check/', import.meta.url);
let browser;
try {
  await mkdir(artifacts, { recursive: true });
  const sitemapResponse = await fetch(`${fixture.origin}/sitemap.xml`);
  assert.equal(sitemapResponse.status, 200);
  const urls = sitemapUrls(await sitemapResponse.text(), fixture.origin);
  const paths = [
    '/',
    '/about',
    '/nos-projets',
    '/nos-projets/sillage',
    '/charts/github',
    '/en/about',
    '/en/nos-projets/sillage',
    '/en/charts/github',
    '/es-es/charts/github',
    '/de-de/charts/github',
    '/guides',
    ...skillGuides.map((guide) => skillGuidePath(guide.slug)),
  ];
  const checks = [];
  for (const path of paths) {
    const url = fixture.origin + path;
    assert.ok(urls.includes(url), `URL dans le sitemap : ${path}`);
    const response = await fetch(url, { redirect: 'manual' });
    const html = await response.text();
    const inspection = inspectSitemapPage(url, response.status, response.headers, html);
    assert.deepEqual(inspection.issues, [], path);
    const visibleHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    assert.equal(visibleHtml.match(/<h1\b/g)?.length, 1, path);
    checks.push({ path, status: response.status, issues: inspection.issues });
  }
  assert.equal((await fetch(`${fixture.origin}/guides/does-not-exist`)).status, 404);
  const emptyPodcast = await fetch(`${fixture.origin}/podcast`);
  assert.equal(emptyPodcast.status, 200);
  assert.ok(!urls.includes(`${fixture.origin}/podcast`));
  assert.match(await emptyPodcast.text(), /name="robots" content="noindex/);
  assert.equal((await fetch(`${fixture.origin}/en/guides/meilleurs-skills-claude`)).status, 404);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'fr-FR', javaScriptEnabled: false });
  const page = await context.newPage();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${fixture.origin}/guides`);
    for (const guide of skillGuides) {
      await page.getByRole('link', { name: guide.heading, exact: false }).click();
      assert.equal(await page.locator('h1').textContent(), guide.heading);
      assert.equal(await page.locator('#choix > ul > li').count(), guide.options.length);
      const dimensions = await page.evaluate(async () => {
        await globalThis.document.fonts.ready;
        const viewport = globalThis.window.innerWidth;
        return {
          scroll: globalThis.document.documentElement.scrollWidth,
          viewport,
          overflowing: [...globalThis.document.querySelectorAll('body *')]
            .filter((element) => element.getBoundingClientRect().right > viewport + 1)
            .map((element) => ({
              tag: element.tagName,
              className: element.className,
              right: element.getBoundingClientRect().right,
              text: element.textContent?.slice(0, 100),
            })),
        };
      });
      assert.ok(
        dimensions.scroll <= dimensions.viewport + 1,
        `Pas de débordement : ${guide.slug} à ${width}px : ${JSON.stringify(dimensions)}`,
      );
      await page.getByRole('link', { name: 'Installation', exact: true }).click();
      assert.equal(new URL(page.url()).hash, '#installation');
      await page.screenshot({
        path: fileURLToPath(new URL(`${guide.slug}-${width}.png`, artifacts)),
        fullPage: true,
      });
      checks.push({
        path: skillGuidePath(guide.slug),
        width,
        withoutJavaScript: true,
        horizontalOverflow: false,
      });
      await page.goto(`${fixture.origin}/guides`);
    }
    for (const path of ['/about', '/en/nos-projets/sillage']) {
      await page.goto(fixture.origin + path);
      const overflow = await page.evaluate(
        () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth + 1,
      );
      assert.equal(overflow, false, `Pas de débordement : ${path} à ${width}px`);
      await page.screenshot({
        path: fileURLToPath(new URL(`${path.replaceAll('/', '-')}-${width}.png`, artifacts)),
        fullPage: true,
      });
      checks.push({ path, width, withoutJavaScript: true, horizontalOverflow: false });
    }
  }
  await context.close();
  await writeFile(
    new URL('results.json', artifacts),
    JSON.stringify({ checkedAt: new Date().toISOString(), checks }, null, 2),
  );
  log(
    `${checks.length} contrôles HTTP et navigateur réussis ; 10 captures dans apps/site/.local/skill-guides-check/.`,
  );
} catch (error) {
  log('Recette SEO échouée :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await fixture.close();
}
// Next dev conserve des observateurs de fichiers après close() sur Windows.
process.exit(process.exitCode ?? 0);
