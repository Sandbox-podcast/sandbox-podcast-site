import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  AUTOMATION_REPOSITORY,
  automationChartEditionSchema,
  discoveryAutomationCycle,
  newsAutomationCycle,
  planChartsAutomation,
  planNewsAutomation,
  type AutomationTarget,
  type AutomationWatchdogState,
} from '../src/domain/automation-watchdog';
import { runAutomationWatchdog } from '../src/pipeline/automation-watchdog';

const token = 'fixture-dispatch-token-never-in-results';
const clock = '2026-10-20T04:00:00.000Z';
const edition = (chart: string, weekId = '2026-10-20T00:00Z') => ({
  chart,
  weekId,
  publishedAt: '2026-10-20 03:20:32.16+00',
  entries: [{ rank: 1 }],
});
function run(workflow: 'news' | 'charts' = 'news', overrides: Record<string, unknown> = {}) {
  return {
    id: 123,
    head_branch: 'main',
    repository: { full_name: AUTOMATION_REPOSITORY },
    head_repository: { full_name: AUTOMATION_REPOSITORY },
    path: `.github/workflows/${workflow}-refresh.yml`,
    display_title: workflow === 'charts' ? 'SANDBOX CHARTS discovery' : 'SANDBOX News refresh',
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
    created_at: workflow === 'charts' ? '2026-10-20T01:17:00Z' : '2026-10-20T03:37:00Z',
    updated_at: workflow === 'charts' ? '2026-10-20T01:20:00Z' : '2026-10-20T03:55:00Z',
    ...overrides,
  };
}
function harness() {
  let at = new Date(clock);
  let checkedAt: string | null = '2026-10-20T03:40:00Z';
  let newsRuns = [run()];
  let chartsRuns = [run('charts')];
  let newsValue: unknown;
  let chartValue: unknown;
  let dispatchStatus = 204;
  let dispatchThrows = false;
  let writeThrows = false;
  const saved = new Map<AutomationTarget, AutomationWatchdogState>();
  const posts: { url: string; body: unknown }[] = [];
  const transport = vi.fn<typeof fetch>(async (input, options) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (options?.method === 'POST') {
      if (typeof options.body !== 'string') throw new Error('Expected JSON string body');
      const body = z
        .object({
          ref: z.literal('main'),
          inputs: z.object({ mode: z.enum(['due', 'recover', 'discovery']) }),
        })
        .parse(JSON.parse(options.body) as unknown);
      expect(
        saved.get(
          url.includes('news-')
            ? 'news'
            : body.inputs.mode === 'discovery'
              ? 'discovery'
              : 'charts',
        )?.status,
      ).toBe('reserved');
      posts.push({ url, body });
      if (dispatchThrows) throw new Error(`Private upstream text ${token}`);
      return new Response(dispatchStatus === 204 ? null : `Private upstream text ${token}`, {
        status: dispatchStatus,
      });
    }
    if (url.includes('api.github.com'))
      return Response.json({ workflow_runs: url.includes('news-') ? newsRuns : chartsRuns });
    expect(options?.headers).toBeUndefined();
    if (url.endsWith('/api/news'))
      return Response.json(
        newsValue ?? {
          checkedAt,
          sources: [{ ok: true }],
          items: [{ id: 'test', publishedAt: '2026-10-20' }],
        },
      );
    const chart = /\/charts\/([^/]+)\/current$/.exec(url)?.[1];
    if (chart)
      return chartValue === null
        ? Response.json({}, { status: 202 })
        : Response.json(chartValue ?? edition(chart));
    throw new Error('Unexpected URL');
  });
  const execute = (dryRun = false) =>
    runAutomationWatchdog({
      token,
      enabled: true,
      dryRun,
      now: () => at,
      fetch: transport,
      state: {
        get: async (key) => saved.get(key),
        put: async (key, value) => {
          if (writeThrows) throw new Error('Database unavailable');
          saved.set(key, structuredClone(value));
        },
      },
    });
  return {
    execute,
    transport,
    posts,
    saved,
    setTime: (value: string) => {
      at = new Date(value);
    },
    setCheckedAt: (value: string | null) => {
      checkedAt = value;
    },
    setNewsRuns: (value: ReturnType<typeof run>[]) => {
      newsRuns = value;
    },
    setChartsRuns: (value: ReturnType<typeof run>[]) => {
      chartsRuns = value;
    },
    setNewsValue: (value: unknown) => {
      newsValue = value;
    },
    setChartValue: (value: unknown) => {
      chartValue = value;
    },
    setDispatchStatus: (value: number) => {
      dispatchStatus = value;
    },
    setDispatchThrows: () => {
      dispatchThrows = true;
    },
    setWriteThrows: () => {
      writeThrows = true;
    },
  };
}

describe('planning automatique déterministe', () => {
  it('observe un créneau manquant en lecture seule sans réserver ni déclencher', async () => {
    const fixture = harness();
    fixture.setCheckedAt(null);
    fixture.setChartValue(null);
    fixture.setChartsRuns([]);
    const report = await fixture.execute(true);
    expect(report.ok).toBe(true);
    expect(report.results.map((result) => result.status)).toEqual(['due', 'due', 'due']);
    expect(fixture.posts).toEqual([]);
    expect(fixture.saved.size).toBe(0);
    expect(fixture.transport).toHaveBeenCalled();
  });
  it('garde le cycle News de la veille avant 03:37 UTC et respecte les cinq minutes de grâce', () => {
    expect(newsAutomationCycle(new Date('2026-10-20T00:36:00Z')).startsAt).toBe(
      '2026-10-19T03:37:00.000Z',
    );
    const input = { now: new Date('2026-10-20T03:38:00Z'), checkedAt: null, lastRunFailed: false };
    expect(planNewsAutomation(input).reason).toBe('not_due');
    expect(planNewsAutomation({ ...input, respectGrace: false }).reason).toBe('missing_collection');
    expect(planNewsAutomation({ ...input, now: new Date('2026-10-20T03:42:00Z') }).needed).toBe(
      true,
    );
  });
  it('conserve le même cycle News toute la journée et le renouvelle le lendemain à 03:37 UTC', () => {
    const cycle = newsAutomationCycle(new Date('2026-10-20T03:37:00Z'));
    for (const time of ['2026-10-20T10:37:00Z', '2026-10-20T23:59:59Z', '2026-10-21T03:36:59Z'])
      expect(newsAutomationCycle(new Date(time))).toEqual(cycle);
    expect(newsAutomationCycle(new Date('2026-10-21T03:37:00Z')).startsAt).toBe(
      '2026-10-21T03:37:00.000Z',
    );
    expect(
      planNewsAutomation({
        now: new Date('2026-10-20T23:59:59Z'),
        checkedAt: '2026-10-20T03:40:00Z',
        lastRunFailed: false,
      }).needed,
    ).toBe(false);
  });
  it('reprend le traitement raté sans masquer une collecte encore nécessaire', () => {
    expect(
      planNewsAutomation({
        now: new Date(clock),
        checkedAt: '2026-10-20T03:40:00Z',
        lastRunFailed: true,
      }).reason,
    ).toBe('failed_processing');
    expect(
      planNewsAutomation({
        now: new Date(clock),
        checkedAt: '2026-10-20T02:40:00Z',
        lastRunFailed: true,
      }).reason,
    ).toBe('missing_collection');
  });
  it('attend 03:29/15:29 et vérifie les trois éditions en laissant Rising indépendant', () => {
    const entries = ['github', 'skills', 'models'].map((chart) => ({
      chart,
      value: edition(chart, '2026-10-19T12:00Z'),
    }));
    expect(planChartsAutomation(entries, new Date('2026-10-20T03:28:59Z')).needed).toBe(false);
    expect(planChartsAutomation(entries, new Date('2026-10-20T03:29:00Z')).needed).toBe(true);
    expect(planChartsAutomation(entries, new Date('2026-10-20T15:28:59Z')).needed).toBe(false);
    expect(planChartsAutomation(entries, new Date('2026-10-20T15:29:00Z')).needed).toBe(true);
    expect(
      planChartsAutomation(
        ['github', 'skills', 'models'].map((chart) => ({ chart, value: edition(chart) })),
        new Date(clock),
      ).needed,
    ).toBe(false);
    expect(automationChartEditionSchema.safeParse(edition('github')).success).toBe(true);
  });
  it('date la découverte du jour UTC et attend01:27', () => {
    const cycle = discoveryAutomationCycle(new Date('2026-10-20T00:00:00Z'));
    expect(cycle).toEqual({
      key: '2026-10-20',
      startsAt: '2026-10-20T01:17:00.000Z',
      dueAt: '2026-10-20T01:27:00.000Z',
    });
  });
});

describe('watchdog et transport borné', () => {
  it('reste silencieux sans activation ou sans jeton, avant tout accès réseau', async () => {
    const h = harness();
    const state = { get: vi.fn(), put: vi.fn() };
    expect(
      (await runAutomationWatchdog({ enabled: false, token, fetch: h.transport, state })).ok,
    ).toBe(true);
    expect((await runAutomationWatchdog({ enabled: true, fetch: h.transport, state })).ok).toBe(
      false,
    );
    expect(h.transport).not.toHaveBeenCalled();
    expect(state.get).not.toHaveBeenCalled();
  });
  it('observe les publications fraîches et mémorise la découverte déjà réussie', async () => {
    const h = harness();
    const report = await h.execute();
    expect(report.results.map((item) => item.status)).toEqual(['fresh', 'fresh', 'fresh']);
    expect(h.posts).toEqual([]);
    expect(h.saved.get('discovery')?.satisfied).toBe(true);
    h.setChartsRuns([]);
    expect((await h.execute()).results.find((item) => item.target === 'discovery')?.status).toBe(
      'fresh',
    );
  });
  it.each([200, 204])(
    'réserve avant le POST et accepte HTTP%s sans exposer le corps reçu',
    async (status) => {
      const h = harness();
      h.setCheckedAt(null);
      h.setDispatchStatus(status);
      const report = await h.execute();
      expect(h.posts).toEqual([
        {
          url: `https://api.github.com/repos/${AUTOMATION_REPOSITORY}/actions/workflows/news-refresh.yml/dispatches`,
          body: { ref: 'main', inputs: { mode: 'due' } },
        },
      ]);
      expect(h.saved.get('news')).toMatchObject({
        attempts: 1,
        status: 'accepted',
        cooldownUntil: '2026-10-20T04:15:00.000Z',
      });
      expect(JSON.stringify(report)).not.toContain(token);
      expect((await h.execute()).results[0]?.status).toBe('cooldown');
      expect(h.posts).toHaveLength(1);
    },
  );
  it.each(['queued', 'in_progress', 'waiting', 'requested', 'pending'])(
    'ne duplique pas un run News %s',
    async (status) => {
      const h = harness();
      h.setCheckedAt(null);
      h.setNewsRuns([run('news', { status, conclusion: null })]);
      expect((await h.execute()).results[0]?.status).toBe('active');
      expect(h.posts).toEqual([]);
    },
  );
  it('ignore les runs de fork, de PR, de mauvaise branche ou de mauvais workflow', async () => {
    const h = harness();
    h.setCheckedAt(null);
    h.setNewsRuns([
      run('news', { status: 'queued', head_repository: { full_name: 'someone/fork' } }),
      run('news', { status: 'queued', event: 'pull_request' }),
      run('news', { status: 'queued', head_branch: 'other' }),
      run('news', { status: 'queued', path: '.github/workflows/other.yml' }),
    ]);
    expect((await h.execute()).results[0]?.status).toBe('dispatched');
  });
  it('reprend un échec récent après collecte mais ignore celui d’un ancien cycle', async () => {
    const h = harness();
    h.setNewsRuns([run('news', { conclusion: 'failure' })]);
    expect((await h.execute()).results[0]?.status).toBe('dispatched');
    const old = harness();
    old.setNewsRuns([
      run('news', {
        conclusion: 'failure',
        created_at: '2026-10-20T02:37:00Z',
        updated_at: '2026-10-20T02:55:00Z',
      }),
    ]);
    expect((await old.execute()).results[0]?.status).toBe('fresh');
  });
  it('garde le bail après un POST ambigu et évite une relance immédiate', async () => {
    const h = harness();
    h.setCheckedAt(null);
    h.setDispatchThrows();
    expect((await h.execute()).ok).toBe(false);
    expect(h.saved.get('news')?.status).toBe('uncertain');
    h.setTime('2026-10-20T04:05:00Z');
    const cooling = await h.execute();
    expect(cooling.results[0]).toMatchObject({ status: 'cooldown', reason: 'dispatch_uncertain' });
    expect(cooling.ok).toBe(false);
    expect(h.posts).toHaveLength(1);
  });
  it('borne à trois essais par cycle et conserve un échec exploitable', async () => {
    const h = harness();
    h.setCheckedAt(null);
    h.setDispatchStatus(403);
    for (const at of ['03:42', '03:57', '04:12']) {
      h.setTime(`2026-10-20T${at}:00Z`);
      expect((await h.execute()).results[0]?.status).toBe('error');
    }
    h.setTime('2026-10-20T04:27:00Z');
    expect((await h.execute()).results[0]?.status).toBe('exhausted');
    expect(h.saved.get('news')).toMatchObject({
      attempts: 3,
      status: 'failed',
      errorCode: 'http_rejected',
    });
    expect(h.posts).toHaveLength(3);
    h.setTime('2026-10-20T04:42:00Z');
    expect((await h.execute()).results[0]?.status).toBe('exhausted');
    expect(h.posts).toHaveLength(3);
    h.setTime('2026-10-21T03:42:00Z');
    expect((await h.execute()).results[0]?.attempts).toBe(1);
    expect(h.posts.filter((post) => post.url.includes('news-refresh.yml'))).toHaveLength(4);
  });
  it('reprend un classement absent avec mode recover et une grâce de trente minutes', async () => {
    const h = harness();
    h.setChartValue(null);
    await h.execute();
    expect(h.posts).toHaveLength(1);
    expect(h.posts[0]?.body).toEqual({ ref: 'main', inputs: { mode: 'recover' } });
    expect(h.saved.get('charts')?.cooldownUntil).toBe('2026-10-20T04:30:00.000Z');
  });
  it('ne prend pas un refresh réussi pour une découverte, et bloque les deux si Charts travaille', async () => {
    const h = harness();
    h.setChartsRuns([run('charts', { display_title: 'SANDBOX CHARTS recover' })]);
    await h.execute();
    expect(h.posts[0]?.body).toEqual({ ref: 'main', inputs: { mode: 'discovery' } });
    const busy = harness();
    busy.setChartsRuns([
      run('charts', {
        status: 'in_progress',
        conclusion: null,
        created_at: '2026-10-20T03:50:00Z',
        updated_at: '2026-10-20T03:55:00Z',
      }),
    ]);
    busy.setChartValue(null);
    expect((await busy.execute()).results.slice(1).map((item) => item.status)).toEqual([
      'active',
      'active',
    ]);
    expect(busy.posts).toEqual([]);
  });

  it.each([
    { workflow: 'news' as const, createdAt: '2026-10-20T02:59:00Z', targets: ['news'] },
    {
      workflow: 'charts' as const,
      createdAt: '2026-10-20T03:14:00Z',
      targets: ['charts', 'discovery'],
    },
  ])(
    'signale un run $workflow actif trop ancien sans doublon ni annulation',
    async ({ workflow, createdAt, targets }) => {
      const h = harness();
      const stalled = [
        run(workflow, {
          status: 'queued',
          conclusion: null,
          created_at: createdAt,
          updated_at: '2026-10-20T03:59:00Z',
        }),
      ];
      if (workflow === 'news') {
        h.setCheckedAt(null);
        h.setNewsRuns(stalled);
      } else {
        h.setChartValue(null);
        h.setChartsRuns(stalled);
      }
      const report = await h.execute();
      expect(report.ok).toBe(false);
      for (const target of targets)
        expect(report.results.find((result) => result.target === target)).toMatchObject({
          status: 'error',
          reason: 'active_run_stalled',
        });
      expect(h.posts).toEqual([]);
    },
  );
  it('refuse les réponses invalides et ne transmet jamais le jeton aux lectures publiques', async () => {
    const h = harness();
    h.setNewsValue({ checkedAt: 'invalid', sources: [], items: [] });
    h.setChartValue({ unexpected: true });
    expect((await h.execute()).results.map((item) => item.status)).toEqual([
      'error',
      'error',
      'error',
    ]);
    expect(h.posts).toEqual([]);
    for (const [input, options] of h.transport.mock.calls) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      expect(url).toMatch(
        /^https:\/\/(?:www\.sandboxpodcast\.fr\/api\/|api\.github\.com\/repos\/Sandbox-podcast\/sandbox-podcast-site\/actions\/workflows\/)/,
      );
      expect(options?.redirect).toBe('manual');
    }
  });
  it('échoue sans POST si le stockage durable refuse la réservation', async () => {
    const h = harness();
    h.setCheckedAt(null);
    h.setWriteThrows();
    expect((await h.execute()).ok).toBe(false);
    expect(h.posts).toEqual([]);
  });
});
