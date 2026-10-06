/**
 * Valide tout le contenu : schémas (Zod), références croisées, continuité des snapshots.
 * Sortie 1 s'il y a une erreur. Les avertissements (liens à compléter, vidéo manquante…) ne bloquent pas.
 *
 *   node scripts/content-check.ts [--strict]    # --strict : les avertissements bloquent aussi
 */
import { parseArgs } from 'node:util';
import { ContentError, loadContent } from '../src/lib/load.ts';
import { validateContent } from '../src/lib/validate.ts';

const { values } = parseArgs({ options: { strict: { type: 'boolean', default: false } } });

try {
  const content = loadContent();
  const issues = validateContent(content, { live: process.env['SITE_DATA_MODE'] === 'live' });
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warn');

  const snapshotCount = Object.values(content.snapshots).reduce((n, list) => n + list.length, 0);
  console.log(
    `${String(content.charts.length)} classements, ${String(snapshotCount)} snapshots, ${String(content.entities.length)} entités, ${String(content.episodes.length)} épisodes, ${String(content.stories.length)} articles, ${String(content.takes.length)} avis.`,
  );
  for (const i of errors) console.error(`ERREUR  ${i.where} : ${i.message}`);
  for (const i of warnings) console.warn(`AVERT.  ${i.where} : ${i.message}`);
  console.log(`${String(errors.length)} erreur(s), ${String(warnings.length)} avertissement(s).`);
  process.exit(errors.length > 0 || (values.strict && warnings.length > 0) ? 1 : 0);
} catch (error) {
  if (error instanceof ContentError) {
    console.error(`Fichier invalide : ${error.message}`);
  } else {
    console.error(error);
  }
  process.exit(1);
}
