import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

const readWorkflow = (name: string) =>
  readFileSync(
    new URL(`../../../.github/workflows/${name}.yml`, import.meta.url),
    'utf8',
  ).replaceAll('\r\n', '\n');
const youtube = readWorkflow('youtube-growth');
const poll = youtube.split('\n  poll:\n')[1];
const preflight = poll
  ?.split('        run: |\n')[1]
  ?.split('\n      - uses:')[0]
  ?.replace(/^ {10}/gm, '');
if (!preflight) throw new Error('Contrôle de configuration YouTube introuvable.');
const bash =
  process.platform === 'win32'
    ? join(process.env['ProgramFiles'] ?? 'C:/Program Files', 'Git/bin/bash.exe')
    : 'bash';

function runPreflight(configuration: Record<string, string> = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'sandbox-workflow-'));
  const outputPath = join(directory, 'output').replaceAll('\\', '/');
  const summaryPath = join(directory, 'summary').replaceAll('\\', '/');
  try {
    const result = spawnSync(bash, ['--noprofile', '--norc', '-s'], {
      encoding: 'utf8',
      input: preflight,
      env: {
        ...process.env,
        YOUTUBE_OAUTH_TOKEN_JSON: '',
        YOUTUBE_EXECUTE_ACTIONS: '',
        YOUTUBE_INITIAL_REVIEW_CONFIRMED: '',
        YOUTUBE_JOURNAL_DATABASE_URL: '',
        ...configuration,
        GITHUB_OUTPUT: outputPath,
        GITHUB_STEP_SUMMARY: summaryPath,
      },
    });
    const content = (path: string) => {
      try {
        return readFileSync(path, 'utf8');
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return '';
        throw error;
      }
    };
    return { ...result, output: content(outputPath), summary: content(summaryPath) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('polling YouTube avant installation', () => {
  it('exécute le traitement uniquement sur demande manuelle et garde les tests push/PR', () => {
    expect(youtube).not.toContain('  schedule:');
    expect(youtube).toContain('  workflow_dispatch:');
    expect(poll).toContain(
      "if: github.event_name == 'workflow_dispatch' && github.ref == format('refs/heads/{0}', github.event.repository.default_branch)",
    );
    expect(poll).not.toContain("github.event_name == 'schedule'");
    expect(youtube).toContain(
      "if: github.event_name == 'push' || github.event_name == 'pull_request'",
    );
  });

  it('signale le passage sans effet sans OAuth', () => {
    const result = runPreflight();
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.output).toBe('ready=false\n');
    expect(result.summary).toContain('aucune dépendance installée');
  });

  it('autorise la lecture avec OAuth sans activer les écritures', () => {
    const result = runPreflight({ YOUTUBE_OAUTH_TOKEN_JSON: 'fixture-token-not-real' });
    expect(result.status).toBe(0);
    expect(result.output).toBe('ready=true\n');
    expect(result.stdout + result.stderr + result.output + result.summary).not.toContain(
      'fixture-token',
    );
  });

  it.each(['true', '1', 'yes', 'on', ' TRUE '])(
    'refuse les écritures %s sans configuration complète',
    (enabled) => {
      for (const missing of [
        'YOUTUBE_OAUTH_TOKEN_JSON',
        'YOUTUBE_INITIAL_REVIEW_CONFIRMED',
        'YOUTUBE_JOURNAL_DATABASE_URL',
      ]) {
        const result = runPreflight({
          YOUTUBE_EXECUTE_ACTIONS: enabled,
          YOUTUBE_OAUTH_TOKEN_JSON: 'fixture-token-not-real',
          YOUTUBE_INITIAL_REVIEW_CONFIRMED: 'true',
          YOUTUBE_JOURNAL_DATABASE_URL: 'fixture-database-not-real',
          [missing]: '',
        });
        expect(result.status).toBe(1);
        expect(result.output).toBe('');
        expect(result.stdout + result.stderr).not.toMatch(/fixture-token|fixture-database/);
      }
    },
  );

  it('laisse les contrôles applicatifs vérifier la configuration complète', () => {
    expect(
      runPreflight({
        YOUTUBE_EXECUTE_ACTIONS: 'true',
        YOUTUBE_OAUTH_TOKEN_JSON: 'fixture-token-not-real',
        YOUTUBE_INITIAL_REVIEW_CONFIRMED: 'true',
        YOUTUBE_JOURNAL_DATABASE_URL: 'fixture-database-not-real',
      }).output,
    ).toBe('ready=true\n');
  });

  it('conditionne toutes les étapes coûteuses et garde un verrou propre au polling', () => {
    const steps = poll?.split(/\n {6}- /).slice(2) ?? [];
    expect(steps).toHaveLength(6);
    for (const step of steps) expect(step).toContain("steps.configuration.outputs.ready == 'true'");
    expect(poll).toContain('group: youtube-growth-main');
    expect(poll).toContain('cancel-in-progress: false');
    expect(youtube.split('\n  poll:\n')[0]).toContain('group: youtube-quality-${{ github.ref }}');
  });
});

describe('regroupement des tâches de classements', () => {
  const charts = readWorkflow('charts-refresh');
  it('mesure les poussées dans le contrôle quotidien sans masquer un échec', () => {
    const news = readWorkflow('news-refresh');
    const daily = news.split('\n  freshness:\n')[1];
    expect(charts).not.toContain('\n  bursts:\n');
    expect(daily).toContain("if: github.event_name == 'schedule'");
    expect(news).toContain("- cron: '37 3 * * *'");
    expect(charts).not.toContain('\n  freshness:\n');
    expect(charts).not.toContain('23 * * * *');
    expect(daily).toContain('Contrôler les éditions servies aux lecteurs');
    expect(daily).toContain('Mesurer les poussées GitHub');
    expect(daily).toContain("!cancelled() && vars.SANDBOX_CHARTS_BURSTS_ENABLED == 'true'");
    expect(daily).not.toContain('continue-on-error');
    expect(daily?.split('\n  recovery:\n')[0]).not.toContain('needs:');
    expect(daily).toContain('group: charts-collect-publish');
  });
  it('sérialise les collectes manuelles et programmées avec le même verrou', () => {
    const refresh = charts.split('\n  refresh:\n')[1]?.split('\n  freshness:\n')[0];
    expect(refresh).toContain('group: charts-collect-publish');
    expect(refresh).toContain('cancel-in-progress: false');
  });
});
