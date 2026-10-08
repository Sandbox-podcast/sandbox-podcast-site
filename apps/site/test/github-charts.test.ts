import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GITHUB_CHART_CONFIG,
  closestBaseline,
  githubChartConfigSchema,
  githubMetrics,
  percentile,
  rankGithubProjects,
  rankingWeek,
  weeklyGithubMovement,
  type DailyGithubSnapshot,
  type GithubChartProject,
} from '../src/domain/github-charts.ts';

const project: GithubChartProject = {
  id: 'repo',
  entityId: 'entity',
  slug: 'repo',
  name: 'Repo',
  fullName: 'example/repo',
  description: null,
  language: null,
  category: 'Agents',
  createdAt: '2026-01-01T00:00:00Z',
  status: 'tracked',
  manualStatus: null,
  archived: false,
  fork: false,
  disabled: false,
};
const snapshot = (date: string, stars: number, forks = 100): DailyGithubSnapshot => ({
  projectId: project.id,
  date,
  stars,
  forks,
  watchers: null,
  openIssues: 0,
  contributors: null,
  commits: null,
  releases: null,
  pushedAt: `${date}T00:00:00Z`,
  collectedAt: `${date}T02:00:00Z`,
});
const config = DEFAULT_GITHUB_CHART_CONFIG;
describe('moteur GitHub réel', () => {
  it('calcule les différences observées et la croissance depuis J-7', () => {
    const metrics = githubMetrics(
      project,
      snapshot('2026-10-05', 30000, 200),
      [snapshot('2026-09-28', 20000, 100)],
      config,
    );
    expect(metrics).toMatchObject({
      stars7d: 10000,
      growthPercentage: 50,
      forks7d: 100,
      contributorsDelta: null,
      insufficientHistory: false,
      baselineDate: '2026-09-28',
    });
  });
  it('borne la tolérance sans prendre un ancien relevé ou un relevé futur', () => {
    const history = [
      snapshot('2026-09-05', 1),
      snapshot('2026-09-27', 2),
      snapshot('2026-10-07', 3),
    ];
    expect(closestBaseline(history, '2026-10-05', 7, 1)?.date).toBe('2026-09-27');
    const oldestSnapshot = history[0];
    if (!oldestSnapshot) throw new Error('Relevé de fixture absent');
    expect(closestBaseline([oldestSnapshot], '2026-10-05', 7, 1)).toBeUndefined();
  });
  it('attend pour un projet avec seulement trois jours de données', () => {
    const metrics = githubMetrics(
      project,
      snapshot('2026-10-05', 1000),
      [snapshot('2026-10-02', 800)],
      config,
    );
    expect(metrics.stars7d).toBeNull();
    expect(metrics.insufficientHistory).toBe(true);
    expect(rankGithubProjects([{ project, metrics }], config)).toEqual([]);
  });
  it("n'invente pas une croissance ou une accélération lorsque le dénominateur est zéro", () => {
    const metrics = githubMetrics(
      project,
      snapshot('2026-10-05', 1000),
      [snapshot('2026-09-28', 0), snapshot('2026-09-21', 0)],
      config,
    );
    expect(metrics.growthPercentage).toBeNull();
    expect(metrics.acceleration).toBeNull();
    expect(rankGithubProjects([{ project, metrics }], config)[0]?.score).toBeGreaterThanOrEqual(0);
  });
  it('un petit +900 % ne bat pas automatiquement 10000 stars gagnées', () => {
    const small = {
      project: { ...project, slug: 'small' },
      metrics: githubMetrics(
        project,
        snapshot('2026-10-05', 100),
        [snapshot('2026-09-28', 10)],
        config,
      ),
    };
    const large = {
      project: { ...project, slug: 'large' },
      metrics: githubMetrics(
        project,
        snapshot('2026-10-05', 30000),
        [snapshot('2026-09-28', 20000)],
        config,
      ),
    };
    const ranked = rankGithubProjects([small, large], { ...config, eligibilityStars: 0 });
    expect(small.metrics.growthPercentage).toBe(900);
    expect(ranked[0]?.project.slug).toBe('large');
  });
  it('un pic de 100000 reste borné à 100 et ne déforme pas tous les autres scores', () => {
    const input = [100, 1000, 100000].map((gain, index) => ({
      project: { ...project, slug: `repo-${index}` },
      metrics: githubMetrics(
        project,
        snapshot('2026-10-05', 20000 + gain),
        [snapshot('2026-09-28', 20000)],
        config,
      ),
    }));
    for (const entry of rankGithubProjects(input, config)) {
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(100);
      expect(entry.components['contributorActivity']).toBeNull();
      expect(entry.coverage).toBeCloseTo(0.9);
    }
    expect(percentile(1000, [100, 1000, 100000])).toBe(50);
    expect(percentile(100, [100, 100, 100])).toBe(50);
  });
  it('respecte les exclusions manuelles, les forks et les archives', () => {
    const metrics = githubMetrics(
      project,
      snapshot('2026-10-05', 30000),
      [snapshot('2026-09-28', 20000)],
      config,
    );
    for (const overridden of [
      { ...project, manualStatus: 'blocked' as const },
      { ...project, fork: true },
      { ...project, archived: true },
    ])
      expect(rankGithubProjects([{ project: overridden, metrics }], config)).toEqual([]);
  });
  it('Rising exige une accélération observée et une taille inférieure au plafond', () => {
    const history = [snapshot('2026-09-21', 1000), snapshot('2026-09-28', 1200)];
    const metrics = githubMetrics(project, snapshot('2026-10-05', 2200), history, config);
    expect(metrics.acceleration).toBe(400);
    expect(rankGithubProjects([{ project, metrics }], config, true)).toHaveLength(1);
    expect(
      rankGithubProjects([{ project, metrics: { ...metrics, stars: 30000 } }], config, true),
    ).toEqual([]);
  });
  it('calcule C +2, A -1 et D NEW depuis la semaine précédente', () => {
    const previous = [
      { entity: 'a', rank: 1 },
      { entity: 'b', rank: 2 },
      { entity: 'c', rank: 3 },
    ];
    expect(weeklyGithubMovement('c', 1, previous)).toEqual({
      previousRank: 3,
      rankChange: 2,
      status: 'rising',
    });
    expect(weeklyGithubMovement('a', 2, previous)).toMatchObject({
      rankChange: -1,
      status: 'falling',
    });
    expect(weeklyGithubMovement('d', 3, previous)).toEqual({
      previousRank: null,
      rankChange: 0,
      status: 'new',
    });
  });
  it("refuse des poids incohérents et centralise les semaines ISO de changement d'année", () => {
    expect(githubChartConfigSchema.safeParse({ momentum: { starVelocity: 2 } }).success).toBe(
      false,
    );
    expect(rankingWeek('2027-01-01')).toBe('2026-W53');
  });
});
