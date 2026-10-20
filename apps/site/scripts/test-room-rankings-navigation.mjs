import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const output = 'apps/site/.local/rankings-navigation-performance';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
const errors = [];
const destinations = [
  ['GitHub', '/charts/github', 'Classement de projets open source sur GitHub'],
  ['Skills', '/charts/skills', 'Classement des skills, agents et MCP'],
  ['Models', '/charts/ai-models', "Classement de modèles d'IA"],
  ['Rising', '/charts/rising', 'Projets GitHub en progression'],
];

try {
  for (const [label, path, heading] of destinations) {
    const page = await browser.newPage({ locale: 'fr-FR', reducedMotion: 'reduce' });
    const warmed = new Set();
    const opened = performance.now();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.request().method() === 'HEAD' && response.ok())
        warmed.add(new URL(response.url()).pathname);
    });
    await page.goto('http://127.0.0.1:3100/#room-rankings', {
      waitUntil: 'domcontentloaded',
    });
    const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
    if (await refuse.isVisible()) await refuse.click();
    const link = page.locator('[data-room-content="rankings"]').getByRole('link', {
      name: new RegExp(`^${label} `),
    });
    await link.waitFor();
    const deadline = performance.now() + 60000;
    while (!destinations.every(([, href]) => warmed.has(href)) && performance.now() < deadline)
      await page.waitForTimeout(50);
    assert.equal(warmed.size, 4, 'Les quatre routes sont préparées avant tout clic.');
    const preparedAfterMs = Math.round(performance.now() - opened);
    const clicked = performance.now();
    await link.click();
    await page.getByRole('heading', { level: 1, name: heading, exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, path);
    const clickToHeadingMs = Math.round(performance.now() - clicked);
    results.push({ label, path, preparedAfterMs, clickToHeadingMs });
    await page.close();
  }

  // Une réponse volontairement retenue vérifie le retour immédiat au clic,
  // indépendamment de la vitesse du serveur ou du réseau.
  const page = await browser.newPage({ locale: 'fr-FR', reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:3100/#room-rankings');
  const refuse = page.getByRole('button', { name: 'Refuser', exact: true });
  if (await refuse.isVisible()) await refuse.click();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/charts/github?*', async (route) => {
    if (route.request().headers()['rsc'] === '1') await gate;
    await route.continue();
  });
  const clicked = performance.now();
  await page.locator('[data-room-content="rankings"] a[href="/charts/github"]').click();
  await page.getByRole('status').filter({ hasText: 'Ouverture du classement…' }).waitFor();
  const feedbackMs = Math.round(performance.now() - clicked);
  await page.screenshot({ path: `${output}/pending.png` });
  release();
  await page.getByRole('heading', { level: 1, name: destinations[0][2], exact: true }).waitFor();
  await page.close();
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ results, feedbackMs, errors }, null, 2),
  );
  process.stdout.write(JSON.stringify({ results, feedbackMs, errors }, null, 2));
} finally {
  await browser.close();
}
