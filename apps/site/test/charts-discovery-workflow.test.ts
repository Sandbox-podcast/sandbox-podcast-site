import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CHARTS_DISCOVERY_RUNNER_BUDGET_MS } from '../src/pipeline/charts-discovery-runner.ts';
const workflow = readFileSync(
  new URL('../../../.github/workflows/charts-refresh.yml', import.meta.url),
  'utf8',
).replaceAll('\r\n', '\n');
const discovery = workflow.split('  discovery:\n')[1]?.split('\n  refresh:')[0];
const script = fileURLToPath(new URL('../scripts/charts-discovery.ts', import.meta.url));
function run(failures: string, secret = 'fixture-secret-not-real', network = false) {
  const preload = `const cursor = {version:1,date:"2026-10-20",planHash:"0000000000000000000000000000000000000000000000000000000000000000",queryIndex:0,page:1};
  globalThis.fetch = async (url) => {
    const job = new URL(url).pathname.split('/').at(-1);
    console.log('called:' + job);
    const failed = process.env.FAILED_JOBS.split(',').includes(job);
    if (failed && process.env.NETWORK_FAILURE === 'true') throw new Error('fixture network error');
    return new Response(JSON.stringify({status: failed ? 'partial' : 'success', processed: 1, succeeded: failed ? 0 : 1, failed: failed ? 1 : 0, discoveryProgress: {from:cursor,next:{...cursor,queryIndex:2},partitions:2,complete:true}}), {status: failed ? 503 : 200});
  };`;
  return spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--import',
      'data:text/javascript,' + encodeURIComponent(preload),
      script,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        CHARTS_ORIGIN: 'https://example.test',
        CRON_SECRET: secret,
        FAILED_JOBS: failures,
        NETWORK_FAILURE: String(network),
      },
    },
  );
}
describe('workflow et CLI de découverte', () => {
  it.each([true, false])('tente discovery après une erreur Trending réseau=%s', (network) => {
    const result = run('github-trending', 'fixture-secret-not-real', network);
    expect(result.status).toBe(1);
    expect(result.stdout.match(/called:[^\n]+/g)).toEqual([
      'called:github-trending',
      'called:github-discovery',
    ]);
  });
  it('branche le vrai runner borné dans la marge du job existant', () => {
    expect(discovery).toContain('run: node apps/site/scripts/charts-discovery.ts');
    const timeoutMinutes = Number(discovery?.match(/timeout-minutes: (\d+)/)?.[1]);
    expect(timeoutMinutes).toBe(20);
    expect(CHARTS_DISCOVERY_RUNNER_BUDGET_MS / 1000 + 150 + 120).toBeLessThan(timeoutMinutes * 60);
  });
  it.each(['github-trending', 'github-discovery', 'github-trending,github-discovery'])(
    'conserve un échec pour %s',
    (failures) => {
      const result = run(failures);
      expect(result.error).toBeUndefined();
      expect(result.stdout.match(/called:[^\n]+/g)).toEqual([
        'called:github-trending',
        'called:github-discovery',
      ]);
      expect(result.status).toBe(1);
    },
  );
  it('réussit uniquement quand les deux sources réussissent', () => {
    expect(run('').status).toBe(0);
  });
  it('ne tente aucune source quand le secret manque', () => {
    const result = run('', '');
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('called:');
  });
});
