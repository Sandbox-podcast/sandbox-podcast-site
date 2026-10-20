import { appendFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { z } from 'zod';
import {
  planChartsRecovery,
  refreshCharts,
  verifyPublishedEdition,
} from '../src/domain/charts-refresh-runner.ts';

const origin = z.url().parse(process.env['CHARTS_ORIGIN'] ?? 'https://www.sandboxpodcast.fr');
const target = new URL(origin);
if (
  target.protocol !== 'https:' ||
  target.username ||
  target.password ||
  target.pathname !== '/' ||
  target.search ||
  target.hash
)
  throw new Error('CHARTS_ORIGIN doit être une origine HTTPS sans chemin ni identifiants.');
const checkOnly = process.argv.includes('--check');
const recoverOnly = process.argv.includes('--recover');
const secret = process.env['CRON_SECRET'];
if (!checkOnly && !recoverOnly && (!secret || secret.length < 16)) {
  console.error(
    'SANDBOX_CHARTS_CRON_SECRET manque ou est trop court. Configurer la même valeur que CRON_SECRET sur Vercel.',
  );
  process.exitCode = 1;
} else {
  const request = async (path: string, authenticated = false): Promise<unknown> => {
    const response = await fetch(new URL(path, target), {
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(authenticated ? 330_000 : 30_000),
      headers: authenticated ? { Authorization: `Bearer ${secret ?? ''}` } : {},
    });
    if (![200, 202].includes(response.status) && !(authenticated && response.status === 503))
      throw new Error(`HTTP ${response.status} sur ${path}.`);
    return response.json() as Promise<unknown>;
  };
  const current = (chart: string) => request(`/api/charts/${chart}/current`);
  try {
    const editions =
      checkOnly || recoverOnly
        ? await Promise.all(
            ['github', 'rising', 'skills', 'models'].map(async (chart) => ({
              chart,
              value: await current(chart),
            })),
          )
        : [];
    const now = new Date();
    const recovery = planChartsRecovery(editions, now);
    const outputFile = process.env['GITHUB_OUTPUT'];
    if (checkOnly && outputFile)
      await appendFile(outputFile, `recovery-needed=${recovery.needed}\n`);
    // Le job de reprise relit les éditions après acquisition du verrou partagé.
    // Un passage déjà terminé ne doit pas provoquer une deuxième collecte.
    if (recoverOnly && recovery.needed && (!secret || secret.length < 16))
      throw new Error('Secret de collecte absent ou trop court pour la reprise.');
    const report =
      checkOnly || (recoverOnly && !recovery.needed)
        ? (() => {
            const results = editions.map(({ chart, value }) => ({
              chart,
              ...verifyPublishedEdition(value, chart, now),
            }));
            return { ok: results.every((result) => result.ok), recovery, results };
          })()
        : await refreshCharts(
            {
              job: (name) => request(`/api/cron/${name}`, true),
              current,
              wait: async () => {
                await setTimeout(15_000);
              },
              mayRunJob: () =>
                !recoverOnly || planChartsRecovery([], new Date()).slot === recovery.slot,
            },
            now,
            recoverOnly ? recovery.missing : undefined,
          );
    console.log(JSON.stringify(report, null, 2));
    const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
    if (summaryFile)
      await appendFile(
        summaryFile,
        `| Classement | Édition publique | État |\n| --- | --- | --- |\n${report.results.map((row) => `| ${row.chart} | ${row.edition ?? 'absente'} | ${row.reason} |`).join('\n')}\n`,
      );
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    console.error(
      error instanceof Error &&
        error.message === 'Secret de collecte absent ou trop court pour la reprise.'
        ? 'SANDBOX_CHARTS_CRON_SECRET manque ou est trop court : reprise impossible.'
        : 'La vérification des classements a échoué. Vérifier la disponibilité du site et la configuration du planificateur.',
    );
    process.exitCode = 1;
  }
}
