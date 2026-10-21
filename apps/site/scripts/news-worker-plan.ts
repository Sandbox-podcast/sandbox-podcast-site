import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { newsPendingSchema } from '../src/domain/news-queue.ts';
import { planNewsWorkers } from '../src/domain/news-worker.ts';

export async function newsWorkerPlan(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  const origin = new URL(env['SANDBOX_NEWS_ORIGIN'] ?? 'https://www.sandboxpodcast.fr');
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  )
    throw new Error('Origine News invalide.');
  const secret = env['CRON_SECRET'] ?? '';
  if (secret.length < 16) throw new Error('Secret News absent.');
  const response = await fetch(new URL('/api/cron/news-candidates', origin), {
    headers: { Authorization: `Bearer ${secret}` },
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`File News : HTTP ${response.status}.`);
  const pending = newsPendingSchema.parse(await response.json());
  if (!pending.backlog) throw new Error('Volume de la file News absent.');
  if (pending.backlog.ready !== undefined && pending.backlog.ready < pending.items.length)
    throw new Error('Le compteur News contredit les candidats prêts retournés par la file.');
  const plan = planNewsWorkers(pending.backlog);
  return { ...plan, backlog: pending.backlog, processingStartedAt: new Date().toISOString() };
}

async function main() {
  const plan = await newsWorkerPlan();
  if (process.env['GITHUB_OUTPUT'])
    await appendFile(
      process.env['GITHUB_OUTPUT'],
      `worker-count=${plan.count}\nworkers=${JSON.stringify(plan.matrix)}\nprocessing-started-at=${plan.processingStartedAt}\n`,
    );
  console.log(JSON.stringify({ phase: 'workers', ...plan.backlog, workers: plan.count }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => {
    console.error(
      'Planification des workers News impossible ; aucun secret ni contenu source affiché.',
    );
    process.exitCode = 1;
  });
