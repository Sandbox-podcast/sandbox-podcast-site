import { verifyNewsHealth } from '../src/domain/news-health.ts';
const origin = new URL(process.env['SANDBOX_NEWS_ORIGIN'] ?? 'https://www.sandboxpodcast.fr');
if (
  origin.protocol !== 'https:' ||
  origin.username ||
  origin.password ||
  origin.pathname !== '/' ||
  origin.search ||
  origin.hash
)
  throw new Error('SANDBOX_NEWS_ORIGIN doit être une origine HTTPS.');
try {
  const response = await fetch(new URL('/api/news', origin), {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
  });
  const report = response.ok
    ? verifyNewsHealth(await response.json())
    : { ok: false, reason: `Fil public HTTP ${response.status}.` };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
} catch {
  console.error('Le contrôle du fil News public a échoué.');
  process.exitCode = 1;
}
