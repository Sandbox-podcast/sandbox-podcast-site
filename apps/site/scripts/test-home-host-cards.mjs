/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';
import process from 'node:process';
import { log } from 'node:console';
import { HOME_HOST_ARTWORK } from '../src/domain/home-host-artwork.ts';

const origin = process.env.SANDBOX_FRONT_ORIGIN ?? 'http://127.0.0.1:3219';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const output = new URL('../.local/home-host-cards/', import.meta.url);
await mkdir(output, { recursive: true });
const hosts = JSON.parse(await readFile(new URL('../content/hosts.json', import.meta.url)));
const focusTitles = {
  lou: 'Créateur de quêtes du quotidien',
  loic: 'Inventeur, même sans Wi-Fi',
  nicolas: "Chef d'orchestre des agents",
};
for (const host of hosts.filter((item) => ['lou', 'loic', 'nicolas'].includes(item.slug))) {
  const options = { cwd: fileURLToPath(new URL('../../../', import.meta.url)), encoding: 'utf8' };
  const current = execFileSync(
    'git',
    ['hash-object', '--', 'apps/site/public' + host.photo],
    options,
  ).trim();
  const original = execFileSync(
    'git',
    ['rev-parse', 'HEAD:apps/site/public' + host.photo],
    options,
  ).trim();
  assert.equal(current, original, 'Photo originale préservée : ' + host.slug);
}
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 950 },
      isMobile: width < 768,
      hasTouch: width < 768,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    assert.equal((await page.goto(origin, { waitUntil: 'networkidle' })).status(), 200);
    const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
    if (await refuse.isVisible()) await refuse.click();
    const team = page.locator('[data-home-section="team"]');
    const cards = team.locator('[data-host-card]');
    assert.equal(await cards.count(), 3);
    for (const slug of ['lou', 'loic', 'nicolas']) {
      const host = hosts.find((item) => item.slug === slug);
      const card = cards.filter({
        has: page.getByRole('heading', { name: host.name, exact: true }),
      });
      assert.equal(await card.getAttribute('data-host-card'), slug);
      assert.equal(await card.getByText(focusTitles[slug], { exact: true }).count(), 1);
      await card.scrollIntoViewIfNeeded();
      const identity = card
        .getByRole('heading', { name: host.name, exact: true })
        .locator('..')
        .locator('..');
      const identityBox = await identity.boundingBox();
      const surfaceBox = await card.locator('[data-holo-surface]').boundingBox();
      assert.ok(
        identityBox.height <= surfaceBox.height * 0.22,
        'Identité compacte : au plus 22 % de la carte',
      );
      const nameSize = await card
        .getByRole('heading', { name: host.name, exact: true })
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      assert.ok(nameSize >= 28 && nameSize <= 36, 'Prénom lisible sans dominer le portrait');
      const image = card.locator('img');
      await page.waitForFunction((hostSlug) => {
        const image = document.querySelector(`[data-host-card="${hostSlug}"] img`);
        return image?.complete && image.naturalWidth > 0;
      }, slug);
      const source = new URL(await image.evaluate((element) => element.currentSrc));
      assert.equal(
        source.searchParams.get('url'),
        HOME_HOST_ARTWORK[slug],
        'Illustration fantastique dédiée',
      );
      assert.equal(await image.getAttribute('data-host-artwork'), slug);
      assert.equal(source.searchParams.get('q'), '90', 'Photo haute qualité');
      const details = card.locator('details');
      assert.equal(await details.getAttribute('open'), null);
      await details.locator('summary').press('Enter');
      assert.equal(await details.getAttribute('open'), '');
      const paragraphs = (await details.locator('p').allTextContents()).map((text) => text.trim());
      assert.deepEqual(paragraphs, host.bio.split(/\n\s*\n/), 'Biographie complète conservée');
      await details.locator('summary').click();
      for (const href of Object.values(host.socials)) {
        const link = card.locator(`a[href="${href}"]`);
        assert.equal(await link.count(), 1, 'Lien social natif');
        assert.equal(await link.getAttribute('target'), '_blank');
        assert.ok((await link.getAttribute('rel')).includes('noopener'));
        assert.equal(await link.isVisible(), true);
      }
      assert.equal(await card.locator('[data-holo-active="true"]').count(), 0);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        true,
      );
    }

    const first = cards.first();
    const surface = first.locator('[data-holo-surface]');
    await surface.scrollIntoViewIfNeeded();
    const bounds = await surface.boundingBox();
    await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.25);
    assert.equal(
      await surface.getAttribute('data-holo-active'),
      'false',
      'Réduction du mouvement respectée',
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // L'événement MediaQueryList du navigateur suit l'émulation CDP à la frame suivante.
    await page.waitForTimeout(100);
    await surface.hover({ position: { x: bounds.width * 0.2, y: bounds.height * 0.7 } });
    if (width >= 768) {
      await page.waitForFunction(() => document.querySelector('[data-holo-active="true"]'));
      const tilt = await surface.evaluate((element) => ({
        x: getComputedStyle(element).getPropertyValue('--tilt-x').trim(),
        y: getComputedStyle(element).getPropertyValue('--tilt-y').trim(),
      }));
      assert.ok(parseFloat(tilt.x) !== 0 || parseFloat(tilt.y) !== 0, 'Inclinaison au pointeur');
      assert.ok(
        Math.abs(parseFloat(tilt.x)) <= 7 && Math.abs(parseFloat(tilt.y)) <= 7,
        'Inclinaison limitée à sept degrés',
      );
      await surface.screenshot({
        path: fileURLToPath(new URL(`holographique-${width}.png`, output)),
      });
      await page.mouse.move(1, 1);
      await page.waitForFunction(() => !document.querySelector('[data-holo-active="true"]'));
      const reset = await surface.evaluate((element) => ({
        x: getComputedStyle(element).getPropertyValue('--tilt-x').trim(),
        y: getComputedStyle(element).getPropertyValue('--tilt-y').trim(),
      }));
      assert.equal(parseFloat(reset.x), 0, 'Inclinaison remise à zéro au départ du pointeur');
      assert.equal(parseFloat(reset.y), 0);
      await surface.hover({ position: { x: bounds.width * 0.2, y: bounds.height * 0.7 } });
      await page.waitForFunction(() => document.querySelector('[data-holo-active="true"]'));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => !document.querySelector('[data-holo-active="true"]'));
      assert.equal(await surface.getAttribute('data-holo-active'), 'false');
    } else {
      assert.equal(
        await surface.getAttribute('data-holo-active'),
        'false',
        'Pas de tilt sur écran tactile',
      );
    }
    await page.mouse.move(1, 1);
    await team.getByRole('heading', { name: 'Les voix de Sandbox.', exact: true }).click();
    await team.screenshot({ path: fileURLToPath(new URL(`team-${width}.png`, output)) });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      true,
    );
    assert.deepEqual(errors, []);
    results.push({
      width,
      cards: 3,
      sourcePhotosPreserved: true,
      fantasyArtwork: true,
      quality: 90,
      nativeDetails: true,
      bios: true,
      socials: true,
      reducedMotion: true,
      tilt: width >= 768,
      overflow: false,
      errors,
    });
    log(
      `PASS ${width} : cartes fantastiques, originaux préservés, biographies, liens et holographie`,
    );
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(new URL('report.json', output), JSON.stringify(results, null, 2) + '\n');
}
