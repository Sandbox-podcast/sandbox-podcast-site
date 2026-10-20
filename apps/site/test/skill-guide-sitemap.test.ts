import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/admin-persistence', () => ({ preparePublicEditorialContent: vi.fn() }));
vi.mock('../src/lib/charts-public', () => ({
  publicChartHistory: async () => [],
  publicGithubRankedProjectSlugs: async () => [],
}));
vi.mock('../src/lib/localized-content', () => ({
  publicRankingCollectionPages: async () => [],
  publicLocalizedSitePages: async () => [],
}));
vi.mock('../src/lib/repository', () => ({
  allEntities: () => [],
  allEpisodes: () => [],
  entityPath: () => '',
}));
vi.mock('../src/lib/personal-projects', () => ({ personalProjects: [] }));
vi.mock('../src/lib/badges-store', () => ({ readBadgeAwardSitemapEntries: async () => [] }));
vi.mock('../src/lib/awards-store', () => ({ readAwardSitemapEntries: async () => [] }));
vi.mock('../src/lib/time-machine', () => ({ timeMachineData: () => ({ events: [] }) }));
vi.mock('../src/lib/news-store', () => ({
  newsPublicEnabled: () => false,
  latestNewsPublicationTime: vi.fn(),
}));

import sitemap from '../src/app/sitemap';
import { skillGuidePath, skillGuides, SKILL_GUIDES_REVIEWED_AT } from '../src/domain/skill-guides';

describe('sitemap des guides documentaires', () => {
  it('annonce les guides vérifiés même sans édition live et conserve la date de revue réelle', async () => {
    const entries = await sitemap();
    for (const path of ['/guides', ...skillGuides.map((guide) => skillGuidePath(guide.slug))]) {
      const matches = entries.filter((entry) => new URL(entry.url).pathname === path);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({ lastModified: SKILL_GUIDES_REVIEWED_AT });
      expect(matches[0]).not.toHaveProperty('alternates');
    }
    expect(entries.some((entry) => entry.url.includes('/en/guides'))).toBe(false);
    expect(entries.some((entry) => new URL(entry.url).pathname === '/charts/skills')).toBe(false);
  });
});
