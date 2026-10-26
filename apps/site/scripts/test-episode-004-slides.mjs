/* global document */
import assert from 'node:assert/strict';
import console from 'node:console';
import process from 'node:process';
import { URL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { scenes } from '../public/slides/episode-004/model.js';

const base =
  process.env.SANDBOX_SLIDES_URL ?? 'http://127.0.0.1:4335/slides/episode-004/index.html';
const output = new URL('../.local/episode-004/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
try {
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [940, 568],
    [390, 844],
    [320, 700],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    for (const live of [false, true]) {
      await page.goto(`${base}${live ? '?live=1' : ''}#radar`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      for (const [index, slide] of scenes.entries()) {
        if (index) await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('h1').innerText(), slide.title);
        await page.locator('.slide-illustration').evaluate((image) => image.decode());
        assert.equal(new URL(page.url()).hash, `#${slide.id}`);
        assert.equal(await page.locator('.sources a').count(), slide.sources.length);
        if (slide.kind === 'radar-context') {
          assert.match(
            await page.locator('.context-definition').innerText(),
            /Teamwork Graph.*relie/s,
          );
          assert.match(
            await page.locator('.context-definition').innerText(),
            /Code Context.*compréhension du code/s,
          );
          assert.match(
            await page.locator('.context-evidence').innerText(),
            /tests internes.*jusqu'à/s,
          );
        }
        if (slide.kind === 'radar-results') {
          const results = await page.locator('.explained-results').innerText();
          assert.match(results, /plusieurs mois de roadmap en quelques semaines/);
          assert.match(results, /mécanismes qui activent ou désactivent une fonctionnalité/);
          assert.match(
            await page.locator('.measurement-explained').innerText(),
            /retour sur investissement/,
          );
        }
        if (slide.kind === 'radar-workflow') {
          assert.deepEqual(await page.locator('.sdlc-seven h2').allTextContents(), [
            'Contexte',
            'Planning',
            'Design',
            'Développement',
            'Review',
            'Maintenance',
            'Mesure',
          ]);
          assert.equal(await page.locator('.sdlc-seven li').count(), 7);
          if (width >= 1280) {
            const rows = await page.locator('.sdlc-seven li').evaluateAll((items) =>
              items.map((item) => {
                const heading = item.querySelector('h2').getBoundingClientRect();
                const description = item.querySelector('p').getBoundingClientRect();
                return { right: heading.right, left: description.left };
              }),
            );
            assert.ok(rows.every((row) => row.right < row.left));
          }
        }
        const geometry = await page.evaluate(() => {
          const screen = document.getElementById('screen');
          const article = screen.querySelector('article');
          const heading = screen.querySelector('.slide-heading');
          const visual = heading.nextElementSibling;
          const sources = screen.querySelector('.sources');
          const box = screen.getBoundingClientRect();
          const abox = article.getBoundingClientRect();
          return {
            horizontalOverflow: screen.scrollWidth > screen.clientWidth + 1,
            articleTop: abox.top - box.top,
            articleBottom: abox.bottom - box.top,
            screenHeight: screen.clientHeight,
            headingOverlap:
              heading.getBoundingClientRect().bottom > visual.getBoundingClientRect().top + 1,
            sourceOverlap:
              visual.getBoundingClientRect().bottom > sources.getBoundingClientRect().top + 1,
            images: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
          };
        });
        assert.equal(
          geometry.horizontalOverflow,
          false,
          JSON.stringify({ width, height, live, slide: slide.id, geometry }),
        );
        assert.equal(geometry.headingOverlap || geometry.sourceOverlap, false);
        assert.equal(geometry.images, true);
        if (
          width >= 1280 ||
          (live && width === 940 && ['radar-workflow', 'radar-context'].includes(slide.kind))
        ) {
          assert.ok(geometry.articleTop >= -1);
          assert.ok(
            geometry.articleBottom <= geometry.screenHeight + 1,
            JSON.stringify({ width, height, live, slide: slide.id, geometry }),
          );
        }
        if (live && width === 1920)
          await page.screenshot({
            path: new URL(`slide-${index + 1}.png`, output).pathname.replace(/^\/(\w:)/, '$1'),
          });
        if (live && width === 390)
          await page.screenshot({
            path: new URL(`mobile-${index + 1}.png`, output).pathname.replace(/^\/(\w:)/, '$1'),
          });
        if (live && width === 940 && slide.kind === 'radar-workflow')
          await page.screenshot({
            path: new URL('seven-steps-940.png', output).pathname.replace(/^\/(\w:)/, '$1'),
          });
        results.push({ width, height, live, slide: slide.id, geometry });
      }
      await page.keyboard.press('ArrowRight');
      assert.equal(new URL(page.url()).hash, '#talk-debat');
      await page.keyboard.press('Home');
      assert.equal(new URL(page.url()).hash, '#radar');
      await page.keyboard.press('n');
      assert.equal(await page.locator('#notes').isVisible(), true);
      assert.match(await page.locator('#notes-content').innerText(), /Atlassian/);
      await page.keyboard.press('ArrowRight');
      assert.equal(new URL(page.url()).hash, '#radar');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#notes').isVisible(), false);
      await page.keyboard.press('End');
      assert.equal(new URL(page.url()).hash, '#talk-debat');
      await page.keyboard.press('ArrowLeft');
      assert.equal(new URL(page.url()).hash, '#talk-tickets');
      await page.keyboard.press('p');
      assert.equal(
        await page.locator('body').evaluate((body) => body.classList.contains('presenting')),
        !live,
      );
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  await writeFile(new URL('verification.json', output), JSON.stringify(results, null, 2));
  console.log(
    `${results.length} vues vérifiées : huit slides, six formats, avec et sans régie. Navigation et notes vérifiées.`,
  );
} finally {
  await browser.close();
}
