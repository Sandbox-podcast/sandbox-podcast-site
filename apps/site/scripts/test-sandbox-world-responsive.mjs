/* global document, window, getComputedStyle */
import process from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:3100';
const output = new URL('../.local/sandbox-world-responsive/', import.meta.url);
const rooms = ['studio', 'projects', 'rankings', 'history', 'cinema', 'news'];
const includeMobile = process.argv.includes('--include-mobile');
const sizes = [
  ...(includeMobile
    ? [
        [320, 568],
        [360, 640],
        [375, 667],
        [390, 844],
        [430, 932],
        [600, 960],
        [768, 1024],
        [820, 1180],
        [844, 390],
        [900, 700],
        [932, 430],
      ]
    : []),
  [901, 700],
  [1024, 768],
  [1024, 1366],
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
  [2560, 1080],
  [3440, 1440],
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const errors = [];

async function prepare(context, room, existingPage) {
  const page = existingPage ?? (await context.newPage());
  if (!existingPage)
    page.on('pageerror', (error) => errors.push({ url: page.url(), message: error.message }));
  await page.goto(`${origin}/#room-${room}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await page.waitForSelector(`[data-sandbox-room="${room}"]`, { timeout: 15000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      url: window.location.href,
      actualRoom: document.querySelector('[data-sandbox-room]')?.dataset.sandboxRoom,
      title: document.title,
      text: document.body.textContent.slice(0, 500),
    }));
    errors.push({ room, kind: 'direct-hash-timeout', ...diagnostics });
    await page.screenshot({
      path: fileURLToPath(new URL(`failure-${page.viewportSize().width}-${room}.png`, output)),
    });
    await page.close();
    throw error;
  }
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-sandbox-room]');
    const content = root?.querySelector('[data-room-content]');
    const scene = root?.querySelector('canvas')?.parentElement;
    if (!content || !scene) return false;
    return (
      Math.abs(
        parseFloat(getComputedStyle(content).getPropertyValue('--room-view-width')) -
          scene.getBoundingClientRect().width,
      ) < 1
    );
  });
  const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
  if (await refuse.isVisible()) await refuse.click();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page
    .locator('[data-sandbox-room] > div > img')
    .first()
    .evaluate((image) => image.decode());
  return page;
}

async function inspect(page, name, room) {
  const geometry = await page.locator('[data-sandbox-room]').evaluate((root) => {
    const scene = root.querySelector('canvas').parentElement;
    const content = root.querySelector('[data-room-content]');
    const caption = content.querySelector('[class*="caption"], [data-studio-inscription]');
    const sceneRect = scene.getBoundingClientRect();
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        right: box.right,
        bottom: box.bottom,
      };
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const closedDetails = element.closest('details:not([open])');
      if (closedDetails && !closedDetails.querySelector('summary')?.contains(element)) return false;
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        element.getClientRects().length > 0
      );
    };
    const controls = [...root.querySelectorAll('a, button, select, summary')].filter(visible);
    const clipped = controls.flatMap((element) => {
      const box = element.getBoundingClientRect();
      let parent = element.parentElement;
      while (parent && parent !== root) {
        const style = getComputedStyle(parent);
        const bounds = parent.getBoundingClientRect();
        // Un rail avec défilement permet d'atteindre ses enfants hors cadre.
        if (['auto', 'scroll'].includes(style.overflowX)) return [];
        if (
          ['hidden', 'clip'].includes(style.overflowX) &&
          (box.left < bounds.left - 2 || box.right > bounds.right + 2)
        )
          return [
            {
              text: element.textContent.trim(),
              kind: 'horizontal-clipping',
              rect: rect(element),
              parent: rect(parent),
            },
          ];
        if (
          ['hidden', 'clip'].includes(style.overflowY) &&
          (box.top < bounds.top - 2 || box.bottom > bounds.bottom + 2)
        )
          return [
            {
              text: element.textContent.trim(),
              kind: 'vertical-clipping',
              rect: rect(element),
              parent: rect(parent),
            },
          ];
        parent = parent.parentElement;
      }
      return [];
    });
    const objects = [...content.querySelectorAll('a, button')].filter(
      (element) => !caption.contains(element) && visible(element),
    );
    // Les éléments hors d'un panneau défilant ne sont pas peints par-dessus la légende.
    const paintedRect = (element) => {
      const bounds = element.getBoundingClientRect();
      const box = {
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        bottom: bounds.bottom,
      };
      let parent = element.parentElement;
      while (parent && parent !== root) {
        const style = getComputedStyle(parent);
        const frame = parent.getBoundingClientRect();
        if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)) {
          box.left = Math.max(box.left, frame.left);
          box.right = Math.min(box.right, frame.right);
        }
        if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowY)) {
          box.top = Math.max(box.top, frame.top);
          box.bottom = Math.min(box.bottom, frame.bottom);
        }
        parent = parent.parentElement;
      }
      return box;
    };
    // Tester les lignes peintes et les actions, pas le vide entre les colonnes de légende.
    const captionRects = [...caption.querySelectorAll('a, button')].map((element) =>
      element.getBoundingClientRect(),
    );
    const walker = document.createTreeWalker(caption, 4);
    let textNode = walker.nextNode();
    while (textNode) {
      if (textNode.textContent.trim()) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        captionRects.push(...range.getClientRects());
      }
      textNode = walker.nextNode();
    }
    const overlap = objects.flatMap((element) => {
      const box = paintedRect(element);
      return captionRects.flatMap((captionRect) => {
        const width = Math.min(box.right, captionRect.right) - Math.max(box.left, captionRect.left);
        const height =
          Math.min(box.bottom, captionRect.bottom) - Math.max(box.top, captionRect.top);
        return width > 2 && height > 2
          ? [{ text: element.textContent.trim(), width, height, rect: rect(element) }]
          : [];
      });
    });
    const objectOverlap = objects.flatMap((element, index) => {
      const box = paintedRect(element);
      return objects.slice(index + 1).flatMap((other) => {
        const next = paintedRect(other);
        const width = Math.min(box.right, next.right) - Math.max(box.left, next.left);
        const height = Math.min(box.bottom, next.bottom) - Math.max(box.top, next.top);
        return width > 2 && height > 2
          ? [{ first: element.textContent.trim(), second: other.textContent.trim(), width, height }]
          : [];
      });
    });
    return {
      ready: root.dataset.worldReady,
      room: root.dataset.sandboxRoom,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
      scene: { width: sceneRect.width, height: sceneRect.height },
      caption: rect(caption),
      clipped,
      overlap,
      objectOverlap,
      smallTargets: controls
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width < 43.5 || box.height < 43.5;
        })
        .map((element) => ({ text: element.textContent.trim(), rect: rect(element) })),
      roomOptions: [...root.querySelectorAll('select[aria-label="Les pièces"] option')].map(
        (option) => ({
          room: option.value,
          label: option.textContent.trim(),
        }),
      ),
      contextualControlsInitiallyHidden: root.querySelector('[data-world-controls]').hidden,
      explorerInitiallyClosed: !root.querySelector('[data-world-explorer]').open,
      visibleSceneControls: [...scene.querySelectorAll('a, button, select')]
        .filter((element) => !element.hasAttribute('data-world-surface') && visible(element))
        .map((element) => element.textContent.trim()),
      footerTop: scene.nextElementSibling.getBoundingClientRect().top,
      sceneBottom: sceneRect.bottom,
      canvasHidden: root.querySelector('canvas').getAttribute('aria-hidden'),
    };
  });
  await page
    .locator('[data-sandbox-room]')
    .screenshot({ path: fileURLToPath(new URL(`${name}-${room}.png`, output)) });
  const control = page.getByRole('combobox', { name: 'Les pièces', exact: true });
  const summary = page.locator('[data-world-explorer] summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await control.waitFor({ state: 'visible' });
  await control.focus();
  const focus = await control.evaluate((element) => ({
    active: document.activeElement === element,
    outlineStyle: getComputedStyle(element).outlineStyle,
    outlineWidth: getComputedStyle(element).outlineWidth,
  }));
  await page.keyboard.press('Escape');
  const explorer = {
    closedAfterEscape: (await page.locator('[data-world-explorer]').getAttribute('open')) === null,
    focusReturned: await summary.evaluate((element) => document.activeElement === element),
    selectHiddenAfterEscape: !(await control.isVisible()),
  };
  results.push({ name, ...geometry, focus, explorer });
}

try {
  for (const [width, height] of sizes) {
    const context = await browser.newContext({
      locale: 'fr-FR',
      viewport: { width, height },
      reducedMotion: 'reduce',
    });
    let page;
    for (const room of rooms) {
      try {
        page = await prepare(context, room, page?.isClosed() ? undefined : page);
        await inspect(page, `${width}x${height}`, room);
      } catch (error) {
        errors.push({ room, viewport: `${width}x${height}`, message: error.message });
      }
      await writeFile(new URL('report.json', output), JSON.stringify({ results, errors }, null, 2));
    }
    await context.close();
    process.stdout.write(`Contrôle ${width} × ${height} terminé.\n`);
  }

  const enlarged = await browser.newContext({
    locale: 'fr-FR',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  for (const room of rooms) {
    const page = await prepare(enlarged, room);
    // Agrandissement des caractères seulement : mesure calculée doublée, sans élargir les boîtes.
    await page.evaluate(() => {
      const root = document.querySelector('[data-sandbox-room]');
      const sizes = [...root.querySelectorAll('*')].map((element) => [
        element,
        parseFloat(getComputedStyle(element).fontSize),
      ]);
      for (const [element, size] of sizes) element.style.fontSize = `${size * 2}px`;
    });
    await inspect(page, '1440x900-text200', room);
    await page.close();
  }
  await enlarged.close();

  if (includeMobile) {
    const touchContext = await browser.newContext({
      locale: 'fr-FR',
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'no-preference',
    });
    const touch = await prepare(touchContext, 'studio');
    await touch.locator('[data-world-explorer] summary').tap();
    await touch.getByRole('combobox', { name: 'Les pièces', exact: true }).selectOption('cinema');
    await touch.waitForSelector('[data-sandbox-room="cinema"]');
    results.push({
      name: 'touch-fallback-390x844',
      room: await touch.locator('[data-sandbox-room]').getAttribute('data-sandbox-room'),
      ready: await touch.locator('[data-sandbox-room]').getAttribute('data-world-ready'),
      hash: new URL(touch.url()).hash,
    });
    await touchContext.close();
  }

  const noJsContext = await browser.newContext({
    locale: 'fr-FR',
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: false,
  });
  const noJs = await noJsContext.newPage();
  await noJs.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
  results.push({
    name: 'no-js-1440x900',
    links: await noJs.locator('noscript nav a').evaluateAll((links) =>
      links.map((link) => ({
        label: link.textContent.trim(),
        href: link.getAttribute('href'),
      })),
    ),
    canvasHidden: await noJs.locator('canvas').getAttribute('aria-hidden'),
  });
  await noJsContext.close();
} finally {
  await browser.close();
  await writeFile(new URL('report.json', output), JSON.stringify({ results, errors }, null, 2));
}
const problems = results.filter(
  (result) =>
    result.horizontalOverflow > 1 ||
    result.clipped?.length ||
    result.overlap?.length ||
    result.objectOverlap?.length ||
    result.smallTargets?.length ||
    result.focus?.active === false ||
    result.focus?.outlineStyle === 'none' ||
    (result.roomOptions && result.roomOptions.length !== 6) ||
    (result.links && result.links.length !== 6) ||
    result.contextualControlsInitiallyHidden === false ||
    result.explorerInitiallyClosed === false ||
    result.explorer?.closedAfterEscape === false ||
    result.explorer?.focusReturned === false ||
    result.explorer?.selectHiddenAfterEscape === false ||
    (result.room === 'studio' && result.visibleSceneControls?.length) ||
    (result.footerTop !== undefined && result.footerTop < result.sceneBottom - 1) ||
    (result.canvasHidden !== undefined && result.canvasHidden !== 'true'),
);
process.stdout.write(
  JSON.stringify(
    {
      checks: results.length,
      errors,
      problems: problems.map(
        ({
          name,
          room,
          horizontalOverflow,
          clipped,
          overlap,
          objectOverlap,
          smallTargets,
          focus,
        }) => ({
          name,
          room,
          horizontalOverflow,
          clipped,
          overlap,
          objectOverlap,
          smallTargets,
          focus,
        }),
      ),
    },
    null,
    2,
  ),
);
if (errors.length || problems.length) process.exitCode = 1;
