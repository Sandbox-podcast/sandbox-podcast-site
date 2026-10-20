import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  workflowPreflight,
  WORKFLOW_PREFLIGHT_HISTORY_PAGE_LIMIT,
  WORKFLOW_PREFLIGHT_READ_TIMEOUT_MS,
} from '../scripts/automation-workflow-preflight.ts';
import { CHARTS_DISCOVERY_RUNNER_BUDGET_MS } from '../src/pipeline/charts-discovery-runner.ts';
import {
  AUTOMATION_REPOSITORY,
  type AutomationWorkflowRun,
} from '../src/domain/automation-watchdog.ts';

const now = new Date('2026-10-20T10:45:00Z');
const environment = {
  GITHUB_REPOSITORY: AUTOMATION_REPOSITORY,
  GITHUB_RUN_ID: '9000',
  GITHUB_TOKEN: 'fixture-token-not-real',
  SANDBOX_NEWS_ORIGIN: 'https://example.test',
  AUTOMATION_MODE: 'due',
};
let checkedAt: string | null;
let sourceOk: boolean;
let runs: AutomationWorkflowRun[];
let historyPages: AutomationWorkflowRun[][] | undefined;
const fetcher = vi.fn<typeof fetch>();

function run(overrides: Partial<AutomationWorkflowRun> = {}): AutomationWorkflowRun {
  return {
    id: 100,
    repository: { full_name: AUTOMATION_REPOSITORY },
    head_repository: { full_name: AUTOMATION_REPOSITORY },
    head_branch: 'main',
    path: '.github/workflows/news-refresh.yml',
    display_title: 'SANDBOX News due',
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
    created_at: '2026-10-20T10:37:00Z',
    updated_at: '2026-10-20T10:42:00Z',
    ...overrides,
  };
}
function discovery(overrides: Partial<AutomationWorkflowRun> = {}) {
  return run({
    path: '.github/workflows/charts-refresh.yml',
    display_title: 'SANDBOX CHARTS discovery',
    ...overrides,
  });
}

beforeEach(() => {
  checkedAt = '2026-10-20T10:40:00Z';
  sourceOk = true;
  runs = [];
  historyPages = undefined;
  fetcher.mockReset().mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    expect(init?.method).toBe('GET');
    expect(init?.redirect).toBe('error');
    if (url.hostname === 'api.github.com') {
      expect(new Headers(init?.headers).get('authorization')).toBe(
        `Bearer ${environment.GITHUB_TOKEN}`,
      );
      expect(url.searchParams.get('branch')).toBe('main');
      expect(url.searchParams.get('status')).toBe('completed');
      const page = Number(url.searchParams.get('page'));
      return Response.json({ workflow_runs: historyPages?.[page - 1] ?? runs });
    }
    expect(url.href).toBe('https://example.test/api/news');
    expect(new Headers(init?.headers).has('authorization')).toBe(false);
    return Response.json({ checkedAt, sources: [{ name: 'Source', ok: sourceOk }], items: [] });
  });
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => vi.unstubAllGlobals());

describe('précontrôle News sous le verrou du workflow', () => {
  it('préserve la relance manuelle complète sans lecture distante', async () => {
    expect(await workflowPreflight('news', { AUTOMATION_MODE: 'refresh' }, now)).toMatchObject({
      collectNeeded: true,
      processNeeded: true,
      reason: 'manual_refresh',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('ne relance pas un cycle déjà collecté lors du deuxième déclenchement', async () => {
    checkedAt = '2026-10-20T09:40:00Z';
    expect(await workflowPreflight('news', environment, now)).toMatchObject({
      collectNeeded: true,
      processNeeded: true,
    });
    checkedAt = '2026-10-20T10:40:00Z';
    runs = [run()];
    expect(await workflowPreflight('news', environment, now)).toEqual({
      collectNeeded: false,
      processNeeded: false,
      runNeeded: false,
      reason: 'fresh',
    });
  });
  it.each([null, '2026-10-20T09:40:00Z', '2026-10-21T10:40:00Z'])(
    'collecte si la date %s est absente, ancienne ou future',
    async (value) => {
      checkedAt = value;
      expect(await workflowPreflight('news', environment, now)).toMatchObject({
        collectNeeded: true,
        processNeeded: true,
        reason: 'missing_collection',
      });
    },
  );
  it('respecte le cycle horaire à :37 sans imposer au cron GitHub la grâce du contrôle externe', async () => {
    checkedAt = '2026-10-20T09:40:00Z';
    expect(
      await workflowPreflight('news', environment, new Date('2026-10-20T10:36:59Z')),
    ).toMatchObject({ collectNeeded: false });
    expect(
      await workflowPreflight('news', environment, new Date('2026-10-20T10:37:00Z')),
    ).toMatchObject({ collectNeeded: true });
  });
  it.each(['failure', 'timed_out', 'action_required', 'startup_failure'])(
    'reprend uniquement le worker après %s dans un cycle déjà collecté',
    async (conclusion) => {
      runs = [run({ conclusion })];
      expect(await workflowPreflight('news', environment, now)).toEqual({
        collectNeeded: false,
        processNeeded: true,
        runNeeded: true,
        reason: 'failed_processing',
      });
    },
  );
  it('reprend la collecte lorsque toutes les sources ont échoué', async () => {
    sourceOk = false;
    runs = [run({ conclusion: 'failure' })];
    expect(await workflowPreflight('news', environment, now)).toMatchObject({
      collectNeeded: true,
      processNeeded: true,
      reason: 'missing_collection',
    });
  });
  it.each([
    { id: 9000 },
    { head_branch: 'feature' },
    { head_repository: { full_name: 'untrusted/fork' } },
    { repository: { full_name: 'untrusted/fork' } },
    { event: 'pull_request' },
    { path: '.github/workflows/other.yml' },
    { created_at: '2026-10-20T09:37:00Z', updated_at: '2026-10-20T09:42:00Z' },
    { created_at: '2026-10-21T10:37:00Z', updated_at: '2026-10-21T10:42:00Z' },
  ])('ignore un échec sans rapport avec le cycle autorisé : %j', async (override) => {
    runs = [run({ conclusion: 'failure', ...override })];
    expect(await workflowPreflight('news', environment, now)).toMatchObject({
      collectNeeded: false,
      processNeeded: false,
    });
  });
  it('ignore un ancien échec suivi par un passage réussi du cycle', async () => {
    runs = [
      run({ conclusion: 'failure' }),
      run({ id: 101, created_at: '2026-10-20T10:43:00Z', updated_at: '2026-10-20T10:44:00Z' }),
    ];
    expect(await workflowPreflight('news', environment, now)).toMatchObject({
      processNeeded: false,
    });
  });
  it('échoue sans travail si une des lectures publiques ou GitHub est indisponible', async () => {
    for (const unavailable of ['api.github.com', 'example.test']) {
      fetcher.mockImplementation(async (input) =>
        new URL(input instanceof Request ? input.url : input).hostname === unavailable
          ? new Response('', { status: 503 })
          : Response.json({
              checkedAt,
              sources: [{ name: 'Source', ok: true }],
              items: [],
              workflow_runs: [],
            }),
      );
      await expect(workflowPreflight('news', environment, now)).rejects.toThrow('503');
    }
  });
  it('refuse une réponse HTTP 200 qui ne respecte pas le schéma', async () => {
    fetcher.mockResolvedValue(Response.json({ checkedAt }));
    await expect(workflowPreflight('news', environment, now)).rejects.toThrow();
  });
  it.each([
    'http://example.test',
    'https://user:password@example.test',
    'https://example.test/path',
    'https://example.test?query=value',
  ])('refuse une origine non autorisée %s', async (origin) => {
    await expect(
      workflowPreflight('news', { ...environment, SANDBOX_NEWS_ORIGIN: origin }, now),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('découverte unique du jour après acquisition du verrou', () => {
  it('rattrape uniquement la découverte du jour après 01:17 UTC', async () => {
    expect(
      await workflowPreflight('discovery', environment, new Date('2026-10-20T00:30:00Z')),
    ).toMatchObject({ runNeeded: false, reason: 'not_due' });
    expect(
      await workflowPreflight('discovery', environment, new Date('2026-10-20T01:17:00Z')),
    ).toMatchObject({ runNeeded: true });
  });
  it.each(['SANDBOX CHARTS discovery', 'SANDBOX CHARTS 17 1 * * *'])(
    'évite le doublon après un succès %s',
    async (display_title) => {
      runs = [discovery({ display_title })];
      expect(await workflowPreflight('discovery', environment, now)).toMatchObject({
        runNeeded: false,
        reason: 'fresh',
      });
    },
  );
  it.each([
    { display_title: 'SANDBOX CHARTS refresh' },
    { display_title: 'SANDBOX CHARTS recover' },
    { display_title: 'SANDBOX CHARTS 17 3,15 * * *' },
    { conclusion: 'failure' },
    { created_at: '2026-10-19T01:17:00Z', updated_at: '2026-10-19T01:20:00Z' },
    { head_branch: 'feature' },
    { head_repository: { full_name: 'untrusted/fork' } },
  ])('ne confond pas un autre passage avec la découverte du jour : %j', async (override) => {
    runs = [discovery(override)];
    expect(await workflowPreflight('discovery', environment, now)).toMatchObject({
      runNeeded: true,
    });
  });
  it('pagine au-delà de cent passages pour retrouver la découverte du cycle', async () => {
    historyPages = [
      Array.from({ length: 100 }, (_, index) =>
        discovery({ id: index + 1, display_title: 'SANDBOX CHARTS recover' }),
      ),
      [discovery({ id: 800 })],
    ];
    expect(await workflowPreflight('discovery', environment, now)).toMatchObject({
      runNeeded: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('refuse de conclure à une découverte absente si cinq pages ne couvrent pas le cycle', async () => {
    runs = Array.from({ length: 100 }, (_, index) =>
      discovery({ id: index + 1, display_title: 'SANDBOX CHARTS recover' }),
    );
    await expect(workflowPreflight('discovery', environment, now)).rejects.toThrow(
      'Historique du cycle incomplet',
    );
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
});

describe('sorties du précontrôle et sélection des workflows', () => {
  it('laisse terminer le précontrôle et les deux collectes dans le budget de découverte', () => {
    const workflow = readFileSync(
      new URL('../../../.github/workflows/charts-refresh.yml', import.meta.url),
      'utf8',
    ).replaceAll('\r\n', '\n');
    const discovery = workflow.split('\n  discovery:\n')[1]?.split('\n  refresh:\n')[0] ?? '';
    const timeoutSeconds = Number(/timeout-minutes: (\d+)/u.exec(discovery)?.[1]) * 60;
    expect(discovery).toContain('run: node apps/site/scripts/charts-discovery.ts');
    expect(
      (WORKFLOW_PREFLIGHT_HISTORY_PAGE_LIMIT * WORKFLOW_PREFLIGHT_READ_TIMEOUT_MS) / 1000 +
        CHARTS_DISCOVERY_RUNNER_BUDGET_MS / 1000 +
        120,
    ).toBeLessThan(timeoutSeconds);
  });
  it.each(['refresh', 'recover'])('exécute le vrai bloc Charts dans le mode %s', (mode) => {
    const workflow = readFileSync(
      new URL('../../../.github/workflows/charts-refresh.yml', import.meta.url),
      'utf8',
    ).replaceAll('\r\n', '\n');
    const refresh = workflow.split('\n  refresh:\n')[1]?.split('\n  freshness:\n')[0];
    const script = refresh?.split('        run: |\n')[1]?.replace(/^ {10}/gmu, '');
    expect(script).toBeTruthy();
    const bash =
      process.platform === 'win32'
        ? join(process.env['ProgramFiles'] ?? 'C:/Program Files', 'Git/bin/bash.exe')
        : 'bash';
    const result = spawnSync(bash, ['--noprofile', '--norc', '-s'], {
      encoding: 'utf8',
      env: { ...process.env, AUTOMATION_MODE: mode },
      input: `node() { printf 'called:%s\\n' "$*"; }\n${script ?? ''}`,
    });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(
      `called:apps/site/scripts/charts-refresh.ts${mode === 'recover' ? ' --recover' : ''}`,
    );
  });
  it('écrit les trois sorties attendues sans divulguer de secret', () => {
    const directory = mkdtempSync(join(tmpdir(), 'automation-preflight-'));
    const output = join(directory, 'outputs');
    try {
      writeFileSync(output, '');
      const fixture = `globalThis.fetch = async (url) => String(url).includes('api.github.com') ? Response.json({workflow_runs: []}) : Response.json({checkedAt:null,sources:[],items:[]});`;
      const result = spawnSync(
        process.execPath,
        [
          '--import',
          `data:text/javascript,${encodeURIComponent(fixture)}`,
          fileURLToPath(new URL('../scripts/automation-workflow-preflight.ts', import.meta.url)),
          'news',
        ],
        { encoding: 'utf8', env: { ...process.env, ...environment, GITHUB_OUTPUT: output } },
      );
      expect(result.status).toBe(0);
      expect(readFileSync(output, 'utf8')).toBe(
        'collect-needed=true\nprocess-needed=true\nrun-needed=true\n',
      );
      expect(result.stdout + result.stderr).not.toContain(environment.GITHUB_TOKEN);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it('préserve les choix explicites, les verrous partagés et les droits en lecture', () => {
    const charts = readFileSync(
      new URL('../../../.github/workflows/charts-refresh.yml', import.meta.url),
      'utf8',
    );
    const news = readFileSync(
      new URL('../../../.github/workflows/news-refresh.yml', import.meta.url),
      'utf8',
    );
    for (const workflow of [charts, news]) {
      expect(workflow).toContain('default: refresh');
      expect(workflow).toContain('actions: read');
      expect(workflow).not.toMatch(/(?:actions|contents): write/u);
      expect(workflow).not.toContain('continue-on-error');
    }
    for (const mode of ['refresh', 'recover', 'discovery']) expect(charts).toContain(`- ${mode}`);
    expect(charts).toContain('group: charts-discovery-publish');
    expect(charts.match(/group: charts-collect-publish/gu)).toHaveLength(2);
    expect(charts).toContain("inputs.mode != 'discovery'");
    expect(charts).toContain("inputs.mode == 'discovery'");
    expect(news).toContain('- due');
    expect(news).toContain('group: news-refresh');
    expect(news).toContain("if: steps.preflight.outputs.collect-needed == 'true'");
    expect(news.match(/if: steps.preflight.outputs.process-needed == 'true'/gu)).toHaveLength(5);
  });
});
