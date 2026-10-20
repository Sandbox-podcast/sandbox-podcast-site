import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const cli = fileURLToPath(
  new URL('../.local/watchdog-tools/node_modules/wrangler/bin/wrangler.js', import.meta.url),
);
const config = fileURLToPath(
  new URL('../../../tools/automation-watchdog/wrangler.jsonc', import.meta.url),
);
const outdir = fileURLToPath(new URL('../.local/watchdog/bundle', import.meta.url));
const result = spawnSync(
  process.execPath,
  [cli, 'deploy', '--dry-run', '--config', config, '--outdir', outdir],
  {
    cwd: root,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    stdio: 'inherit',
    windowsHide: true,
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
