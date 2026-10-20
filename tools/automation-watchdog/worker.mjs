/* global Response, URL, fetch, console */
import { DurableObject } from 'cloudflare:workers';
import {
  configureAutomationWatchdogRuntime,
  runAutomationWatchdog,
} from '../../apps/site/src/pipeline/automation-watchdog.ts';

configureAutomationWatchdogRuntime();

const instanceName = 'sandbox-production';

/** Une seule instance durable sérialise les passages et conserve les réservations. */
export class SandboxAutomationWatchdog extends DurableObject {
  #tail = Promise.resolve();

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/health') {
      const report = await this.ctx.storage.get('last-report');
      const checkedAt = report?.checkedAt;
      const age = typeof checkedAt === 'string' ? Date.now() - Date.parse(checkedAt) : Infinity;
      const recent = Number.isFinite(age) && age >= -60_000 && age <= 15 * 60_000;
      const schedulerOk = recent && report?.enabled === true && report?.ok === true;
      const results = report?.results ?? [];
      const dataFresh = !schedulerOk
        ? false
        : results.length === 3 && results.every((result) => result.status === 'fresh')
          ? true
          : null;
      const ok = schedulerOk && dataFresh === true;
      return Response.json(
        {
          ok,
          schedulerOk,
          dataFresh,
          checkedAt: checkedAt ?? null,
          enabled: report?.enabled === true,
          recent,
        },
        { status: schedulerOk ? (ok ? 200 : 202) : 503, headers: { 'cache-control': 'no-store' } },
      );
    }
    if (request.method !== 'POST' || path !== '/tick')
      return new Response('Not found', { status: 404 });

    const passage = this.#tail.then(async () => {
      const report = await runAutomationWatchdog({
        enabled: this.env.ENABLED === 'true',
        dryRun: this.env.DRY_RUN !== 'false',
        token: this.env.GITHUB_ACTIONS_TOKEN,
        now: () => new Date(),
        fetch: (input, init) => fetch(input, init),
        state: {
          get: (key) => this.ctx.storage.get(key),
          put: (key, value) => this.ctx.storage.put(key, value),
        },
      });
      await this.ctx.storage.put('last-report', report);
      console.log(JSON.stringify({ event: 'sandbox-automation-check', ...report }));
      return report;
    });
    this.#tail = passage.then(
      () => undefined,
      () => undefined,
    );
    const report = await passage;
    return Response.json(report, { status: report.ok ? 200 : 503 });
  }
}

export default {
  async scheduled(_controller, env, context) {
    const stub = env.WATCHDOG.get(env.WATCHDOG.idFromName(instanceName));
    context.waitUntil(
      stub.fetch('https://watchdog.internal/tick', { method: 'POST' }).then(async (response) => {
        if (!response.ok) {
          console.error('SANDBOX automation: contrôle incomplet ; consulter le bilan persistant.');
          throw new Error('SANDBOX automation check failed.');
        }
      }),
    );
  },
  async fetch(request, env) {
    if (request.method !== 'GET' || new URL(request.url).pathname !== '/health')
      return new Response('Not found', { status: 404 });
    const stub = env.WATCHDOG.get(env.WATCHDOG.idFromName(instanceName));
    return stub.fetch('https://watchdog.internal/health');
  },
};
