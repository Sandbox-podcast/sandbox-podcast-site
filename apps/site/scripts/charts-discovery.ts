import process from 'node:process';
import { runChartsDiscovery } from '../src/pipeline/charts-discovery-runner.ts';

const report = await runChartsDiscovery({
  origin: process.env['CHARTS_ORIGIN'] ?? 'https://www.sandboxpodcast.fr',
  secret: process.env['CRON_SECRET'],
  fetch,
});
console.log(JSON.stringify(report));
if (!report.ok) process.exitCode = 1;
