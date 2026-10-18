import { spawn } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const { refreshNewsPreview } = await import('../src/lib/news-preview-store.ts');
const feed = await refreshNewsPreview();
console.log(
  `News : ${feed.items.length} publications réelles, ${feed.sources.filter((source) => source.ok).length}/${feed.sources.length} sources accessibles.`,
);
const child = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)),
    'dev',
    '--webpack',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3328',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      SANDBOX_NEWS_PREVIEW: '1',
      SITE_URL: 'http://localhost:3328',
      SITE_DATA_MODE: 'mock',
      DATABASE_URL: '',
      POSTGRES_URL: '',
      CRON_SECRET: '',
      NEXT_PUBLIC_GA_MEASUREMENT_ID: '',
    },
  },
);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
