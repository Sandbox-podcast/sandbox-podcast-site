import type { Content } from './load.ts';
import { compareWeeks, nextWeek } from '../domain/weeks.ts';

export interface Issue {
  level: 'error' | 'warn';
  where: string;
  message: string;
}

/** Slugs qui entreraient en collision avec une route statique. */
const RESERVED_CHART_SLUGS = new Set(['history', 'methodology']);

/**
 * Cohérence du contenu : références, continuité des snapshots, complétude éditoriale.
 * Les erreurs bloquent la CI ; les avertissements alimentent la page d'administration.
 */
export interface ValidateOptions {
  /** Mode réel : une donnée de démonstration ne doit jamais être publiée comme une mesure. */
  live?: boolean;
}

export function validateContent(content: Content, options: ValidateOptions = {}): Issue[] {
  const issues: Issue[] = [];
  const error = (where: string, message: string): void => {
    issues.push({ level: 'error', where, message });
  };
  const warn = (where: string, message: string): void => {
    issues.push({ level: 'warn', where, message });
  };

  const entities = new Map(content.entities.map((e) => [e.slug, e] as const));
  const hosts = new Set(content.hosts.map((h) => h.slug));
  const topics = new Set(content.topics.map((t) => t.slug));
  const sources = new Set(content.sources.map((s) => s.id));
  const charts = new Map(content.charts.map((c) => [c.slug, c] as const));
  const profiles = new Map(content.scoring.map((p) => [p.id, p] as const));
  const stories = new Set(content.stories.map((s) => s.slug));
  const episodes = new Set(content.episodes.map((e) => e.number));

  const duplicates = (label: string, values: string[]): void => {
    const seen = new Set<string>();
    for (const v of values) {
      if (seen.has(v)) error(label, `doublon : ${v}`);
      seen.add(v);
    }
  };
  duplicates(
    'entités',
    content.entities.map((e) => e.slug),
  );
  duplicates(
    'thèmes',
    content.topics.map((topic) => topic.slug),
  );
  duplicates(
    'sources',
    content.sources.map((source) => source.id),
  );
  duplicates(
    'classements',
    content.charts.map((c) => c.slug),
  );
  duplicates(
    'articles',
    content.stories.map((s) => s.slug),
  );
  duplicates(
    'épisodes',
    content.episodes.map((e) => String(e.number)),
  );
  duplicates(
    'vidéos YouTube',
    content.episodes.flatMap((episode) =>
      episode.platforms.youtubeId ? [episode.platforms.youtubeId] : [],
    ),
  );
  duplicates(
    'avis',
    content.takes.map((t) => t.id),
  );

  const topicRef = (where: string, list: readonly string[]): void => {
    for (const t of list) if (!topics.has(t)) error(where, `thème inconnu : ${t}`);
  };
  const entityRef = (where: string, slug: string): void => {
    if (!entities.has(slug)) error(where, `entité inconnue : ${slug}`);
  };

  for (const entity of content.entities) {
    for (const chart of entity.editorialCharts) {
      if (!charts.has(chart)) error(`entité ${entity.slug}`, `classement inconnu : ${chart}`);
    }
  }

  for (const chart of content.charts) {
    const where = `classement ${chart.slug}`;
    duplicates(
      `${where}, éditions`,
      chart.editions.map((edition) => edition.week),
    );
    for (const edition of chart.editions) {
      const editionWhere = `${where}, édition ${edition.week}`;
      if (!(content.snapshots[chart.slug] ?? []).some((snapshot) => snapshot.week === edition.week))
        error(editionWhere, 'aucun relevé pour cette semaine');
      duplicates(
        `${editionWhere}, watchlist`,
        edition.watchlist.map((item) => item.entity),
      );
      duplicates(
        `${editionWhere}, lectures`,
        edition.insights.map((item) => item.entity),
      );
      for (const item of [...edition.watchlist, ...edition.insights])
        entityRef(editionWhere, item.entity);
    }
    if (RESERVED_CHART_SLUGS.has(chart.slug)) error(where, 'slug réservé à une route');
    const profile = profiles.get(chart.scoring);
    if (!profile) {
      error(where, `profil de scoring inconnu : ${chart.scoring}`);
      continue;
    }
    const dims = new Set(profile.dimensions.map((d) => d.id));
    const keys = new Set([
      ...profile.metrics.map((m) => m.key),
      ...profile.derived.map((m) => m.key),
    ]);
    if (!dims.has(profile.primary))
      error(where, `dimension principale inconnue : ${profile.primary}`);
    for (const h of chart.highlights)
      if (!dims.has(h)) error(where, `dimension d'en-tête inconnue : ${h}`);
    for (const v of chart.views) if (!dims.has(v.id)) error(where, `vue inconnue : ${v.id}`);
    if (chart.views[0]?.id !== profile.primary)
      error(where, 'la première vue doit être la note principale');
    for (const m of chart.detailMetrics)
      if (!keys.has(m)) error(where, `métrique de détail inconnue : ${m}`);
    if (!keys.has(chart.trackedMetric))
      error(where, `métrique suivie inconnue : ${chart.trackedMetric}`);
    if (!keys.has(chart.tiebreak))
      error(where, `métrique de départage inconnue : ${chart.tiebreak}`);
    for (const m of profile.metrics)
      if (!sources.has(m.source)) error(where, `source inconnue : ${m.source}`);
    for (const s of chart.methodology.sources)
      if (!sources.has(s.source)) error(where, `source inconnue : ${s.source}`);

    // Les dimensions ne citent que les précédentes.
    const seen = new Set<string>();
    for (const dim of profile.dimensions) {
      for (const c of dim.components) {
        if (c.type === 'dimension' && !seen.has(c.dimension)) {
          error(where, `la dimension ${dim.id} cite ${c.dimension} avant sa définition`);
        }
        if (c.type === 'metric' && !keys.has(c.metric))
          error(where, `métrique inconnue : ${c.metric}`);
      }
      seen.add(dim.id);
    }
  }

  for (const entity of content.entities) {
    const where = `entité ${entity.slug}`;
    topicRef(where, entity.topics);
    for (const alt of entity.alternatives) {
      entityRef(where, alt);
      if (alt === entity.slug) error(where, "s'est choisie comme alternative");
    }
    if (entity.kind === 'model' && entity.openWeights === undefined)
      warn(where, 'openWeights non renseigné');
  }

  // Snapshots : continuité hebdomadaire, entités connues, métriques définies.
  for (const chart of content.charts) {
    const list = content.snapshots[chart.slug] ?? [];
    const profile = profiles.get(chart.scoring);
    if (list.length === 0) error(`classement ${chart.slug}`, 'aucun snapshot');
    list.forEach((snap, i) => {
      const where = `snapshot ${chart.slug} ${snap.week}`;
      if (snap.chart !== chart.slug)
        error(where, `chart ${snap.chart} dans le dossier ${chart.slug}`);
      const previous = list[i - 1];
      if (previous && nextWeek(previous.week) !== snap.week) {
        error(where, `trou entre ${previous.week} et ${snap.week}`);
      }
      if (snap.entries.length < chart.size)
        error(where, `moins de ${String(chart.size)} candidats`);
      for (const entry of snap.entries) {
        const entity = entities.get(entry.entity);
        if (!entity) error(where, `entité inconnue : ${entry.entity}`);
        else if (entity.kind !== chart.entityKind)
          error(where, `${entry.entity} n'est pas un ${chart.entityKind}`);
        else if (chart.pool === 'openWeights' && !entity.openWeights) {
          error(where, `${entry.entity} n'a pas de poids ouverts`);
        }
        if (profile && entry.dimensions[profile.primary] !== entry.score) {
          error(where, `${entry.entity} : score différent de la dimension ${profile.primary}`);
        }
      }
    });
  }

  if (options.live === true) {
    for (const chart of content.charts) {
      const mock = (content.snapshots[chart.slug] ?? []).filter((s) => s.provenance === 'mock');
      if (mock.length > 0) {
        error(
          `classement ${chart.slug}`,
          `${String(mock.length)} snapshot(s) de démonstration en mode réel (SITE_DATA_MODE=live) : régénérer avec de vraies données`,
        );
      }
    }
  }

  for (const take of content.takes) {
    const where = `avis ${take.id}`;
    entityRef(where, take.entity);
    if (!hosts.has(take.host)) error(where, `animateur inconnu : ${take.host}`);
    if ((take.chart === undefined) !== (take.week === undefined))
      error(where, 'chart et week vont ensemble');
    if (take.chart !== undefined) {
      if (!charts.has(take.chart)) error(where, `classement inconnu : ${take.chart}`);
      const snap = (content.snapshots[take.chart] ?? []).find((s) => s.week === take.week);
      if (!snap) error(where, `pas de snapshot ${take.chart} ${take.week ?? ''}`);
      else if (!snap.entries.some((e) => e.entity === take.entity)) {
        error(where, `${take.entity} absent de ${take.chart} ${snap.week}`);
      }
    }
  }

  for (const episode of content.episodes) {
    const where = `épisode ${String(episode.number)}`;
    for (const h of episode.hosts) if (!hosts.has(h)) error(where, `animateur inconnu : ${h}`);
    topicRef(where, episode.topics);
    for (const m of episode.mentions) {
      if (m.entity) entityRef(where, m.entity);
      if (!m.url) warn(where, `lien à compléter : ${m.label}`);
      if (m.at !== undefined && m.at > episode.durationSec)
        error(where, `horodatage hors durée : ${m.label}`);
    }
    for (const c of episode.chapters) {
      if (c.at > episode.durationSec) error(where, `chapitre hors durée : ${c.title}`);
    }
    for (const c of episode.charts) {
      if (!charts.has(c.chart)) error(where, `classement inconnu : ${c.chart}`);
      else if (!(content.snapshots[c.chart] ?? []).some((s) => s.week === c.week)) {
        error(where, `pas de snapshot ${c.chart} ${c.week}`);
      }
    }
    if (episode.sources.length === 0 && episode.mentions.length === 0)
      warn(where, "aucune ressource d'épisode");
    if (!episode.platforms.youtubeId && !episode.platforms.youtubeUrl)
      warn(where, 'pas de vidéo YouTube');
  }

  for (const story of content.stories) {
    const where = `article ${story.slug}`;
    if (!hosts.has(story.author)) error(where, `auteur inconnu : ${story.author}`);
    topicRef(where, story.topics);
    for (const r of story.related) {
      if (r.kind === 'entity') entityRef(where, r.entity);
      if (r.kind === 'episode' && !episodes.has(r.number))
        error(where, `épisode inconnu : ${String(r.number)}`);
      if (r.kind === 'story' && !stories.has(r.slug)) error(where, `article inconnu : ${r.slug}`);
      if (r.kind === 'chart' && !charts.has(r.chart))
        error(where, `classement inconnu : ${r.chart}`);
    }
    for (const block of story.body) {
      if (block.type === 'entity') entityRef(where, block.entity);
      if (block.type === 'chart') {
        if (!charts.has(block.chart)) error(where, `classement inconnu : ${block.chart}`);
        else if (
          block.week &&
          !(content.snapshots[block.chart] ?? []).some((s) => s.week === block.week)
        ) {
          error(where, `pas de snapshot ${block.chart} ${block.week}`);
        }
      }
      if (block.type === 'p')
        checkRefs(where, block.text, entities, stories, episodes, charts, error);
    }
  }

  // Les semaines de snapshots sont communes à tous les classements (une publication = tous les classements).
  const lastWeeks = new Set(
    content.charts.flatMap((c) => {
      const last = (content.snapshots[c.slug] ?? []).at(-1);
      return last ? [last.week] : [];
    }),
  );
  if (lastWeeks.size > 1) {
    const ordered = [...lastWeeks].sort(compareWeeks);
    warn(
      'snapshots',
      `dernières semaines différentes selon les classements : ${ordered.join(', ')}`,
    );
  }

  return issues;
}

function checkRefs(
  where: string,
  text: string,
  entities: ReadonlyMap<string, unknown>,
  stories: ReadonlySet<string>,
  episodes: ReadonlySet<number>,
  charts: ReadonlyMap<string, unknown>,
  error: (where: string, message: string) => void,
): void {
  for (const match of text.matchAll(/\[\[(entity|chart|episode|story):([a-z0-9-]+)\]\]/g)) {
    const kind = match[1];
    const id = match[2] ?? '';
    if (kind === 'entity' && !entities.has(id)) error(where, `référence inconnue : entity:${id}`);
    if (kind === 'chart' && !charts.has(id)) error(where, `référence inconnue : chart:${id}`);
    if (kind === 'story' && !stories.has(id)) error(where, `référence inconnue : story:${id}`);
    if (kind === 'episode' && !episodes.has(Number(id)))
      error(where, `référence inconnue : episode:${id}`);
  }
}
