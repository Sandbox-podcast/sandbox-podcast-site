import { publishedWeeks, weeklyHighlights, type Highlight } from './repository.ts';

/** Les cartes de partage existent pour les trois dernières semaines : au-delà, la page de classement suffit. */
const RECENT = 3;

export function moveTriples(): { chart: string; week: string; entity: string }[] {
  const seen = new Set<string>();
  const out: { chart: string; week: string; entity: string }[] = [];
  for (const week of publishedWeeks().slice(0, RECENT)) {
    for (const h of weeklyHighlights(week)) {
      const key = `${h.chart.slug}/${h.week}/${h.entity.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ chart: h.chart.slug, week: h.week, entity: h.entity.slug });
      }
    }
  }
  return out;
}

/** Tous les événements d'une entité dans un classement pour une semaine (le plus marquant en premier). */
export function highlightsFor(chart: string, week: string, entity: string): Highlight[] {
  return weeklyHighlights(week).filter((h) => h.chart.slug === chart && h.entity.slug === entity);
}
