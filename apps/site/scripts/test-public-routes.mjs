import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { URL, URLSearchParams } from 'node:url';
import { log } from 'node:console';
import process from 'node:process';
import { startBadgeFixture } from './badges-fixture-server.mjs';
import { auditSitemap } from '../src/lib/sitemap-audit.ts';
import { externalEntitySchema } from '../src/domain/external-charts.ts';
const { fetch } = globalThis;

const fixture = await startBadgeFixture({ kind: 'public-routes' });
log(`PUBLIC_ROUTES_PREVIEW_ORIGIN=${fixture.origin}`);
try {
  const { freezeExternalEdition, saveExternalBatch } =
    await import('../src/lib/external-charts-store.ts');
  for (const chart of ['skills', 'models']) {
    const entities = Array.from({ length: 20 }, (_, index) => {
      const slug = `fixture-${chart}-${index}`;
      const source = {
        provider: chart === 'skills' ? 'skills-sh' : 'huggingface',
        externalId: slug,
        url: `https://example.com/${slug}`,
        label: 'FIXTURE locale',
      };
      return externalEntitySchema.parse({
        slug,
        type: chart === 'skills' ? 'skill' : 'model',
        name: `FIXTURE ${chart} ${index}`,
        organization: 'sandbox-test',
        description: 'Données de test locales, sans mesure réelle.',
        category: 'Coding',
        license: null,
        openWeights: null,
        sourceUrl: source.url,
        websiteUrl: null,
        sources: [source],
      });
    });
    await saveExternalBatch(
      entities,
      entities.map((entity) => ({
        entitySlug: entity.slug,
        source: entity.sources[0],
        observedOn: '2026-10-10',
        collectedAt: '2026-10-10T02:00:00Z',
        metrics: { installs: 1000, stars: 500 },
      })),
    );
    for (const week of ['2026-W41', '2026-10-10', '2026-10-14']) {
      const entries = entities.map((entity, index) => ({
        slug: entity.slug,
        identity: {
          name: entity.name,
          organization: entity.organization,
          sourceUrl: entity.sourceUrl,
          license: null,
          openWeights: null,
        },
        rank: index + 1,
        score: week === '2026-10-14' ? 90 - index : 70 - index,
        dimensions: { momentum: 70 - index },
        metrics: { installs: 1000, stars: 500 },
        sourceObservedAt: ['2026-10-10T02:00:00Z'],
        sources: entity.sources,
      }));
      assert.equal(
        await freezeExternalEdition(
          chart,
          week,
          '2026-10-10',
          'fixture-routing-test',
          {},
          entries,
          true,
        ),
        1,
      );
    }
  }
  const report = await auditSitemap(fixture.origin);
  await writeFile(
    new URL('sitemap.json', fixture.artifactDir),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  assert.ok(report.pages.some((page) => page.url.endsWith('/charts/skills/2026-10-10')));
  assert.equal(report.failed, 0, JSON.stringify(report.pages.filter((page) => page.issues.length)));
  const reportDir = new URL('../trust-routes/', fixture.artifactDir);
  await mkdir(reportDir, { recursive: true });
  await writeFile(
    new URL('sitemap-local-after.json', reportDir),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  log(`Sitemap local : ${report.passed}/${report.total} URL valides.`);

  const checks = [];
  const { rows: githubFixtures } = await fixture.pg.query(`
    SELECT entity.slug, entity.name, repo.full_name
    FROM chart_entities entity
    INNER JOIN github_projects repo ON repo.entity_id = entity.id
    ORDER BY repo.full_name LIMIT 1
  `);
  const githubFixture = githubFixtures[0];
  assert.ok(githubFixture, 'Une fiche GitHub publiée doit être présente dans la base de test.');
  const searchFixtures = [
    {
      name: githubFixture.name,
      slug: githubFixture.slug,
      query: githubFixture.full_name,
      path: `/charts/project/${githubFixture.slug}`,
    },
    ...['skills', 'models'].map((chart) => ({
      name: `FIXTURE ${chart} 0`,
      slug: `fixture-${chart}-0`,
      query: `fixture-${chart}-0`,
      path: `/charts/entity/fixture-${chart}-0`,
    })),
  ];
  const homeTitles = new Map([
    ['/en', 'Sandbox TalkShow: what AI changes for products and tech teams'],
    [
      '/es-es',
      'Sandbox TalkShow: lo que la IA cambia para los productos y los equipos de tecnología',
    ],
    ['/de-de', 'Sandbox TalkShow: was KI für Produkte und Tech-Teams verändert'],
  ]);
  const shareImages = new Map();
  for (const path of [
    '/charts',
    '/charts/github',
    '/charts/skills',
    '/charts/ai-models',
    '/charts/rising',
  ]) {
    const response = await fetch(fixture.origin + path);
    assert.equal(response.status, 200);
    const html = await response.text();
    const imageUrl = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    assert.ok(imageUrl, `Image de partage annoncée : ${path}`);
    shareImages.set(path, imageUrl.replaceAll('&amp;', '&'));
  }
  const { moveTriples } = await import('../src/lib/move-params.ts');
  const { allEntities } = await import('../src/lib/repository.ts');
  const model = allEntities().find((entity) => entity.kind === 'model');
  const move = moveTriples()[0];
  assert.ok(model && move);
  const legacyPaths = [
    '/projects/claude-code',
    `/models/${model.slug}`,
    `/moves/${move.chart}/${move.week}/${move.entity}`,
  ];
  for (const prefix of ['', '/en', '/es-es', '/de-de']) {
    if (homeTitles.has(prefix)) {
      const response = await fetch(`${fixture.origin}${prefix}`);
      assert.equal(response.status, 200);
      const html = await response.text();
      const expected = homeTitles.get(prefix);
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
      assert.ok(title?.startsWith(expected), `Titre d'accueil traduit : ${prefix}`);
      assert.equal(html.match(/<meta property="og:title" content="([^"]+)"/)?.[1], expected);
      assert.equal(html.match(/<meta name="twitter:title" content="([^"]+)"/)?.[1], expected);
      checks.push(`${prefix} : titres HTML, Open Graph et Twitter traduits`);
    }
    for (const entry of searchFixtures) {
      const searchPath = `${prefix}/search?${new URLSearchParams({ q: entry.query, type: 'entities' })}`;
      const response = await fetch(fixture.origin + searchPath);
      assert.equal(response.status, 200, searchPath);
      const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      assert.match(html, /name="robots" content="noindex/);
      assert.ok(
        html.includes(`href="${prefix}${entry.path}"`),
        `Résultat publié cliquable : ${searchPath}`,
      );
      assert.ok(html.includes(entry.name), `Nom publié visible : ${searchPath}`);
      const detail = await fetch(`${fixture.origin}${prefix}${entry.path}`);
      assert.equal(detail.status, 200, `${prefix}${entry.path}`);
      assert.ok(
        (await detail.text()).includes(entry.name),
        `Fiche accessible : ${prefix}${entry.path}`,
      );
      checks.push(`${searchPath} : résultat publié et fiche accessibles`);
    }
    for (const path of legacyPaths) {
      const response = await fetch(fixture.origin + prefix + path);
      assert.equal(response.status, 200);
      const html = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      assert.match(html, /name="robots" content="noindex/);
      assert.match(html, /simul|demo|Demo/);
      assert.doesNotMatch(
        html,
        /class="move-preview|Current ranking|itemtype="https:\/\/schema.org\/Product/,
      );
      if (!prefix) {
        const imageUrl = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
        assert.ok(imageUrl, `Image de partage annoncée : ${path}`);
        shareImages.set(path, imageUrl.replaceAll('&amp;', '&'));
      }
      checks.push(prefix + path);
    }
    const archive = await fetch(`${fixture.origin}${prefix}/charts/skills/2026-10-10`);
    assert.equal(archive.status, 200);
    assert.match(await archive.text(), /FIXTURE skills 0/);
    checks.push(`${prefix}/charts/skills/2026-10-10`);
    const method = await fetch(
      `${fixture.origin}${prefix}/charts/skills/methodology?edition=2026-10-10`,
    );
    assert.equal(method.status, 200);
    assert.match(await method.text(), /fixture-routing-test/);
    checks.push(`${prefix}/charts/skills/methodology?edition=2026-10-10`);
    const privacy = await fetch(`${fixture.origin}${prefix}/confidentialite`);
    assert.equal(privacy.status, 200);
    assert.match(await privacy.text(), /sandbox\.podcast\.pro@gmail\.com/);
    checks.push(`${prefix}/confidentialite`);
  }
  for (const [path, imageUrl] of shareImages) {
    const image = await fetch(imageUrl);
    assert.equal(image.status, 200);
    assert.match(image.headers.get('content-type'), /image\/png/);
    assert.ok((await image.arrayBuffer()).byteLength > 1000);
    checks.push(`${path}/opengraph-image`);
  }
  const absent = await fetch(`${fixture.origin}/charts/skills/2026-10-09`);
  assert.equal(absent.status, 404);
  checks.push('archive absente : 404');
  const absentMethod = await fetch(
    `${fixture.origin}/charts/skills/methodology?edition=2026-10-09`,
  );
  assert.equal(absentMethod.status, 404);
  checks.push('méthode absente : 404');
  await writeFile(
    new URL('routes.json', fixture.artifactDir),
    JSON.stringify({ status: 'passed', database: 'ephemeral-pglite', checks }, null, 2),
  );
  log(`Parcours HTTP : ${checks.length} contrôles réussis.`);
  await writeFile(
    new URL('routes-local-after.json', reportDir),
    JSON.stringify({ status: 'passed', database: 'ephemeral-pglite', checks }, null, 2),
  );
  if (process.argv.includes('--serve')) {
    log('PREVIEW_READY. Envoyer une ligne pour fermer la base éphémère.');
    process.stdin.resume();
    await once(process.stdin, 'data');
    process.stdin.pause();
  }
} catch (error) {
  log('Contrôle des parcours échoué :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await fixture.close();
}
// Next dev conserve des observateurs de fichiers après close() sur Windows.
process.exit(process.exitCode ?? 0);
