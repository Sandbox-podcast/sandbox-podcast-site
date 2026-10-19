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
});
