import { closeDb } from '../src/db/client.ts';
import { DEFAULT_GITHUB_CHART_CONFIG, qualifiesRepository } from '../src/domain/github-charts.ts';
import { upsertDiscoveredRepositories } from '../src/lib/charts-store.ts';
import { loadContent } from '../src/lib/load.ts';
import { GithubClient } from '../src/pipeline/github-client.ts';
import {
  calculateGithubWeek,
  collectGithub,
  discoverGithub,
  freezeGithubWeek,
} from '../src/pipeline/github-jobs.ts';

const args = process.argv.slice(2);
const command = args[0];
const dryRun = args.includes('--dry-run');
try {
  if (command === 'discover') console.log(JSON.stringify(await discoverGithub(), null, 2));
  else if (command === 'collect') console.log(JSON.stringify(await collectGithub(), null, 2));
  else if (command === 'weekly') {
    const date = args.find((arg) => arg.startsWith('--date='))?.slice(7);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date UTC invalide.');
    console.log(
      JSON.stringify(
        dryRun
          ? await calculateGithubWeek({ date, dryRun: true })
          : await freezeGithubWeek({ publish: !args.includes('--draft') }),
        null,
        2,
      ),
    );
  } else if (command === 'seed') {
    const repos = loadContent().entities.flatMap((entity) =>
      entity.github ? [entity.github.repo] : [],
    );
    const client = new GithubClient();
    let created = 0;
    for (const fullName of [...new Set(repos)].slice(0, 30)) {
      try {
        const repo = await client.repository(fullName);
        if (qualifiesRepository(repo, DEFAULT_GITHUB_CHART_CONFIG, new Date()))
          created += dryRun ? 1 : await upsertDiscoveredRepositories([repo]);
      } catch (error) {
        console.error(`${fullName} : ${error instanceof Error ? error.message : 'indisponible'}`);
      }
    }
    console.log(JSON.stringify({ candidates: created, dryRun, metricsInserted: 0 }));
  } else
    throw new Error(
      'Commande : discover, collect, weekly [--dry-run] [--draft], seed [--dry-run].',
    );
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Job indisponible.');
  process.exitCode = 1;
} finally {
  await closeDb();
}
