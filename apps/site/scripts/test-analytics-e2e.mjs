/* global window, document, MouseEvent */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { log } from 'node:console';
import { chromium } from 'playwright';
import { startBadgeFixture } from './badges-fixture-server.mjs';

const mode = process.argv[2];
if (!['--ready', '--blocked'].includes(mode)) {
  for (const flag of ['--blocked', '--ready']) {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), flag], {
      stdio: 'inherit',
      env: { ...process.env, NEXT_PUBLIC_GA4_READY: String(flag === '--ready') },
    });
    const [code] = await once(child, 'exit');
    if (code !== 0) process.exit(code ?? 1);
  }
  process.exit(0);
}

// Les services tiers sont remplacés par des doubles locaux. Aucun événement réel n'est envoyé.
const googleStub = `(() => {
  const pending = window.dataLayer || [];
  window.__qaGoogleEvents = [];
  window.gtag = (...args) => {
    if (args[0] !== 'event' || window['ga-disable-G-45XWR4KJ1M'] !== false) return;
    window.__qaGoogleEvents.push({ name: args[1], parameters: args[2] });
    fetch('https://www.google-analytics.com/g/collect', {method:'POST',body:JSON.stringify(args)});
  };
  pending.forEach((args) => window.gtag(...Array.from(args)));
  document.cookie = '_ga=fixture; path=/';
})();`;
const vercelStub = `(() => {
  let beforeSend = () => null;
  const pending = window.vaq || [];
  window.va = (command, data) => {
    if (command === 'beforeSend') { beforeSend = data; return; }
    if (command !== 'pageview') return;
    const event = beforeSend({type:'pageview',url:window.location.href});
    if (event) fetch('/_vercel/insights/view',{method:'POST',body:JSON.stringify(event)});
  };
  pending.forEach((args) => window.va(...args));
})();`;
const speedStub = `(() => {
  const script = document.currentScript;
  let beforeSend = () => null;
  const pending = window.siq || [];
  window.si = (command, data) => { if (command === 'beforeSend') beforeSend = data; };
  pending.forEach((args) => window.si(...args));
  window.__qaEmitVital = () => {
    const event = beforeSend({type:'vital',url:window.location.href,route:script?.dataset.route});
    if (event) return fetch('/_vercel/speed-insights/vitals',{method:'POST',body:JSON.stringify(event)});
  };
  window.__qaEmitVital();
})();`;

process.env.NEXT_PUBLIC_GA4_READY = String(mode === '--ready');
process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-45XWR4KJ1M';
process.env.SANDBOX_FRONT_PREVIEW = '1';
process.env.SANDBOX_FRONT_CONTENT_FILE = `analytics-e2e-${process.pid}.json`;
const fixture = await startBadgeFixture();
let browser;
const checks = [];
const requests = [];
const errors = [];
try {
  // Le contenu est réservé à la base éphémère de ce processus.
  const { readFile } = await import('node:fs/promises');
  const { editableContentSchema } = await import('../src/domain/admin-content.ts');
  const { loadContent } = await import('../src/lib/load.ts');
  const { postgresSeedPublished } = await import('../src/lib/admin-persistence-postgres.ts');
  const observed = JSON.parse(
    await readFile(new URL('../test/fixtures/episode-001-public.json', import.meta.url), 'utf8'),
  );
  const { snapshots: _snapshots, ...base } = loadContent();
  void _snapshots;
  const content = editableContentSchema.parse({ ...base, episodes: [observed.episode] });
  await postgresSeedPublished(content);
  await writeFile(
    `.local/${process.env.SANDBOX_FRONT_CONTENT_FILE}`,
    JSON.stringify({ published: content }),
  );
  browser = await chromium.launch({
    headless: true,
    ...(process.env.SANDBOX_BROWSER_CHANNEL
      ? { channel: process.env.SANDBOX_BROWSER_CHANNEL }
      : {}),
  });
  const context = await browser.newContext({ viewport: { width: 320, height: 900 } });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === 'www.googletagmanager.com') {
      requests.push({ type: 'google-tag' });
      return route.fulfill({ contentType: 'text/javascript', body: googleStub });
    }
    if (
      url.pathname.endsWith('/speed-insights/script.debug.js') ||
      url.pathname === '/_vercel/speed-insights/script.js'
    ) {
      requests.push({ type: 'speed-tag' });
      return route.fulfill({ contentType: 'text/javascript', body: speedStub });
    }
    if (url.pathname === '/_vercel/speed-insights/vitals') {
      requests.push({ type: 'speed-event', body: request.postData() });
      return route.fulfill({ status: 204 });
    }
    if (
      url.hostname === 'va.vercel-scripts.com' ||
      url.pathname === '/_vercel/insights/script.js'
    ) {
      requests.push({ type: 'vercel-tag' });
      return route.fulfill({ contentType: 'text/javascript', body: vercelStub });
    }
    if (url.hostname === 'www.google-analytics.com' || url.pathname === '/_vercel/insights/view') {
      requests.push({
        type: url.hostname === 'www.google-analytics.com' ? 'google-event' : 'vercel-event',
        body: request.postData(),
      });
      return route.fulfill({ status: 204 });
    }
    return url.origin === fixture.origin ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(15000);
  await page.goto(`${fixture.origin}/search?q=qa-sensitive#qa-fragment`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('button', { name: 'Refuser', exact: true }).waitFor();
  assert.deepEqual(requests, []);
  checks.push('aucun script avant accord');
  await page.getByRole('button', { name: 'Refuser', exact: true }).click();
  assert.deepEqual(requests, []);
  checks.push('refus sans script');
  await page.getByRole('button', { name: 'Préférences de mesure', exact: true }).click();
  await page.getByRole('button', { name: 'Accepter', exact: true }).click();
  await page.waitForFunction(() => typeof window.va === 'function');
  await page.waitForFunction(() => typeof window.__qaEmitVital === 'function');
  await page.waitForLoadState('networkidle');
  assert.equal(
    requests.some((request) => request.type === 'speed-event'),
    true,
  );
  assert.equal(
    requests.some((request) => /qa-sensitive|qa-fragment/.test(request.body ?? '')),
    false,
  );
  checks.push('Speed Insights après accord, URL sans recherche ni fragment');
  const speedScript = page.locator('script[src*="/speed-insights/script"]');
  const speedTagsBeforeRenewal = requests.filter((request) => request.type === 'speed-tag').length;
  const vitalsBeforeRenewal = requests.filter((request) => request.type === 'speed-event').length;
  await page.evaluate(() => {
    window.__qaSpeedLifecycle = 'same-document';
  });
  await page.getByRole('button', { name: 'Préférences de mesure', exact: true }).first().click();
  await page.getByRole('button', { name: 'Retirer mon accord', exact: true }).click();
  await page.evaluate(() => window.__qaEmitVital());
  await page.waitForLoadState('networkidle');
  assert.equal(
    requests.filter((request) => request.type === 'speed-event').length,
    vitalsBeforeRenewal,
    'Speed Insights doit rester silencieux après le retrait',
  );
  await page.getByRole('button', { name: 'Préférences de mesure', exact: true }).first().click();
  await page.getByRole('button', { name: 'Accepter', exact: true }).click();
  await page.locator('footer a[href="/about"]').click();
  await page.waitForURL(`${fixture.origin}/about`);
  await page.waitForLoadState('networkidle');
  assert.equal(await page.evaluate(() => window.__qaSpeedLifecycle), 'same-document');
  assert.equal(await speedScript.count(), 1);
  assert.equal(
    requests.filter((request) => request.type === 'speed-tag').length,
    speedTagsBeforeRenewal,
    'Le nouvel accord réutilise le script chargé avant le retrait',
  );
  assert.equal(
    await speedScript.getAttribute('data-route'),
    '/about',
    'La route du script suit encore les navigations clientes après un nouvel accord',
  );
  await page.evaluate(() => window.__qaEmitVital());
  await page.waitForLoadState('networkidle');
  const renewedVital = requests.filter((request) => request.type === 'speed-event').at(-1);
  assert.equal(
    requests.filter((request) => request.type === 'speed-event').length,
    vitalsBeforeRenewal + 1,
  );
  assert.deepEqual(JSON.parse(renewedVital.body), {
    type: 'vital',
    url: `${fixture.origin}/about`,
    route: '/about',
  });
  checks.push('retrait, nouvel accord et navigation cliente : route Speed Insights actualisée');
  if (mode === '--blocked') {
    await page.goto(`${fixture.origin}/about`, { waitUntil: 'networkidle' });
    assert.equal(
      requests.some((request) => request.type.startsWith('google')),
      false,
    );
    checks.push('GA4 bloqué sans validation du flux, même après accord');
  } else {
    await page.waitForFunction(() =>
      window.__qaGoogleEvents?.some((event) => event.name === 'page_view'),
    );
    for (const [path, name, width] of [
      ['/', 'discovery_open', 1280],
      ['/', 'discovery_open', 320],
      ['/', 'youtube_open', 320],
      ['/charts', 'experience_interaction', 320],
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${fixture.origin}${path}`, { waitUntil: 'networkidle' });
      const action = page
        .locator(`[data-analytics-event="${name}"]`)
        .filter({ visible: true })
        .first();
      await action.waitFor();
      await action.evaluate((element) => {
        document.addEventListener('click', (event) => event.preventDefault(), {
          once: true,
          capture: true,
        });
        element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      await page.waitForFunction(
        (eventName) => window.__qaGoogleEvents?.some((event) => event.name === eventName),
        name,
      );
      checks.push(`${name} ${width}px`);
    }
    await page.goto(`${fixture.origin}/episodes/1`, { waitUntil: 'networkidle' });
    for (const name of ['episode_play_requested', 'episode_source_open', 'episode_project_open']) {
      const action = page.locator(`[data-analytics-event="${name}"]`).first();
      await action.waitFor();
      await action.evaluate((element) => {
        document.addEventListener('click', (event) => event.preventDefault(), {
          once: true,
          capture: true,
        });
        element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      await page.waitForFunction(
        (eventName) => window.__qaGoogleEvents?.some((event) => event.name === eventName),
        name,
      );
      checks.push(name);
    }
    await page.goto(`${fixture.origin}/nos-projets/sillage`, { waitUntil: 'networkidle' });
    const backToEpisode = page.locator('[data-analytics-event="project_episode_open"]').first();
    await backToEpisode.waitFor();
    await backToEpisode.evaluate((element) => {
      document.addEventListener('click', (event) => event.preventDefault(), {
        once: true,
        capture: true,
      });
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(() =>
      window.__qaGoogleEvents?.some((event) => event.name === 'project_episode_open'),
    );
    checks.push('project_episode_open');
    assert.equal(
      requests.some((request) => /qa-sensitive|qa-fragment/.test(request.body ?? '')),
      false,
    );
    checks.push('requête et fragment absents des événements');
  }
  const second = await context.newPage();
  await second.goto(`${fixture.origin}/confidentialite`, { waitUntil: 'networkidle' });
  await second.getByRole('button', { name: 'Préférences de mesure', exact: true }).first().click();
  await second.getByRole('button', { name: 'Retirer mon accord', exact: true }).click();
  await page.waitForFunction(() => window['ga-disable-G-45XWR4KJ1M'] === true);
  const beforeWithdrawalCheck = requests.filter((request) => request.type.endsWith('event')).length;
  await page.evaluate(() => {
    window.va?.('pageview', {});
    window.__qaEmitVital?.();
    window.gtag?.('event', 'page_view', { page_location: window.location.href });
  });
  await page.goto(`${fixture.origin}/about`, { waitUntil: 'networkidle' });
  assert.equal(
    requests.filter((request) => request.type.endsWith('event')).length,
    beforeWithdrawalCheck,
  );
  assert.equal(
    (await context.cookies()).some((cookie) => cookie.name.startsWith('_ga')),
    false,
  );
  checks.push('retrait propagé au second onglet et cookies supprimés');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'sandbox.analytics-consent.v2',
      JSON.stringify({ version: 2, choice: 'accepted', chosenAt: Date.now() - 180 * 86400000 }),
    );
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Refuser', exact: true }).waitFor();
  assert.equal(
    requests.filter((request) => request.type.endsWith('event')).length,
    beforeWithdrawalCheck,
  );
  checks.push('accord expiré redemandé sans mesure');
  await second.close();
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'sandbox.analytics-consent.v2',
      JSON.stringify({ version: 2, choice: 'accepted', chosenAt: Date.now() }),
    );
  });
  const requestsBeforeAdmin = requests.length;
  await page.goto(`${fixture.origin}/admin`, { waitUntil: 'networkidle' });
  assert.equal(
    requests.filter((request) => request.type.endsWith('event')).length,
    beforeWithdrawalCheck,
  );
  assert.equal(requests.length, requestsBeforeAdmin);
  checks.push('administration sans script ni mesure, même avec un accord enregistré');
  if (mode === '--ready') {
    const slowContext = await browser.newContext();
    const pendingTag = Promise.withResolvers();
    const requestedTag = Promise.withResolvers();
    let lateEvents = 0;
    await slowContext.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === 'www.googletagmanager.com') {
        requestedTag.resolve();
        await pendingTag.promise;
        return route.fulfill({ contentType: 'text/javascript', body: googleStub });
      }
      if (url.hostname === 'va.vercel-scripts.com')
        return route.fulfill({ contentType: 'text/javascript', body: vercelStub });
      if (url.hostname === 'www.google-analytics.com') {
        lateEvents += 1;
        return route.fulfill({ status: 204 });
      }
      if (url.pathname === '/_vercel/insights/view') return route.fulfill({ status: 204 });
      return url.origin === fixture.origin ? route.continue() : route.abort();
    });
    const slowPage = await slowContext.newPage();
    await slowPage.goto(`${fixture.origin}/about`, { waitUntil: 'networkidle' });
    await slowPage.getByRole('button', { name: 'Accepter', exact: true }).click();
    await requestedTag.promise;
    await slowPage.getByRole('button', { name: 'Préférences de mesure', exact: true }).click();
    await slowPage.getByRole('button', { name: 'Retirer mon accord', exact: true }).click();
    pendingTag.resolve();
    await slowPage.waitForFunction(() => window.__sandboxGoogleTagLoaded === true);
    assert.equal(lateEvents, 0);
    assert.deepEqual(await slowPage.evaluate(() => window.__qaGoogleEvents), []);
    checks.push('tag lent sans rejeu après retrait');
    await slowContext.close();
  }
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  checks.push('aucune erreur JavaScript ni débordement à 320 px');
  await mkdir('.local/analytics-e2e', { recursive: true });
  await writeFile(
    `.local/analytics-e2e/${mode.slice(2)}.json`,
    JSON.stringify({ status: 'passed', services: 'local-stubs', checks }, null, 2),
  );
  log(`Consentement ${mode}: ${checks.length} contrôles réussis.`);
} catch (error) {
  log(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await fixture.close();
}
process.exit(process.exitCode ?? 0);
