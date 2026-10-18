import { compareWeeks } from './weeks.ts';

export interface PublishedChartEdition {
  chart: string;
  week: string;
  entries: readonly { entity: string; rank: number }[];
}

export interface ChartSearchEntity {
  slug: string;
  name: string;
  description: string | null;
  organization: string | null;
  href: string;
}

export interface ChartSearchHit {
  slug: string;
  name: string;
  description: string | null;
  detail: string;
  href: string;
  rank: number;
  terms: readonly string[];
}

const CHART_NAMES: Record<string, string> = {
  github: 'GitHub',
  rising: 'Rising',
  skills: 'Skills',
  models: 'Models',
};

/** Une fiche par dépôt ou modèle, prise dans la dernière édition publiée de chaque classement. */
export function currentChartSearchHits(
  editions: readonly PublishedChartEdition[],
  entities: readonly ChartSearchEntity[],
): ChartSearchHit[] {
  const latest = new Map<string, PublishedChartEdition>();
  for (const edition of editions) {
    const current = latest.get(edition.chart);
    if (!current || compareWeeks(edition.week, current.week) > 0)
      latest.set(edition.chart, edition);
  }
  const bySlug = new Map(entities.map((entity) => [entity.slug, entity]));
  const chosen = new Map<string, { rank: number; chart: string }>();
  for (const edition of latest.values()) {
    for (const entry of edition.entries) {
      const previous = chosen.get(entry.entity);
      if (!previous || entry.rank < previous.rank)
        chosen.set(entry.entity, { rank: entry.rank, chart: edition.chart });
    }
  }
  return [...chosen.entries()]
    .flatMap(([slug, place]) => {
      const entity = bySlug.get(slug);
      if (!entity) return [];
      const chartName = CHART_NAMES[place.chart] ?? place.chart;
      const detail = [chartName, `#${String(place.rank)}`, entity.organization]
        .filter((part): part is string => part !== null && part !== '')
        .join(' · ');
      return [
        {
          slug,
          name: entity.name,
          description: entity.description,
          detail,
          href: entity.href,
          rank: place.rank,
          terms: [entity.name, entity.description, entity.organization, slug, chartName].filter(
            (term): term is string => term !== null && term.length > 0,
          ),
        },
      ];
    })
    .toSorted((left, right) => left.rank - right.rank || left.name.localeCompare(right.name, 'fr'));
}
