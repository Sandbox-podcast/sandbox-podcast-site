// Aperçu complet sur base éphémère : classements, épisode et comptes de test.
import process from 'node:process';
import { log } from 'node:console';
import { fileURLToPath, URL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { startBadgeFixture } from './badges-fixture-server.mjs';

process.env.SANDBOX_FRONT_PREVIEW = '1';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
process.env.SITE_ADMIN_SECRET = 'fronts-local-test-secret-not-a-production-credential';
const fixture = await startBadgeFixture({
  kind: 'fronts',
  port: Number(process.env.SANDBOX_FRONT_PORT ?? 3317),
});
try {
  const { loadContent } = await import('../src/lib/load.ts');
  const { editableContentSchema } = await import('../src/domain/admin-content.ts');
  const { postgresSeedPublished } = await import('../src/lib/admin-persistence-postgres.ts');
  const { createDatabaseAdmin } = await import('../src/lib/admin-users-store.ts');
  const { hashAdminPassword } = await import('../src/lib/admin-auth-db.ts');
  const { episodeSchema } = await import('../src/domain/schema.ts');
  const source = loadContent();
  const content = editableContentSchema.parse(
    Object.fromEntries(Object.entries(source).filter(([key]) => key !== 'snapshots')),
  );
  content.episodes = [
    episodeSchema.parse({
      number: 1,
      title:
        'FIXTURE locale : Codex, Claude Code et OpenCode, comment choisir ses outils et construire un projet avec les agents IA',
      dek: 'Épisode de test pour vérifier les titres longs, les chapitres et les ressources sur ordinateur et mobile.',
      publishedAt: '2026-10-12T12:00:00.000Z',
      durationSec: 4702,
      description:
        'Contenu de test local.\n\n0:00 Introduction\n25:50 Sillage\n1:17:41 Conclusion\n[Documentation du projet](https://example.com/documentation)',
      hosts: ['lou'],
      topics: ['agents'],
      platforms: { youtubeId: 'GgSiPkADCz4' },
      featured: true,
      cover: { tone: 0, kicker: 'FIXTURE locale' },
    }),
  ];
  await postgresSeedPublished(content);
  await writeFile('.local/front-content.json', JSON.stringify({ published: content }));
  for (const role of ['admin', 'editor', 'viewer']) {
    await createDatabaseAdmin({
      username: `fronts-${role}`,
      displayName: `FIXTURE ${role}`,
      role,
      passwordHash: hashAdminPassword('Fronts-local-test-2026!'),
    });
  }
  log(`FRONTS_READY=${fixture.origin}`);
  log(
    'Base PGlite éphémère. Comptes de test fronts-admin/editor/viewer, mot de passe Fronts-local-test-2026!',
  );
  process.on('SIGINT', () => void fixture.close().then(() => process.exit(0)));
  process.on('SIGTERM', () => void fixture.close().then(() => process.exit(0)));
} catch (error) {
  await fixture.close();
  throw error;
}
