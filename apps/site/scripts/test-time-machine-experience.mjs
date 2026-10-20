/* global document, window, CanvasRenderingContext2D, getComputedStyle, DOMParser */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.SANDBOX_PLAYWRIGHT_PATH ?? 'playwright');
const origin = process.env.SANDBOX_FRONT_ORIGIN ?? 'http://127.0.0.1:3219';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const selectedChecks = process.env.SANDBOX_TIME_MACHINE_CHECKS?.split(',');
const widths = process.env.SANDBOX_TIME_MACHINE_WIDTHS?.split(',').map(Number) ?? [
  320, 390, 768, 1440,
];
assert.ok(widths.every((width) => [320, 390, 768, 1440].includes(width)));
const output = new URL(
  selectedChecks
    ? '../.local/time-machine-experience-focus/'
    : '../.local/time-machine-experience/',
  import.meta.url,
);
await mkdir(output, { recursive: true });
const corpus = JSON.parse(await readFile(new URL('../content/ai-history.json', import.meta.url)));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const failures = [];

try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 950 },
      reducedMotion: 'reduce',
      isMobile: width < 768,
      hasTouch: width < 768,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.addInitScript(() => {
      window.__sandboxStarfieldFrames = 0;
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        if (this.canvas.hasAttribute('data-temporal-starfield'))
          window.__sandboxStarfieldFrames += 1;
        return clear.apply(this, args);
      };
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const check = async (name, run) => {
      if (selectedChecks && name !== 'premier-ecran' && !selectedChecks.includes(name)) return;
      try {
        const metrics = await run();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
          true,
          'Débordement horizontal',
        );
        assert.deepEqual(errors, [], 'Erreur JavaScript');
        results.push({ width, name, passed: true, ...metrics });
        log(`PASS ${width} ${name}`);
      } catch (error) {
        failures.push(`${width} ${name}: ${error.message}`);
        results.push({ width, name, passed: false, error: error.message });
        log(`FAIL ${width} ${name}: ${error.message}`);
        await page.screenshot({
          path: fileURLToPath(new URL(`${width}-${name}-failed.png`, output)),
        });
      }
      await writeFile(new URL('report.json', output), JSON.stringify(results, null, 2) + '\n');
    };
    const inspector = page.getByRole('complementary', { name: "Fiche de l'événement sélectionné" });
    const filters = page
      .locator('details')
      .filter({
        has: page.locator('summary', { hasText: 'Affiner la chronologie' }),
      })
      .first();
    const range = page.getByRole('slider', { name: 'Parcourir les événements chronologiques' });

    await check('premier-ecran', async () => {
      const response = await page.goto(origin + '/time-machine', { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
      if (await refuse.isVisible()) await refuse.click();
      await inspector.waitFor();
      assert.equal(
        await inspector
          .locator('[data-active="true"] img[data-history-artwork]')
          .evaluate((image) => image.complete && image.naturalWidth > 0),
        true,
        'Illustration principale chargée',
      );
      assert.equal(await page.locator('article[id^="ia-"]').count(), corpus.events.length);
      const artworkImages = page.locator('article[id^="ia-"] img[data-history-artwork-id]');
      const artworkIds = await artworkImages.evaluateAll((images) =>
        images.map((image) => image.getAttribute('data-history-artwork-id')),
      );
      assert.deepEqual(
        artworkIds.toSorted(),
        corpus.events.map((event) => event.id).toSorted(),
        'Une illustration dédiée par invention',
      );
      const artworkPaths = await artworkImages.evaluateAll((images) =>
        images.map((image) => new URL(image.getAttribute('src'), window.location.href).pathname),
      );
      assert.equal(
        new Set(artworkPaths).size,
        corpus.events.length,
        'Aucune illustration partagée entre inventions',
      );
      if (width === widths[0]) {
        const hashes = await Promise.all(
          artworkPaths.map(async (path) =>
            createHash('sha256')
              .update(await readFile(new URL('../public' + path, import.meta.url)))
              .digest('hex'),
          ),
        );
        assert.equal(
          new Set(hashes).size,
          corpus.events.length,
          'Chaque affiche contient un dessin distinct',
        );
      }
      assert.equal(
        await page
          .locator('article[id^="ia-"]')
          .evaluateAll((rows) =>
            rows.every((row) => row.querySelector('button img, button svg[role="img"]')),
          ),
        true,
      );
      assert.equal(await inspector.locator('details').getAttribute('open'), null);
      assert.equal(await filters.getAttribute('open'), null);
      assert.equal(
        await page.getByRole('button', { name: "Rejouer l'histoire", exact: true }).isDisabled(),
        true,
      );
      assert.equal(await page.locator('[data-motion]').getAttribute('data-motion'), 'off');
      await page.screenshot({ path: fileURLToPath(new URL(`time-machine-${width}.png`, output)) });
    });

    await check('details-et-sources', async () => {
      await inspector.locator('summary').click();
      const sources = inspector.locator('a[target="_blank"]');
      assert.ok((await sources.count()) > 0);
      for (const source of await sources.all()) {
        assert.ok((await source.getAttribute('href')).startsWith('https://'));
        assert.ok((await source.getAttribute('rel')).includes('noopener'));
      }
      await inspector.locator('summary').click();
      assert.equal(await inspector.locator('details').getAttribute('open'), null);
    });

    await check('cartes-depliees', async () => {
      const cards = inspector.locator('[data-expanded-event]:visible');
      assert.equal(await cards.count(), width <= 1000 ? 3 : 5);
      assert.equal(await inspector.locator('[data-expanded-event][data-active="true"]').count(), 1);
      for (const card of await cards.all()) {
        const box = await card.boundingBox();
        assert.ok(box.width >= 44, 'Lamelle cliquable de 44 px au moins');
      }
      const target = inspector
        .locator('[data-expanded-event][data-active="false"]:visible')
        .first();
      const targetId = await target.getAttribute('data-expanded-event');
      if (width < 768) await target.locator('button').tap();
      else {
        const activeId = await inspector
          .locator('[data-active="true"]')
          .getAttribute('data-expanded-event');
        await target.locator('button').hover({ position: { x: 20, y: 100 } });
        assert.equal(
          await inspector.locator('[data-active="true"]').getAttribute('data-expanded-event'),
          activeId,
          'Le survol ne change pas la fiche',
        );
        await target.locator('button').click({ position: { x: 20, y: 100 } });
      }
      await inspector.locator(`[data-expanded-event="${targetId}"][data-active="true"]`).waitFor();
      assert.equal(await inspector.getByRole('heading', { level: 3 }).count(), 1);
      const activeButton = inspector.locator('[data-active="true"] button');
      const before = Number(await range.inputValue());
      await activeButton.press('ArrowRight');
      assert.equal(Number(await range.inputValue()), before + 1);
      await page.waitForFunction(
        () =>
          document.activeElement?.closest('[data-expanded-event]')?.getAttribute('data-active') ===
          'true',
      );
      await page.screenshot({
        path: fileURLToPath(new URL(`expanded-cards-${width}.png`, output)),
      });
    });

    await check('navigation-clavier', async () => {
      // Garder deux étapes disponibles : le bouton suivant est désactivé au dernier événement.
      await page.getByRole('button', { name: 'Événement précédent', exact: true }).click();
      await page.getByRole('button', { name: 'Événement précédent', exact: true }).click();
      await page.locator('body').click({ position: { x: 3, y: 3 } });
      const initialIndex = Number(await range.inputValue());
      await page.keyboard.press('ArrowRight');
      assert.equal(
        Number(await range.inputValue()),
        initialIndex + 1,
        'Flèche droite sans focus sur une carte',
      );
      await page.keyboard.press('ArrowLeft');
      assert.equal(
        Number(await range.inputValue()),
        initialIndex,
        'Flèche gauche sans focus sur une carte',
      );
      await filters.locator(':scope > summary').click();
      const search = page.getByRole('searchbox', {
        name: 'Rechercher une annonce, un modèle ou une organisation',
      });
      await search.focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(
        Number(await range.inputValue()),
        initialIndex,
        'La saisie ne déplace pas la timeline',
      );
      await filters.locator(':scope > summary').click();
      const nextButton = page.getByRole('button', { name: 'Événement suivant', exact: true });
      const carousel = inspector.locator('[data-history-carousel]');
      const carouselBox = await carousel.boundingBox();
      for (const button of await carousel
        .getByRole('group', { name: 'Parcourir la chronologie' })
        .getByRole('button')
        .all()) {
        const box = await button.boundingBox();
        assert.ok(box.width >= 44 && box.height >= 44, 'Cible tactile suffisante');
        assert.ok(
          box.x >= carouselBox.x && box.x + box.width <= carouselBox.x + carouselBox.width,
          'Commande dans la largeur du carrousel',
        );
        assert.ok(
          box.y >= carouselBox.y &&
            box.y + box.height <= carouselBox.y + Math.min(carouselBox.height, 540),
          'Commande dans la zone illustrée',
        );
      }
      assert.equal(
        await carousel.getByRole('button', { name: 'Événement suivant', exact: true }).count(),
        1,
      );
      await nextButton.click();
      const afterClick = Number(await range.inputValue());
      assert.equal(
        await nextButton.evaluate((button) => button === document.activeElement),
        true,
        'Focus conservé après navigation',
      );
      await nextButton.press('Enter');
      assert.equal(Number(await range.inputValue()), afterClick + 1);
      const before = await range.getAttribute('aria-valuetext');
      await range.press('ArrowRight');
      assert.notEqual(await range.getAttribute('aria-valuetext'), before);
      await range.press('Home');
      assert.equal(await range.inputValue(), '0');
      assert.equal(
        await page.getByRole('button', { name: 'Événement précédent', exact: true }).isDisabled(),
        true,
      );
      await range.press('End');
      assert.equal(await range.inputValue(), String(corpus.events.length - 1));
      assert.equal(
        await page.getByRole('button', { name: 'Événement suivant', exact: true }).isDisabled(),
        true,
      );
      const curveSummary = page.locator('summary', { hasText: 'Voir la courbe chronologique' });
      await curveSummary.click();
      const chart = page.getByRole('group', { name: /^Courbe chronologique/ });
      await chart.press('Home');
      assert.equal(await range.inputValue(), '0');
      await chart.press('ArrowRight');
      assert.equal(await range.inputValue(), '1');
      await curveSummary.click();
    });

    await check('annee-visible', async () => {
      const yearSelect = page.getByRole('combobox', { name: 'Explorer une année', exact: true });
      await yearSelect.selectOption('2024');
      await page.waitForFunction(() =>
        document
          .querySelector('[data-active="true"] time')
          ?.getAttribute('datetime')
          ?.startsWith('2024'),
      );
      assert.equal(await yearSelect.inputValue(), '2024');
      await yearSelect.selectOption('all');
      return { yearSelected: 2024 };
    });

    await check('filtres-et-empty', async () => {
      await filters.locator(':scope > summary').click();
      await page.getByLabel('Année de début', { exact: true }).selectOption('2026');
      assert.equal(
        await page.locator('article[id^="ia-"]').count(),
        corpus.events.filter((event) => event.date.startsWith('2026')).length,
      );
      await page.getByLabel('Année de fin', { exact: true }).selectOption('2024');
      assert.equal(await page.getByLabel('Année de début', { exact: true }).inputValue(), '2024');
      assert.equal(await page.getByLabel('Année de fin', { exact: true }).inputValue(), '2024');
      await page.getByRole('button', { name: 'Toutes les années', exact: true }).click();
      const search = page.getByRole('searchbox', {
        name: 'Rechercher une annonce, un modèle ou une organisation',
      });
      await search.fill('CRISPR');
      assert.ok((await page.locator('article[id^="ia-"]').count()) > 0);
      await search.fill('aucun-evenement-zzzz');
      await page.getByRole('heading', { name: 'Aucun résultat.', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Réinitialiser les filtres', exact: true }).click();
      assert.equal(await page.locator('article[id^="ia-"]').count(), corpus.events.length);
      await filters.locator(':scope > summary').click();
    });

    await check('wrapped-et-export', async () => {
      const wrappedTab = page.getByRole('tab', { name: /L'année en IA/ });
      await wrappedTab.click();
      const wrapped = page.getByRole('tabpanel', { name: /L'année en IA/ });
      await wrapped.locator('select').selectOption('2024');
      assert.ok(
        await wrapped.getByRole('heading', { name: "L'année en IA.", exact: true }).isVisible(),
      );
      await page.screenshot({ path: fileURLToPath(new URL(`wrapped-${width}.png`, output)) });
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Exporter les données', exact: true }).click();
      const download = await downloadPromise;
      assert.equal(download.suggestedFilename(), 'sandbox-wrapped-ia-2024.json');
      await wrappedTab.press('ArrowLeft');
      assert.equal(
        await page.getByRole('tab', { name: /^Chronologie/ }).getAttribute('aria-selected'),
        'true',
      );
    });

    await check('legendes-longues', async () => {
      const longest = [...corpus.events]
        .sort(
          (a, b) =>
            b.summary.length +
            b.shortTitle.length * 4 -
            (a.summary.length + a.shortTitle.length * 4),
        )
        .slice(0, 3);
      const dateCases = [
        corpus.events.find((event) => event.date.length === 10 && event.date.slice(5, 7) === '09'),
        corpus.events.find((event) => event.date.length === 7),
      ].filter(Boolean);
      const samples = [
        ...new Map([...longest, ...dateCases].map((event) => [event.id, event])).values(),
      ];
      for (const [index, event] of samples.entries()) {
        await page.goto(origin + '/time-machine#ia-' + event.id, { waitUntil: 'networkidle' });
        const card = inspector.locator(`[data-expanded-event="${event.id}"][data-active="true"]`);
        await card.waitFor();
        await card.scrollIntoViewIfNeeded();
        const bounds = await card.evaluate((element) => {
          const outer = element.getBoundingClientRect();
          const caption = element
            .querySelector('[class*="expandedCaption"]')
            .getBoundingClientRect();
          const title = element.querySelector('h3');
          const summary = element.querySelector('[class*="eventSummary"]');
          const date = element.querySelector('[data-history-date="prominent"]');
          const dateBounds = date.getBoundingClientRect();
          return {
            inside:
              caption.top >= outer.top &&
              caption.bottom <= outer.bottom + 1 &&
              caption.left >= outer.left &&
              caption.right <= outer.right + 1,
            titleOverflow: title.scrollWidth > title.clientWidth + 1,
            summaryOverflow: summary.scrollWidth > summary.clientWidth + 1,
            dateInside:
              dateBounds.left >= outer.left &&
              dateBounds.right <= outer.right + 1 &&
              dateBounds.top >= outer.top &&
              dateBounds.bottom < caption.top,
            yearSize: parseFloat(getComputedStyle(date.querySelector('strong')).fontSize),
          };
        });
        assert.equal(bounds.inside, true, event.id + ' : légende dans la carte');
        assert.equal(bounds.titleOverflow, false, event.id + ' : titre entier');
        assert.equal(bounds.summaryOverflow, false, event.id + ' : résumé entier');
        assert.equal(
          bounds.dateInside,
          true,
          event.id + ' : date visible sans chevaucher la légende',
        );
        assert.ok(bounds.yearSize >= 64, event.id + ' : année proéminente');
        assert.equal(
          await card.locator('[data-history-date="prominent"]').getAttribute('datetime'),
          event.date,
        );
        if (index === 0)
          await page.screenshot({
            path: fileURLToPath(new URL(`caption-longue-${width}.png`, output)),
          });
      }
      return { sampleIds: samples.map((event) => event.id) };
    });

    await check('dates-et-logos', async () => {
      const samples = ['chatgpt', 'transformer', 'gpt-6-1-sol', 'claude-sonnet-5-5', 'cuda-1'];
      for (const id of samples) {
        await page.goto(origin + '/time-machine#ia-' + id, { waitUntil: 'networkidle' });
        const card = inspector.locator(`[data-expanded-event="${id}"][data-active="true"]`);
        await card.waitFor();
        await card.scrollIntoViewIfNeeded();
        const image = card.locator('img[data-history-artwork-id]');
        await image.evaluate(async (element) => {
          await element.decode();
        });
        const svgUrl = new URL(await image.getAttribute('src'), origin);
        assert.equal(svgUrl.origin, origin);
        const response = await context.request.get(svgUrl.href);
        assert.equal(response.status(), 200);
        const svg = await response.text();
        const result = await image.evaluate((element, source) => {
          const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
          const logo = parsed.querySelector('svg svg[x][y][width][height]');
          if (!logo) return null;
          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const date = element
            .closest('[data-expanded-event]')
            .querySelector('[data-history-date="prominent"]')
            .getBoundingClientRect();
          let scaleX = bounds.width / element.naturalWidth;
          let scaleY = bounds.height / element.naturalHeight;
          if (style.objectFit === 'cover' || style.objectFit === 'contain') {
            const scale =
              style.objectFit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
            scaleX = scale;
            scaleY = scale;
          } else if (style.objectFit === 'none') {
            scaleX = 1;
            scaleY = 1;
          } else if (style.objectFit === 'scale-down') {
            const scale = Math.min(1, scaleX, scaleY);
            scaleX = scale;
            scaleY = scale;
          }
          const position = style.objectPosition.split(' ');
          const offset = (value, freeSpace) =>
            value.endsWith('%') ? (parseFloat(value) / 100) * freeSpace : parseFloat(value);
          const left =
            bounds.left +
            offset(position[0], bounds.width - element.naturalWidth * scaleX) +
            Number(logo.getAttribute('x')) * scaleX;
          const top =
            bounds.top +
            offset(position[1], bounds.height - element.naturalHeight * scaleY) +
            Number(logo.getAttribute('y')) * scaleY;
          const right = left + Number(logo.getAttribute('width')) * scaleX;
          const bottom = top + Number(logo.getAttribute('height')) * scaleY;
          return {
            overlaps:
              left < date.right && right > date.left && top < date.bottom && bottom > date.top,
            logoInside:
              left >= bounds.left &&
              right <= bounds.right + 1 &&
              top >= bounds.top &&
              bottom <= bounds.bottom + 1,
            dateInside:
              date.left >= bounds.left &&
              date.right <= bounds.right + 1 &&
              date.top >= bounds.top &&
              date.bottom <= bounds.bottom + 1,
          };
        }, svg);
        assert.ok(result, id + ' : logo présent dans l’affiche');
        assert.equal(result.overlaps, false, `${width} ${id} : la date ne masque pas le logo`);
        assert.equal(result.logoInside, true, `${width} ${id} : logo sans rognage`);
        assert.equal(result.dateInside, true, `${width} ${id} : date contenue dans la carte`);
        if (id === 'chatgpt')
          await page.screenshot({
            path: fileURLToPath(new URL(`time-machine-final-${width}.png`, output)),
          });
      }
      return { sampleIds: samples, overlap: false };
    });

    await check('mouvement-optionnel', async () => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const motion = page.getByRole('button', { name: 'Animations activées', exact: true });
      await motion.waitFor();
      assert.equal(await motion.isDisabled(), false);
      assert.equal(
        await page.getByRole('button', { name: 'Mettre la lecture en pause', exact: true }).count(),
        0,
      );
      const starfield = page.locator('canvas[data-temporal-starfield]');
      assert.equal(await starfield.getAttribute('aria-hidden'), 'true');
      await range.press('Home');
      await page.waitForFunction(() => document.getElementById('tm-timeline')?.value === '0');
      await page.waitForTimeout(1300);
      const still = await starfield.evaluate((canvas) => canvas.toDataURL());
      const beforeFrames = await page.evaluate(() => window.__sandboxStarfieldFrames);
      await range.press('ArrowRight');
      await page.waitForFunction(
        (before) => window.__sandboxStarfieldFrames > before + 2,
        beforeFrames,
      );
      for (let step = 0; step < 4; step += 1) await range.press('ArrowRight');
      assert.equal(Number(await range.inputValue()), 5, 'Déplacement continu de cinq événements');
      await page.waitForFunction((before) => {
        const canvas = document.querySelector('canvas[data-temporal-starfield]');
        return canvas?.toDataURL() !== before;
      }, still);
      await page.waitForTimeout(1300);
      const settled = await starfield.evaluate((canvas) => canvas.toDataURL());
      const settledFrames = await page.evaluate(() => window.__sandboxStarfieldFrames);
      await page.waitForTimeout(120);
      assert.equal(
        await starfield.evaluate((canvas) => canvas.toDataURL()),
        settled,
        'Étoiles immobiles au repos',
      );
      assert.equal(
        await page.evaluate(() => window.__sandboxStarfieldFrames),
        settledFrames,
        'Aucun dessin canvas au repos',
      );
      await page.getByRole('button', { name: "Rejouer l'histoire", exact: true }).click();
      await page.getByRole('button', { name: 'Mettre la lecture en pause', exact: true }).waitFor();
      await motion.click();
      await page.locator('[data-motion="off"]').waitFor();
      assert.equal(await page.locator('[data-motion]').getAttribute('data-motion'), 'off');
      assert.equal(
        await page.getByRole('button', { name: "Rejouer l'histoire", exact: true }).isDisabled(),
        true,
      );
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const reduced = page.getByRole('button', { name: 'Animations réduites', exact: true });
      await page.waitForFunction(() =>
        [...document.querySelectorAll('button')].some(
          (button) => button.textContent.includes('Animations réduites') && button.disabled,
        ),
      );
      assert.equal(await reduced.isDisabled(), true);
      assert.equal(await page.locator('[data-motion]').getAttribute('data-motion'), 'off');
      return { framesWhileTravelling: settledFrames - beforeFrames, framesWhileIdle: 0 };
    });
    if (width === 1440) {
      await check('sources-sans-javascript', async () => {
        const noScript = await browser.newContext({
          javaScriptEnabled: false,
          viewport: { width: 1440, height: 950 },
        });
        try {
          const plain = await noScript.newPage();
          assert.equal((await plain.goto(origin + '/time-machine')).status(), 200);
          assert.equal(await plain.locator('article[id^="ia-"]').count(), corpus.events.length);
          const yearGroup = plain
            .locator('details')
            .filter({ has: plain.locator('#ia-chatgpt') })
            .first();
          if (await yearGroup.count()) await yearGroup.locator(':scope > summary').click();
          const sourceDetails = plain.locator('#ia-chatgpt details');
          await sourceDetails.locator('summary').click();
          assert.equal(await sourceDetails.getAttribute('open'), '');
          assert.ok(
            await sourceDetails.locator('a[href="https://openai.com/index/chatgpt/"]').isVisible(),
          );
        } finally {
          await noScript.close();
        }
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], failures.join('\n'));
log(`${results.length} contrôles Time Machine validés.`);
