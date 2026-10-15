/* global document, window */
// Test navigateur sur fixtures éphémères ; aucun accès à la base distante.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';
import { startBadgeFixture } from './badges-fixture-server.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.SANDBOX_PLAYWRIGHT_PATH ?? 'playwright');
const { pg, origin, award, seedExtensions, artifactDir, close } = await startBadgeFixture();
await writeFile(
  new URL('report.json', artifactDir),
  JSON.stringify({ status: 'running', fixture: true }),
);
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.SANDBOX_BROWSER_CHANNEL
      ? { channel: process.env.SANDBOX_BROWSER_CHANNEL }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Aucun appel analytics ou vidéo vers un service tiers pendant le test.
  await context.route(/https:\/\//, (route) => route.abort());
  await page.goto(`${origin}/charts/github`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Refuser', exact: true }).click();
  await page.locator('details.sc-row').first().locator('summary').first().click();
  const badgeLink = page.getByRole('link', { name: 'Obtenir mon badge' }).first();
  await badgeLink.click();
  await page.waitForURL('**/charts/project/**#badges');
  const projectPath = new URL(page.url()).pathname;
  const generator = page.locator('#badges details').first();
  await generator.locator('summary').click();
  await generator.locator('[aria-busy="false"]').waitFor();
  await page.getByRole('button', { name: 'Copier le Markdown', exact: true }).first().click();
  await page.getByRole('status').filter({ hasText: 'Code Markdown copié.' }).waitFor();
  const markdown = await page.evaluate(() => window.navigator.clipboard.readText());
  const parts = /^\[!\[[\s\S]+\]\(([^)]+)\)\]\(([^)]+)\)$/.exec(markdown);
  assert.ok(parts);
  assert.equal(new URL(parts[1]).origin, origin);
  assert.equal(new URL(parts[2]).pathname, projectPath);
  const svg = await context.request.get(parts[1]);
  assert.equal(svg.status(), 200);
  assert.match(await svg.text(), /TOP 100/);
  const head = await context.request.head(parts[1]);
  assert.equal(head.status(), 200);
  await page.screenshot({
    path: fileURLToPath(new URL('project-desktop.png', artifactDir)),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Clair', exact: true }).first().click();
  await generator.screenshot({ path: fileURLToPath(new URL('badge-light.png', artifactDir)) });
  await page.getByRole('button', { name: 'HTML', exact: true }).first().click();
  await page.getByRole('button', { name: 'Copier le HTML', exact: true }).first().click();
  assert.match(
    await page.evaluate(() => window.navigator.clipboard.readText()),
    /^<a href=.*<img src=/,
  );
  await page.getByRole('button', { name: 'URL SVG', exact: true }).first().click();
  await page.getByRole('button', { name: "Copier l'URL", exact: true }).first().click();
  assert.equal(await page.evaluate(() => window.navigator.clipboard.readText()), parts[1]);
  const rankDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Télécharger le SVG', exact: true }).first().click();
  await (await rankDownload).saveAs(fileURLToPath(new URL('downloaded-rank.svg', artifactDir)));
  const awardGenerator = page.locator('#badges details').nth(1);
  await awardGenerator.locator('summary').first().click();
  await awardGenerator.getByText('Partager la récompense', { exact: true }).click();
  await page.getByRole('button', { name: 'Copier un texte de partage', exact: true }).click();
  assert.match(
    await page.evaluate(() => window.navigator.clipboard.readText()),
    /Sandbox Rising Star/,
  );
  const awardUrl = `${origin}/charts/awards/${award.week}`;
  await page.getByRole('button', { name: 'Copier le lien de la récompense', exact: true }).click();
  assert.equal(await page.evaluate(() => window.navigator.clipboard.readText()), awardUrl);
  await page.evaluate(() =>
    Object.defineProperty(window.navigator.clipboard, 'writeText', {
      configurable: true,
      value: () => Promise.reject(new Error('Presse-papiers bloqué pour le test')),
    }),
  );
  await page.getByRole('button', { name: 'Copier un texte de partage', exact: true }).click();
  assert.ok(
    await page
      .getByLabel('Texte de partage', { exact: true })
      .evaluate(
        (element) =>
          document.activeElement === element &&
          element.selectionStart === 0 &&
          element.selectionEnd === element.value.length,
      ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: fileURLToPath(new URL('project-mobile.png', artifactDir)),
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    'Aucun débordement horizontal mobile',
  );
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({
    path: fileURLToPath(new URL('project-tablet.png', artifactDir)),
    fullPage: true,
  });
  await page.goto(parts[2], { waitUntil: 'networkidle' });
  assert.match(await page.locator('h1').innerText(), /fixture-project/);
  await page.goto(`${origin}/charts/awards`, { waitUntil: 'networkidle' });
  const ctaColors = await page
    .getByRole('link', { name: 'Trouver mon projet', exact: true })
    .evaluate((element) => ({
      text: window.getComputedStyle(element).color,
      background: window.getComputedStyle(element).backgroundColor,
    }));
  assert.notEqual(
    ctaColors.text,
    ctaColors.background,
    'Le texte du bouton principal doit rester lisible',
  );
  assert.equal(await page.locator('#award-history').count(), 1);
  assert.equal((await page.getByText(award.week, { exact: true }).count()) > 0, true);
  await page.screenshot({
    path: fileURLToPath(new URL('awards-tablet.png', artifactDir)),
    fullPage: true,
  });
  await page.locator('section[aria-labelledby="award-history"] h3 a').first().click();
  await page.waitForURL(`**/charts/awards/${award.week}`);
  assert.equal(await page.locator('h1').innerText(), award.name);
  assert.equal(
    await page.locator('meta[property="og:image"]').getAttribute('content'),
    `${origin}/api/awards/${award.week}/image`,
  );
  const social = await context.request.get(`${origin}/api/awards/${award.week}/image`);
  assert.equal(social.status(), 200);
  const socialPng = await social.body();
  assert.equal(socialPng.subarray(1, 4).toString(), 'PNG');
  assert.equal(socialPng.readUInt32BE(16), 1200);
  assert.equal(socialPng.readUInt32BE(20), 630);
  await writeFile(new URL('award-social.png', artifactDir), socialPng);
  await page.screenshot({
    path: fileURLToPath(new URL('award-detail-tablet.png', artifactDir)),
    fullPage: true,
  });
  assert.equal((await context.request.get(`${origin}/charts/awards/2000-W01`)).status(), 404);
  for (const [locale, title] of [
    ['en', 'Source and assignment'],
    ['es-es', 'Fuente y concesión'],
    ['de-de', 'Quelle und Vergabe'],
  ]) {
    await page.goto(`${origin}/${locale}/charts/awards/${award.week}`, {
      waitUntil: 'networkidle',
    });
    assert.equal(await page.getByRole('heading', { name: title, exact: true }).count(), 1);
    assert.equal(
      await page.locator('meta[property="og:image"]').getAttribute('content'),
      `${origin}/api/awards/${award.week}/image`,
    );
  }
  await page.goto(`${origin}/charts/awards?before=${award.id}`, { waitUntil: 'networkidle' });
  await page.getByText('Aucune récompense pour cette période.', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'Éditions récentes', exact: true }).click();
  const awardSvg = await context.request.get(
    `${origin}/badges/github/${award.githubId}/rising-star/${award.week}.svg`,
  );
  assert.equal(awardSvg.status(), 200);
  assert.match(await awardSvg.text(), /RISING STAR/);
  assert.equal(
    (
      await context.request.get(`${origin}/badges/github/9999999/rising-star/${award.week}.svg`)
    ).status(),
    404,
  );
  await page.goto(`${origin}${projectPath}`, { waitUntil: 'networkidle' });
  await page.locator('#badges details').first().locator('summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#badges details').first().getAttribute('open'), '');
  // URL unique : le cache d'image du navigateur ne doit pas contourner l'incident injecté.
  await page.route('**/badges/github/*/rank.svg?failure-test', (route) => route.abort());
  await page
    .locator('#badges details')
    .first()
    .locator('img')
    .evaluate((image) => {
      image.src += '?failure-test';
    });
  await page.getByRole('button', { name: "Réessayer l'aperçu", exact: true }).click();
  await page.waitForFunction(() => {
    const image = document.querySelector('#badges details img');
    return image?.complete && image.naturalWidth > 0;
  });
  await page.unroute('**/badges/github/*/rank.svg?failure-test');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  await page.screenshot({
    path: fileURLToPath(new URL('project-text-200.png', artifactDir)),
    fullPage: true,
  });
  const zoomOffenders = await page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 12)
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        text: element.textContent.slice(0, 80),
      })),
  );
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    `Aucun débordement à texte 200 % : ${JSON.stringify(zoomOffenders)}`,
  );
  const { withdrawBadgeAward } = await import('../src/lib/badges-store.ts');
  await withdrawBadgeAward(award.week, 'Retrait de démonstration pour le test.', 'test-e2e');
  await page.goto(awardUrl, { waitUntil: 'networkidle' });
  await page.getByText('Attribution retirée.', { exact: true }).waitFor();
  assert.equal(await page.locator('[data-award] details').count(), 0);
  assert.equal(
    (await context.request.head(`${origin}/api/awards/${award.week}/image`)).status(),
    410,
  );
  await page.screenshot({
    path: fileURLToPath(new URL('award-withdrawn.png', artifactDir)),
    fullPage: true,
  });
  // Les six extensions disposent de sources annuelles explicites, toutes marquées FIXTURE.
  const extended = await seedExtensions();
  assert.equal(extended.length, 10);
  const extendedChecks = [];
  const verifiedSourcePages = new Set();
  for (const type of [
    'github-category',
    'biggest-mover',
    'rookie-month',
    'skill-week',
    'best-model',
    'annual',
  ]) {
    const entry = extended.find((candidate) => candidate.type === type);
    assert.ok(entry);
    const detailPath = `/charts/awards/edition/${entry.id}`;
    const detail = await page.goto(`${origin}${detailPath}`, { waitUntil: 'networkidle' });
    assert.equal(detail.status(), 200);
    assert.equal(await page.locator('h1').innerText(), entry.name);
    const sourceHref = await page
      .getByRole('link', { name: /Consulter l'édition source/ })
      .getAttribute('href');
    assert.ok(sourceHref);
    if (!verifiedSourcePages.has(sourceHref)) {
      assert.equal((await context.request.get(new URL(sourceHref, origin).href)).status(), 200);
      verifiedSourcePages.add(sourceHref);
    }
    assert.equal(
      await page.locator('meta[property="og:image"]').getAttribute('content'),
      `${origin}/api/awards/edition/${entry.id}/image`,
    );
    const embed = page.locator('[data-award] details').first();
    await embed.locator('summary').first().click();
    await embed.locator('[aria-busy="false"]').waitFor();
    await embed.getByRole('button', { name: 'Copier le Markdown', exact: true }).click();
    await embed.getByText('Code Markdown copié.', { exact: true }).waitFor();
    const copied = await page.evaluate(() => window.navigator.clipboard.readText());
    const links = /^\[!\[[\s\S]+\]\(([^)]+)\)\]\(([^)]+)\)$/.exec(copied);
    assert.ok(links);
    assert.equal(new URL(links[1]).pathname, `/badges/awards/${entry.id}.svg`);
    const badge = await context.request.get(links[1]);
    assert.equal(badge.status(), 200);
    assert.match(await badge.text(), new RegExp(entry.period));
    const pngResponse = await context.request.get(`${origin}/api/awards/edition/${entry.id}/image`);
    assert.equal(pngResponse.status(), 200);
    const png = await pngResponse.body();
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    await writeFile(new URL(`${type}-social.png`, artifactDir), png);
    const backlink = await page.goto(links[2], { waitUntil: 'networkidle' });
    assert.equal(backlink.status(), 200);
    assert.equal(await page.locator(`#award-${entry.id} > details`).count(), 1);
    await page.locator(`#award-${entry.id} details summary`).first().click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${type} sans débordement mobile`,
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`${type}-mobile.png`, artifactDir)),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1100 });
    const filtered = await page.goto(`${origin}/charts/awards?type=${type}`, {
      waitUntil: 'networkidle',
    });
    assert.equal(filtered.status(), 200);
    assert.equal(
      await page.locator('section[aria-labelledby="award-history"] [data-award]').count(),
      extended.filter((candidate) => candidate.type === type).length,
    );
    extendedChecks.push(`extension-${type}-svg-png-embed-backlink-filter-mobile`);
  }
  for (const chart of ['skills', 'ai-models']) {
    await page.goto(`${origin}/charts/${chart}`, { waitUntil: 'networkidle' });
    await page.locator('details.sc-row').first().locator('summary').first().click();
    await page.getByRole('link', { name: 'Obtenir mon badge', exact: true }).first().click();
    await page.waitForURL('**/charts/entity/**#badges');
    await page.locator('#badges [data-award]').first().waitFor();
    assert.ok((await page.locator('#badges [data-award]').count()) > 0);
  }
  await page.goto(`${origin}/en/charts/awards?type=best-model`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Award winners', exact: true }).waitFor();
  await page.getByLabel('Award', { exact: true }).selectOption('skill-week');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.waitForURL('**/en/charts/awards?**');
  assert.equal(new URL(page.url()).searchParams.get('type'), 'skill-week');
  for (const locale of ['en', 'es-es', 'de-de']) {
    const entry = extended.find((candidate) => candidate.type === 'best-model');
    const response = await page.goto(`${origin}/${locale}/charts/awards/edition/${entry.id}`, {
      waitUntil: 'networkidle',
    });
    assert.equal(response.status(), 200);
    assert.equal(
      await page.locator('meta[property="og:image"]').getAttribute('content'),
      `${origin}/api/awards/edition/${entry.id}/image`,
    );
  }
  assert.equal(
    (
      await context.request.get(
        `${origin}/charts/awards/edition/11111111-1111-4111-8111-111111111111`,
      )
    ).status(),
    404,
  );
  const { assignClosedAwards, withdrawPublicAward } = await import('../src/lib/awards-store.ts');
  for (let week = 1; week <= 20; week++) {
    const result = await assignClosedAwards({
      type: 'skill-week',
      period: `2025-W${String(week).padStart(2, '0')}`,
    });
    assert.equal(result.created, 1);
  }
  await page.goto(`${origin}/charts/awards?type=skill-week&chart=skills`, {
    waitUntil: 'networkidle',
  });
  const history = page.locator('section[aria-labelledby="award-history"]');
  const firstIds = await history
    .locator('[data-award]')
    .evaluateAll((cards) => cards.map((card) => card.id));
  assert.equal(firstIds.length, 20);
  await page.getByRole('link', { name: 'Éditions précédentes', exact: true }).click();
  const cursorId = firstIds.at(-1).replace('award-', '');
  await page.waitForURL((url) => url.searchParams.get('before') === cursorId);
  const lastSkillAward = extended.find((entry) => entry.type === 'skill-week');
  assert.ok(lastSkillAward);
  await history.locator(`#award-${lastSkillAward.id}`).waitFor();
  await page.waitForLoadState('networkidle');
  assert.equal(new URL(page.url()).searchParams.get('chart'), 'skills');
  assert.equal(new URL(page.url()).searchParams.get('type'), 'skill-week');
  const secondIds = await history
    .locator('[data-award]')
    .evaluateAll((cards) => cards.map((card) => card.id));
  assert.equal(secondIds.length, 1);
  assert.ok(secondIds.every((id) => !firstIds.includes(id)));
  const modelAward = extended.find((entry) => entry.type === 'best-model');
  await withdrawPublicAward(
    modelAward.id,
    'Retrait de la récompense modèle pour le test.',
    'test-e2e',
  );
  await page.goto(`${origin}/charts/awards/edition/${modelAward.id}`, { waitUntil: 'networkidle' });
  await page.getByText('Attribution retirée.', { exact: false }).waitFor();
  assert.equal(await page.locator('[data-award] details').count(), 0);
  assert.equal(
    (await context.request.get(`${origin}/badges/awards/${modelAward.id}.svg`)).status(),
    410,
  );
  assert.equal(
    (await context.request.head(`${origin}/api/awards/edition/${modelAward.id}/image`)).status(),
    410,
  );
  // États sans lauréat et en erreur, uniquement dans la base éphémère de ce test.
  await pg.exec('TRUNCATE badge_award_withdrawals, badge_awards');
  await page.goto(`${origin}/charts/awards`, { waitUntil: 'networkidle' });
  await page.getByText(/Aucune récompense n'a encore été attribuée/).waitFor();
  await page.screenshot({
    path: fileURLToPath(new URL('awards-empty.png', artifactDir)),
    fullPage: true,
  });
  await pg.exec('ALTER TABLE badge_awards RENAME TO badge_awards_temporarily_offline');
  await page.reload({ waitUntil: 'networkidle' });
  await page
    .getByText("L'historique des Awards est temporairement indisponible.", { exact: true })
    .waitFor();
  await page.screenshot({
    path: fileURLToPath(new URL('awards-unavailable.png', artifactDir)),
    fullPage: true,
  });
  await pg.exec('ALTER TABLE badge_awards_temporarily_offline RENAME TO badge_awards');
  assert.deepEqual(errors, []);
  await writeFile(
    new URL('report.json', artifactDir),
    JSON.stringify(
      {
        status: 'passed',
        origin,
        fixture: true,
        checks: [
          'chart-to-project',
          'generator',
          'clipboard-markdown',
          'clipboard-html',
          'clipboard-url',
          'sharing-text',
          'sharing-link',
          'clipboard-blocked-fallback',
          'svg-download',
          'award-detail',
          'award-social-image',
          'award-locales',
          'award-unassigned-404',
          'awards-cursor',
          'preview-retry',
          'award-withdrawn',
          'svg-http',
          'head',
          'badge-click',
          'awards-history',
          'forged-award-404',
          'mobile',
          'tablet',
          'light-preview',
          'keyboard',
          'text-200-percent',
          'long-repository-name',
          'empty-awards',
          'unavailable-awards',
          ...extendedChecks,
          'extension-locales',
          'extension-localized-filter-form',
          'extension-unassigned-404',
          'extension-withdrawn',
          'extension-source-editions',
          'extension-chart-entry-points',
          'extension-filtered-pagination',
          'preview-loading-resolves',
        ],
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
  log(`Badges E2E passed. Evidence: ${fileURLToPath(artifactDir)}`);
} catch (error) {
  process.exitCode = 1;
  const failedPage = browser
    ?.contexts()
    .flatMap((context) => context.pages())
    .at(-1);
  if (failedPage) {
    await writeFile(new URL('failure.html', artifactDir), await failedPage.content());
    await failedPage.screenshot({
      path: fileURLToPath(new URL('failure.png', artifactDir)),
      fullPage: true,
    });
  }
  await writeFile(
    new URL('report.json', artifactDir),
    JSON.stringify(
      { status: 'failed', fixture: true, error: error.message, stack: error.stack },
      null,
      2,
    ),
  );
  log('Badges E2E failed:', error.message);
} finally {
  await browser?.close();
  await close();
}
// Next dev conserve des observateurs de fichiers après close() sur Windows.
process.exit(process.exitCode ?? 0);
