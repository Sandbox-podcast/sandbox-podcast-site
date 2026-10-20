import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  runChartsDiscovery,
  CHARTS_DISCOVERY_REQUEST_TIMEOUT_MS,
  CHARTS_DISCOVERY_RUNNER_BUDGET_MS,
} from '../src/pipeline/charts-discovery-runner.ts';
import { initialGithubDiscoveryCursor } from '../src/domain/github-discovery-progress.ts';
const origin = 'https://example.test';
const secret = 'fixture-secret-not-real';
const from = initialGithubDiscoveryCursor('2026-10-20', ['a', 'b']);
const next = { ...from, queryIndex: 1 };
const completedProgress = (start = from) => ({
  from: start,
  next: { ...start, queryIndex: 2, page: 1 },
  partitions: 2,
  complete: true,
});
const success = (start = from) =>
  new Response(
    JSON.stringify({
      status: 'success',
      processed: 1,
      succeeded: 1,
      failed: 0,
      discoveryProgress: completedProgress(start),
    }),
    { status: 200 },
  );
const partial = (overrides: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      status: 'partial',
      processed: 1,
      succeeded: 1,
      failed: 0,
      remaining: 2,
      continuation: { reason: 'budget', from, next },
      discoveryProgress: { from, next, partitions: 2, complete: false },
      ...overrides,
    }),
    { status: 503 },
  );
afterEach(() => vi.restoreAllMocks());
describe('continuation HTTP bornée de la découverte', () => {
  it('termine directement sur deux succès 200 sans deuxième découverte', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => success());
    expect((await runChartsDiscovery({ origin, secret, fetch: fetcher })).ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([
    { status: 'skipped', processed: 0, succeeded: 0, failed: 0 },
    { status: 'partial', processed: 1, succeeded: 1, failed: 0 },
    { status: 'success', processed: 1, succeeded: 0, failed: 1 },
    { status: 'success', processed: 1, succeeded: 2, failed: 0 },
    { status: 'success', processed: 1, succeeded: 1, failed: 0, remaining: 1 },
    {
      status: 'success',
      processed: 1,
      succeeded: 1,
      failed: 0,
      continuation: { reason: 'budget', from, next },
    },
  ])('refuse HTTP200 quand la découverte n’est pas complète : %j', async (body) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ discoveryProgress: completedProgress(), ...body }), {
          status: 200,
        }),
      );
    const report = await runChartsDiscovery({ origin, secret, fetch: fetcher });
    expect(report).toMatchObject({ ok: false, continued: false });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('accepte uniquement la désactivation explicite de Trending avec des compteurs vides', async () => {
    const disabled = new Response(
      JSON.stringify({
        status: 'skipped',
        skipReason: 'disabled',
        processed: 0,
        succeeded: 0,
        failed: 0,
      }),
      { status: 200 },
    );
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(disabled)
      .mockResolvedValueOnce(success());
    expect((await runChartsDiscovery({ origin, secret, fetch: fetcher })).ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('ne transforme pas un skip désactivé de discovery en succès', async () => {
    const disabled = new Response(
      JSON.stringify({
        status: 'skipped',
        skipReason: 'disabled',
        processed: 0,
        succeeded: 0,
        failed: 0,
      }),
      { status: 200 },
    );
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(disabled);
    expect((await runChartsDiscovery({ origin, secret, fetch: fetcher })).ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('conserve un bail Trending déjà détenu comme état non confirmé', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'skipped', processed: 0, succeeded: 0, failed: 0 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(success());
    expect((await runChartsDiscovery({ origin, secret, fetch: fetcher })).ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refuse un point de départ incohérent à la fin du plan', async () => {
    const body = {
      status: 'success',
      processed: 1,
      succeeded: 1,
      failed: 0,
      discoveryProgress: { ...completedProgress(), from: { ...from, queryIndex: 2, page: 2 } },
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }));
    expect((await runChartsDiscovery({ origin, secret, fetch: fetcher })).ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('continue une seule fois après un budget sans erreur avec progression réelle', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(partial())
      .mockResolvedValueOnce(success(next));
    const report = await runChartsDiscovery({ origin, secret, fetch: fetcher });
    expect(report).toMatchObject({ ok: true, continued: true });
    expect(
      fetcher.mock.calls.map(
        ([url]) =>
          new URL(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url).pathname,
      ),
    ).toEqual([
      '/api/cron/github-trending',
      '/api/cron/github-discovery',
      '/api/cron/github-discovery',
    ]);
  });
  it.each([
    ['immobile', from],
    ['recul', { ...from, queryIndex: 0, page: 1 }],
    ['date différente', { ...next, date: '2026-10-21' }],
    ['plan différent', { ...next, planHash: '0'.repeat(64) }],
  ])('refuse la continuation avec un curseur %s', async (_label, cursor) => {
    const initial = _label === 'recul' ? { ...from, page: 2 } : from;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(
        partial({ continuation: { reason: 'budget', from: initial, next: cursor } }),
      );
    expect(await runChartsDiscovery({ origin, secret, fetch: fetcher })).toMatchObject({
      ok: false,
      continued: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    { failed: 1 },
    { remaining: 0 },
    { continuation: undefined },
    { continuation: { reason: 'incomplete_results', from, next } },
  ])('ne continue pas une erreur réelle ou une cause non admise : %j', async (change) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(partial(change));
    expect((await runChartsDiscovery({ origin, secret, fetch: fetcher })).ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([401, 403, 429, 302])('ne prolonge jamais après HTTP %s', async (status) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(new Response('', { status }));
    expect((await runChartsDiscovery({ origin, secret, fetch: fetcher })).ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[1]?.redirect).toBe('manual');
  });
  it('ne prolonge jamais après un timeout', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success())
      .mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'));
    expect((await runChartsDiscovery({ origin, secret, fetch: fetcher })).ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('refuse un JSON invalide sans nouvelle tentative', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(new Response('invalid JSON', { status: 503 }));
    const result = await runChartsDiscovery({ origin, secret, fetch: fetcher });
    expect(result.ok).toBe(false);
    expect(result.results.at(-1)?.reason).toBe('invalid_response');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['sans identité finale', undefined],
    [
      'autre date',
      { ...completedProgress(next), next: { ...completedProgress(next).next, date: '2026-10-21' } },
    ],
    [
      'autre plan',
      {
        ...completedProgress(next),
        from: { ...next, planHash: '0'.repeat(64) },
        next: { ...completedProgress(next).next, planHash: '0'.repeat(64) },
      },
    ],
    ['ancienne page de départ', completedProgress(from)],
    [
      'nombre de partitions changé',
      { ...completedProgress(next), partitions: 3, next: { ...next, queryIndex: 3 } },
    ],
    ['plan non terminé', { ...completedProgress(next), complete: false }],
  ])('refuse le deuxième succès avec %s', async (_label, progress) => {
    const finish = new Response(
      JSON.stringify({
        status: 'success',
        processed: 1,
        succeeded: 1,
        failed: 0,
        discoveryProgress: progress,
      }),
      { status: 200 },
    );
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(partial())
      .mockResolvedValueOnce(finish);
    expect(await runChartsDiscovery({ origin, secret, fetch: fetcher })).toMatchObject({
      ok: false,
      continued: true,
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it.each([{ succeeded: 2 }, { filtered: 1 }, { discoveryProgress: undefined }])(
    'ne prolonge pas un budget incohérent : %j',
    async (change) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(success())
        .mockResolvedValueOnce(partial(change));
      expect((await runChartsDiscovery({ origin, secret, fetch: fetcher })).continued).toBe(false);
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );
  it('garde le deuxième résultat partiel en échec sans troisième appel', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(partial())
      .mockResolvedValueOnce(
        partial({
          continuation: { reason: 'budget', from: next, next: { ...next, queryIndex: 2 } },
        }),
      );
    expect(await runChartsDiscovery({ origin, secret, fetch: fetcher })).toMatchObject({
      ok: false,
      continued: true,
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('tente la découverte après échec Trending et conserve cet échec global', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('fixture network'))
      .mockResolvedValueOnce(success());
    expect((await runChartsDiscovery({ origin, secret, fetch: fetcher })).ok).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('n’émet aucun appel après épuisement du budget global', async () => {
    let now = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      now = CHARTS_DISCOVERY_RUNNER_BUDGET_MS;
      return success();
    });
    const result = await runChartsDiscovery({ origin, secret, fetch: fetcher, now: () => now });
    expect(result.ok).toBe(false);
    expect(result.results.at(-1)?.reason).toBe('budget_exhausted');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('plafonne le timeout de chaque requête au budget global restant', async () => {
    let now = 0;
    const timeout = vi
      .spyOn(AbortSignal, 'timeout')
      .mockImplementation(() => new AbortController().signal);
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      now = 800_000;
      return success();
    });
    expect((await runChartsDiscovery({ origin, secret, fetch: fetcher, now: () => now })).ok).toBe(
      true,
    );
    expect(timeout.mock.calls.map(([ms]) => ms)).toEqual([
      CHARTS_DISCOVERY_REQUEST_TIMEOUT_MS,
      100_000,
    ]);
  });
  it('refuse un secret absent ou une origine non sûre avant tout appel', async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const target of [
      'http://example.test',
      'https://user:pass@example.test',
      'https://example.test/path',
      'https://example.test/?token=invalid',
    ]) {
      expect((await runChartsDiscovery({ origin: target, secret, fetch: fetcher })).ok).toBe(false);
    }
    expect((await runChartsDiscovery({ origin, secret: undefined, fetch: fetcher })).ok).toBe(
      false,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});
