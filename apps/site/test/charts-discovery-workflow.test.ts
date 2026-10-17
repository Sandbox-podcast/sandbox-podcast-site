import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  new URL('../../../.github/workflows/charts-refresh.yml', import.meta.url),
  'utf8',
).replaceAll('\r\n', '\n');
const discovery = workflow.split('  discovery:\n')[1]?.split('\n  refresh:')[0];
const script = discovery?.split('        run: |\n')[1]?.replace(/^ {10}/gm, '');
if (!script) throw new Error('Étape de découverte introuvable.');
const bash =
  process.platform === 'win32'
    ? join(process.env['ProgramFiles'] ?? 'C:/Program Files', 'Git/bin/bash.exe')
    : 'bash';

function run(failures: string, secret = 'fixture-secret-not-real') {
  // Exécute le vrai bloc du workflow sans réseau ni authentification réelle.
  return spawnSync(bash, ['--noprofile', '--norc', '-s'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CHARTS_ORIGIN: 'https://example.test',
      CRON_SECRET: secret,
      FAILED_JOBS: failures,
    },
    input: `curl() {
      local job="\${!#}"
      job="\${job##*/}"
      echo "called:$job"
      if [[ ",$FAILED_JOBS," == *",$job,"* ]]; then return 22; fi
      return 0
    }
${script}`,
  });
}

describe('découverte programmée indépendante de Trending', () => {
  it.each(['github-trending', 'github-discovery', 'github-trending,github-discovery'])(
    'tente les deux sources et conserve un échec lorsque %s échoue',
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
  it('réussit uniquement lorsque les deux sources réussissent', () => {
    expect(run('').status).toBe(0);
  });
  it('ne tente aucune source lorsque le secret manque', () => {
    const result = run('', '');
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('called:');
  });
});
