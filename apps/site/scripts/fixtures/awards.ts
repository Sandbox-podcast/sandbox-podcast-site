// Données de démonstration explicites. Importées uniquement par les scripts locaux et les tests.
import type { AwardChart, AwardEdition } from '../../src/domain/awards.ts';
export function awardFixture(
  chart: AwardChart,
  day: string,
  order = ['a', 'b', 'c'],
  identityPrefix = '',
): AwardEdition {
  const shift = (offset: number) =>
    new Date(Date.parse(day) - offset * 86400000).toISOString().slice(0, 10);
  const providers = chart === 'skills' ? ['skills-sh', 'github'] : ['arena', 'artificial-analysis'];
  const version = `${chart}-cross-source-v2`;
  const rows = order.map((id, index) => ({
    entityId: identityPrefix + id,
    githubId: chart === 'github' || chart === 'rising' ? id.charCodeAt(0) + 100 : null,
    slug: `fixture-${identityPrefix}${id}`,
    name: `FIXTURE ${identityPrefix}${id}`,
    rank: index + 1,
    score: 90 - index,
    metadata:
      chart === 'github' || chart === 'rising'
        ? {
            project: {
              entityId: identityPrefix + id,
              slug: `fixture-${identityPrefix}${id}`,
              fullName: `fixture/${id}`,
              category: id === 'c' ? 'Coding' : 'Agents',
            },
            rawMetrics: {
              stars: 1000,
              stars7d: 300,
              acceleration: 100,
              baselineDate: shift(7),
              previousBaselineDate: shift(14),
              collectedAt: `${day}T02:00:00Z`,
              insufficientHistory: false,
            },
            sourceEvidence: { score: 7, assessedOn: day },
          }
        : {
            identity: { name: `FIXTURE ${id}`, sourceUrl: `https://example.org/fixture-${id}` },
            sources: providers.map((provider) => ({
              provider,
              externalId: `fixture-${id}`,
              label: provider,
              url: `https://example.org/${provider}/fixture-${id}`,
            })),
            sourceObservedAt: [`${day}T02:00:00Z`, `${day}T02:15:00Z`],
            scoringVersion: version,
          },
  }));
  return {
    id: `${chart}-${day}`,
    chart,
    week: day,
    publishedAt: `${day}T03:00:00Z`,
    frozenAt: `${day}T03:00:00Z`,
    scoringVersion: version,
    config:
      chart === 'github' || chart === 'rising'
        ? { size: 3, minimumCandidates: 3 }
        : chart === 'skills'
          ? { size: 3, minimumSources: 2, minimumDays: 7 }
          : { size: 3, minimumQualitySources: 2, benchmarkMaximumAgeDays: 14 },
    payload: {
      chart,
      week: day,
      publishedAt: `${day}T03:00:00Z`,
      retrievedAt: `${day}T02:15:00Z`,
      provenance: 'auto',
      entries: rows.map((row) => ({
        entity: row.slug,
        rank: row.rank,
        score: row.score,
        dimensions: {},
        metrics: {},
      })),
    },
    rows,
  };
}
