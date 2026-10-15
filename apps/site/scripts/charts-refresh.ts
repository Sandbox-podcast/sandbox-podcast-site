import { appendFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { z } from 'zod';
import { refreshCharts, verifyPublishedEdition } from '../src/domain/charts-refresh-runner.ts';

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
const secret = process.env['CRON_SECRET'];
if (!checkOnly && (!secret || secret.length < 16)) {
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
    if (![200, 202, 503].includes(response.status))
      throw new Error(`HTTP ${response.status} sur ${path}.`);
    return response.json() as Promise<unknown>;
  };
  const current = (chart: string) => request(`/api/charts/${chart}/current`);
  try {
    const report = checkOnly
      ? await Promise.all(
          ['github', 'skills', 'models'].map(async (chart) => ({
            chart,
            ...verifyPublishedEdition(await current(chart), chart, new Date()),
          })),
        ).then((results) => ({ ok: results.every((result) => result.ok), results }))
      : await refreshCharts({
          job: (name) => request(`/api/cron/${name}`, true),
          current,
          wait: async () => {
            await setTimeout(15_000);
          },
        });
    console.log(JSON.stringify(report, null, 2));
    const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
    if (summaryFile)
      await appendFile(
        summaryFile,
        `| Classement | Édition publique | État |\n| --- | --- | --- |\n${report.results.map((row) => `| ${row.chart} | ${row.edition ?? 'absente'} | ${row.reason} |`).join('\n')}\n`,
      );
    if (!report.ok) process.exitCode = 1;
  } catch {
    console.error(
      'La vérification des classements a échoué. Vérifier la disponibilité du site et la configuration du planificateur.',
    );
    process.exitCode = 1;
  }
}
