import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { verifyNewsHealth } from '../src/domain/news-health';
const now = new Date('2026-10-19T12:00:00Z');
const feed = {
  checkedAt: now.toISOString(),
  sources: [{ name: 'Source', ok: true }],
  items: [
    {
      id: 'rundown:test',
      project: 'The Rundown AI',
      repository: 'www.therundown.ai',
      version: 'article',
      kind: 'article',
      publishedAt: '2026-10-19',
      url: 'https://www.therundown.ai/articles/test',
      category: 'models',
      prerelease: false,
    },
  ],
};
describe('fraîcheur News publique', () => {
  it('suspend les traductions sans interrompre la collecte, la rédaction française et la santé', async () => {
    const workflow = await readFile(
      new URL('../../../.github/workflows/news-refresh.yml', import.meta.url),
      'utf8',
    );
    expect(workflow).not.toMatch(/^ {2}translations:/m);
    expect(workflow).not.toContain('news-translate-pending.ts');
    expect(workflow).not.toContain('news:translator:setup');
    for (const job of ['collect', 'process', 'health']) expect(workflow).toContain(`  ${job}:`);
    const refresh = await readFile(new URL('../scripts/news-refresh.ts', import.meta.url), 'utf8');
    expect(refresh).toContain('deferTranslations: true');
  });
  it('exige une insertion confirmée pendant le cycle quand des workers ont été lancés', () => {
    const since = '2026-10-19T11:00:00Z';
    expect(verifyNewsHealth(feed, now, since).ok).toBe(false);
    expect(
      verifyNewsHealth({ ...feed, lastPublishedAt: '2026-10-19T10:59:59Z' }, now, since).ok,
    ).toBe(false);
    expect(
      verifyNewsHealth({ ...feed, lastPublishedAt: '2026-10-19T11:01:00Z' }, now, since).ok,
    ).toBe(true);
    expect(
      verifyNewsHealth({ ...feed, lastPublishedAt: now.toISOString() }, now, 'invalid').ok,
    ).toBe(false);
  });
  it('conserve un planning horaire, son activation explicite et des passages sans annulation', async () => {
    const workflow = await readFile(
      new URL('../../../.github/workflows/news-refresh.yml', import.meta.url),
      'utf8',
    );
    const schedules = [...workflow.matchAll(/cron:\s*'([^']+)'/gu)].map((match) => match[1]);
    expect(schedules).toHaveLength(1);
    expect(schedules[0]).toMatch(/^(?:[1-9]|[1-5]\d) \* \* \* \*$/u);
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain(
      "github.ref == 'refs/heads/main' && vars.SANDBOX_NEWS_PUBLIC == 'true'",
    );
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('timeout-minutes: 45');
  });
  it('livre les scripts Node appelés par le workflow horaire', async () => {
    const workflow = await readFile(
      new URL('../../../.github/workflows/news-refresh.yml', import.meta.url),
      'utf8',
    );
    const paths = [
      ...workflow.matchAll(/run:\s+node\s+(apps\/site\/scripts\/[\w.-]+\.ts)\b/gu),
    ].map((match) => match[1]);
    expect(paths).toContain('apps/site/scripts/news-health.ts');
    for (const path of paths) {
      await expect(readFile(new URL(`../../../${path}`, import.meta.url), 'utf8')).resolves.toMatch(
        /\S/u,
      );
    }
  });
  it('refuse une collecte ancienne même si les anciens articles restent lisibles', () => {
    expect(verifyNewsHealth({ ...feed, checkedAt: '2026-10-19T08:00:00Z' }, now).ok).toBe(false);
    expect(verifyNewsHealth(feed, now).ok).toBe(true);
  });
  it('distingue un flux invalide, vide, et des sources toutes indisponibles', () => {
    expect(verifyNewsHealth({}, now).ok).toBe(false);
    expect(verifyNewsHealth({ ...feed, items: [] }, now).ok).toBe(false);
    expect(verifyNewsHealth({ ...feed, sources: [{ name: 'Source', ok: false }] }, now).ok).toBe(
      false,
    );
  });
  it('signale un fil ancien même après une collecte et une insertion récentes', () => {
    const value = {
      ...feed,
      lastPublishedAt: now.toISOString(),
      items: [{ ...feed.items[0], publishedAt: '2026-10-17T12:00:00Z' }],
    };
    expect(verifyNewsHealth(value, now)).toMatchObject({
      ok: false,
      latestArticleAt: '2026-10-17T12:00:00.000Z',
    });
  });
  it('accepte la limite de 36 heures et refuse son dépassement et les dates futures', () => {
    const value = (date: string) => ({ ...feed, items: [{ ...feed.items[0], publishedAt: date }] });
    expect(verifyNewsHealth(value('2026-10-18T00:00:00Z'), now).ok).toBe(true);
    expect(verifyNewsHealth(value('2026-10-17T23:59:59Z'), now).ok).toBe(false);
    expect(verifyNewsHealth(value('2026-10-19T12:06:00Z'), now).ok).toBe(false);
  });
  it('cherche le dernier article dans tout le lot sans dépendre de son ordre', () => {
    expect(
      verifyNewsHealth(
        {
          ...feed,
          items: [
            { ...feed.items[0], publishedAt: '2026-10-17T12:00:00Z' },
            { ...feed.items[0], id: 'rundown:recent', publishedAt: '2026-10-19T11:00:00Z' },
          ],
        },
        now,
      ),
    ).toMatchObject({ ok: true, latestArticleAt: '2026-10-19T11:00:00.000Z' });
  });
});
