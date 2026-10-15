import { z } from 'zod';
import {
  awardSunday,
  awardWeekSchema,
  parisDate,
  risingStarWinner,
  escapeBadgeText,
  type AwardSource,
} from './badges.ts';
import { chartCategorySchema, githubChartConfigSchema } from './github-charts.ts';
import { externalSourceRefSchema } from './external-charts.ts';
import { snapshotSchema, slugSchema } from './schema.ts';
import { compareWeeks, isCalendarEdition, isoWeekOf, previousWeek, weekStart } from './weeks.ts';
import { validAwardReference } from './award-reference.ts';

export const awardTypeSchema = z.enum([
  'rising-star',
  'github-category',
  'biggest-mover',
  'rookie-month',
  'skill-week',
  'best-model',
  'annual',
]);
export type AwardType = z.infer<typeof awardTypeSchema>;
export const awardChartSchema = z.enum(['github', 'rising', 'skills', 'models']);
export type AwardChart = z.infer<typeof awardChartSchema>;
export const AWARD_DEFINITIONS = {
  'rising-star': {
    name: 'Sandbox Rising Star',
    label: 'RISING STAR',
    periodKind: 'week',
    chart: 'rising',
    rule: 'rising-sunday-v1',
  },
  'github-category': {
    name: 'GitHub #1 Category',
    label: '#1 CATEGORY',
    periodKind: 'week',
    chart: 'github',
    rule: 'category-sunday-v1',
  },
  'biggest-mover': {
    name: 'Biggest Mover',
    label: 'BIGGEST MOVER',
    periodKind: 'week',
    chart: 'github',
    rule: 'mover-sunday-v1',
  },
  'rookie-month': {
    name: 'Rookie of the Month',
    label: 'ROOKIE OF THE MONTH',
    periodKind: 'month',
    chart: 'rising',
    rule: 'rookie-month-v1',
  },
  'skill-week': {
    name: 'Skill of the Week',
    label: 'SKILL OF THE WEEK',
    periodKind: 'week',
    chart: 'skills',
    rule: 'skill-sunday-v1',
  },
  'best-model': {
    name: 'Best AI Model',
    label: 'BEST AI MODEL',
    periodKind: 'week',
    chart: 'models',
    rule: 'model-sunday-v1',
  },
  annual: {
    name: 'Sandbox Annual Awards',
    label: 'ANNUAL AWARDS',
    periodKind: 'year',
    chart: 'all',
    rule: 'annual-first-places-v1',
  },
} as const;
export const monthPeriodSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
export const yearPeriodSchema = z.string().regex(/^20\d{2}$/);
export const awardAssignmentIdSchema = z.uuid();
export const AWARD_CAMPAIGNS = {
  'rising-star': 'rising_star',
  'github-category': 'github_category',
  'biggest-mover': 'biggest_mover',
  'rookie-month': 'rookie_month',
  'skill-week': 'skill_week',
  'best-model': 'best_model',
  annual: 'annual',
} as const;
export const AWARD_RULE_DESCRIPTIONS = {
  'rising-star':
    'Premier du classement Rising du dimanche, après clôture de la semaine dans le fuseau Europe/Paris.',
  'github-category':
    "Projet le mieux classé de sa catégorie dans l'édition GitHub du dimanche. Une distinction par catégorie présente dans cette édition.",
  'biggest-mover':
    "Plus forte progression positive de rang entre deux éditions GitHub du dimanche consécutives. Les nouveaux entrants sont exclus ; une égalité est départagée par le rang final, puis l'identifiant stable.",
  'rookie-month':
    "Projet avec le plus de premières places Rising parmi tous les dimanches du mois civil. Une égalité est départagée par le rang du dernier dimanche, puis l'identifiant stable. Un mois incomplet ne donne aucun lauréat.",
  'skill-week':
    "Première skill de l'édition officielle du dimanche, corroborée par skills.sh et GitHub, après clôture de la semaine.",
  'best-model':
    "Premier modèle de l'édition officielle du dimanche, corroborée par Arena et Artificial Analysis, après clôture de la semaine.",
  annual:
    "Un lauréat par classement : GitHub, Rising, Skills et Models. Le plus de premières places sur tous les dimanches de l'année ISO ; égalité départagée par le dernier rang, puis l'identifiant stable. Aucun prix sans historique complet.",
} as const satisfies Record<AwardType, string>;

export function awardPeriod(type: AwardType, value: string): string {
  const kind = AWARD_DEFINITIONS[type].periodKind;
  return (
    kind === 'week' ? awardWeekSchema : kind === 'month' ? monthPeriodSchema : yearPeriodSchema
  ).parse(value);
}
export function categoryAwardScope(category: string): string {
  return chartCategorySchema.parse(category).toLowerCase().replaceAll(' ', '-');
}
export function awardScope(type: AwardType, value = ''): string {
  if (type === 'annual') return awardChartSchema.parse(value);
  if (type === 'github-category') {
    if (!chartCategorySchema.options.map(categoryAwardScope).includes(value))
      throw new Error('Catégorie inconnue.');
    return value;
  }
  if (value !== '') throw new Error('Cette distinction ne prend pas de catégorie.');
  return '';
}
export function awardPeriodBounds(type: AwardType, period: string) {
  awardPeriod(type, period);
  const kind = AWARD_DEFINITIONS[type].periodKind;
  if (kind === 'week')
    return { start: weekStart(period).toISOString().slice(0, 10), end: awardSunday(period) };
  if (kind === 'month') {
    const start = `${period}-01`;
    const end = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5)), 0))
      .toISOString()
      .slice(0, 10);
    return { start, end };
  }
  const last = awardWeekSchema.safeParse(`${period}-W53`).success
    ? `${period}-W53`
    : `${period}-W52`;
  return { start: weekStart(`${period}-W01`).toISOString().slice(0, 10), end: awardSunday(last) };
}
export function requiredAwardSundays(type: AwardType, period: string): string[] {
  const { start, end } = awardPeriodBounds(type, period);
  const days: string[] = [];
  for (let at = Date.parse(start); at <= Date.parse(end); at += 86400000) {
    const date = new Date(at);
    if (date.getUTCDay() === 0) days.push(date.toISOString().slice(0, 10));
  }
  return days;
}
export function awardPeriodForDate(type: AwardType, day: string): string {
  const date = new Date(`${z.iso.date().parse(day)}T12:00:00Z`);
  const kind = AWARD_DEFINITIONS[type].periodKind;
  return awardPeriod(
    type,
    kind === 'week'
      ? isoWeekOf(date)
      : kind === 'month'
        ? day.slice(0, 7)
        : isoWeekOf(date).slice(0, 4),
  );
}

export interface AwardNominee {
  entityId: string;
  githubId: number | null;
  slug: string;
  name: string;
  rank: number;
  score: number;
  metadata: unknown;
}
export interface AwardEdition extends AwardSource {
  chart: AwardChart;
  rows: readonly AwardNominee[];
  excluded?: boolean;
}
export interface AwardSelection {
  type: AwardType;
  period: string;
  scope: string;
  chart: AwardChart;
  nominee: AwardNominee;
  source: AwardEdition;
  sources: readonly AwardEdition[];
  facts: { firstPlaces?: number; rankGain?: number; previousRank?: number; category?: string };
}

const githubProofSchema = z.object({
  project: z.object({
    entityId: z.string().min(1),
    slug: slugSchema,
    category: chartCategorySchema,
  }),
  rawMetrics: z.object({
    collectedAt: z.iso.datetime(),
    baselineDate: z.iso.date(),
    insufficientHistory: z.literal(false),
  }),
  sourceEvidence: z.object({ score: z.number().min(0).max(10), assessedOn: z.iso.date() }),
});
const externalProofSchema = z.object({
  identity: z.object({
    name: z.string().min(1),
    sourceUrl: z.url().refine((url) => url.startsWith('https://')),
  }),
  sources: z.array(externalSourceRefSchema).min(2),
  sourceObservedAt: z.array(z.iso.datetime()).min(2),
  scoringVersion: z.string(),
});
const externalConfigSchema = z.object({ size: z.number().int().min(3).max(100) });
const skillConfigSchema = externalConfigSchema.extend({
  minimumSources: z.number().int().min(2),
  minimumDays: z.number().int().min(7),
});
const modelConfigSchema = externalConfigSchema.extend({
  minimumQualitySources: z.number().int().min(2),
  benchmarkMaximumAgeDays: z.number().int().min(1).max(14),
});

/** Valide la source et ses lignes sans recalculer aucun score. */
export function validAwardEdition(edition: AwardEdition, now: Date): boolean {
  const payload = snapshotSchema.safeParse(edition.payload);
  const day = edition.week.slice(0, 10);
  if (
    !payload.success ||
    edition.excluded ||
    !isCalendarEdition(edition.week) ||
    new Date(`${day}T12:00:00Z`).getUTCDay() !== 0 ||
    !edition.publishedAt
  )
    return false;
  if (
    (edition.scoringVersion !== `${edition.chart}-cross-source-v2` &&
      !validAwardReference(edition, payload.data.entries)) ||
    payload.data.chart !== edition.chart ||
    payload.data.week !== edition.week ||
    payload.data.provenance !== 'auto'
  )
    return false;
  if (
    ![
      edition.publishedAt,
      edition.frozenAt,
      payload.data.publishedAt,
      payload.data.retrievedAt,
    ].every((date) => Number.isFinite(Date.parse(date)) && Date.parse(date) <= now.getTime())
  )
    return false;
  if (
    parisDate(new Date(payload.data.retrievedAt)) !== day ||
    payload.data.entries.length !== edition.rows.length ||
    !edition.rows.length
  )
    return false;
  if (
    new Set(edition.rows.map((row) => row.entityId)).size !== edition.rows.length ||
    new Set(edition.rows.map((row) => row.slug)).size !== edition.rows.length ||
    new Set(edition.rows.map((row) => row.rank)).size !== edition.rows.length
  )
    return false;
  if (
    (edition.chart === 'github' || edition.chart === 'rising') &&
    new Set(edition.rows.map((row) => row.githubId)).size !== edition.rows.length
  )
    return false;
  for (const row of edition.rows) {
    const entry = payload.data.entries.find((candidate) => candidate.entity === row.slug);
    if (
      entry?.rank !== row.rank ||
      entry.score !== row.score ||
      !Number.isFinite(row.score) ||
      row.score < 0 ||
      row.score > 100
    )
      return false;
    if (edition.chart === 'github' || edition.chart === 'rising') {
      if (row.githubId === null || !Number.isSafeInteger(row.githubId) || row.githubId <= 0)
        return false;
      const proof = githubProofSchema.safeParse(row.metadata);
      const config = githubChartConfigSchema.safeParse(edition.config);
      if (
        !proof.success ||
        !config.success ||
        proof.data.project.entityId !== row.entityId ||
        proof.data.project.slug !== row.slug ||
        parisDate(new Date(proof.data.rawMetrics.collectedAt)) !== day
      )
        return false;
      const baselineAge =
        (Date.parse(day) - Date.parse(proof.data.rawMetrics.baselineDate)) / 86400000;
      const assessmentAge =
        (Date.parse(day) - Date.parse(proof.data.sourceEvidence.assessedOn)) / 86400000;
      if (
        Math.abs(baselineAge - 7) > config.data.toleranceDays ||
        assessmentAge < 0 ||
        assessmentAge > 14
      )
        return false;
    } else if (edition.scoringVersion === `${edition.chart}-cross-source-v2`) {
      const proof = externalProofSchema.safeParse(row.metadata);
      const config = (edition.chart === 'skills' ? skillConfigSchema : modelConfigSchema).safeParse(
        edition.config,
      );
      if (
        !proof.success ||
        !config.success ||
        proof.data.scoringVersion !== edition.scoringVersion ||
        edition.rows.length < config.data.size
      )
        return false;
      const providers = new Set(proof.data.sources.map((source) => source.provider));
      const required =
        edition.chart === 'skills'
          ? (['skills-sh', 'github'] as const)
          : (['arena', 'artificial-analysis'] as const);
      if (
        !required.every((provider) => providers.has(provider)) ||
        !proof.data.sourceObservedAt.every(
          (at) => parisDate(new Date(at)) === day && Date.parse(at) <= now.getTime(),
        )
      )
        return false;
    }
  }
  if (edition.chart === 'rising') {
    const nominees = edition.rows.flatMap((row) =>
      row.githubId === null ? [] : [{ ...row, githubId: row.githubId }],
    );
    if (!risingStarWinner(edition, nominees, isoWeekOf(new Date(`${day}T12:00:00Z`)), now))
      return false;
  }
  return true;
}

function completePeriod(
  type: AwardType,
  period: string,
  chart: AwardChart,
  editions: readonly AwardEdition[],
  now: Date,
): AwardEdition[] | null {
  if (parisDate(now) <= awardPeriodBounds(type, period).end) return null;
  const result: AwardEdition[] = [];
  for (const day of requiredAwardSundays(type, period)) {
    const found = editions
      .filter((edition) => edition.chart === chart && edition.week.slice(0, 10) === day)
      .toSorted((a, b) => compareWeeks(b.week, a.week));
    if (!found[0] || found[1]?.week === found[0].week || !validAwardEdition(found[0], now))
      return null;
    result.push(found[0]);
  }
  return result.length ? result : null;
}
function firstPlaceChampion(
  sources: readonly AwardEdition[],
): { nominee: AwardNominee; source: AwardEdition; firstPlaces: number } | null {
  const last = sources.at(-1);
  if (!last) return null;
  const counts = new Map<string, number>();
  for (const source of sources) {
    const winner = source.rows.find((row) => row.rank === 1);
    if (!winner) return null;
    counts.set(winner.entityId, (counts.get(winner.entityId) ?? 0) + 1);
  }
  const lastRanks = new Map(last.rows.map((row) => [row.entityId, row.rank]));
  const [id] = [...counts.keys()].toSorted(
    (a, b) =>
      (counts.get(b) ?? 0) - (counts.get(a) ?? 0) ||
      (lastRanks.get(a) ?? Infinity) - (lastRanks.get(b) ?? Infinity) ||
      (a < b ? -1 : a > b ? 1 : 0),
  );
  if (!id) return null;
  const source = [...sources]
    .reverse()
    .find((edition) => edition.rows.some((row) => row.entityId === id));
  const nominee = source?.rows.find((row) => row.entityId === id);
  return source && nominee ? { source, nominee, firstPlaces: counts.get(id) ?? 0 } : null;
}

/** Règles déterministes fondées sur les rangs officiels et un historique complet. */
export function selectAwardWinners(
  type: AwardType,
  period: string,
  editions: readonly AwardEdition[],
  now: Date,
  requestedScope?: string,
): AwardSelection[] {
  awardPeriod(type, period);
  if (requestedScope !== undefined) awardScope(type, requestedScope);
  const definition = AWARD_DEFINITIONS[type];
  const charts: readonly AwardChart[] =
    definition.chart === 'all' ? awardChartSchema.options : [definition.chart];
  const selections: AwardSelection[] = [];
  for (const chart of charts) {
    if (type === 'annual' && requestedScope && chart !== awardScope(type, requestedScope)) continue;
    const sources = completePeriod(type, period, chart, editions, now);
    const source = sources?.at(-1);
    if (!sources || !source) continue;
    const add = (
      nominee: AwardNominee,
      scope = '',
      facts: AwardSelection['facts'] = {},
      anchor = source,
      proofSources: readonly AwardEdition[] = sources,
    ) =>
      selections.push({
        type,
        period,
        scope,
        chart,
        nominee,
        source: anchor,
        sources: proofSources,
        facts,
      });
    if (type === 'github-category') {
      const seen = new Set<string>();
      for (const row of [...source.rows].sort((a, b) => a.rank - b.rank)) {
        const category = githubProofSchema.parse(row.metadata).project.category;
        const scope = categoryAwardScope(category);
        if (seen.has(scope) || (requestedScope && scope !== awardScope(type, requestedScope)))
          continue;
        seen.add(scope);
        add(row, scope, { category });
      }
    } else if (type === 'biggest-mover') {
      const previous = completePeriod(type, previousWeek(period), chart, editions, now)?.[0];
      if (!previous) continue;
      const previousRanks = new Map(previous.rows.map((row) => [row.entityId, row.rank]));
      const movers = source.rows
        .flatMap((row) => {
          const rank = previousRanks.get(row.entityId);
          return rank !== undefined && rank > row.rank
            ? [{ row, gain: rank - row.rank, previousRank: rank }]
            : [];
        })
        .sort(
          (a, b) =>
            b.gain - a.gain ||
            a.row.rank - b.row.rank ||
            (a.row.entityId < b.row.entityId ? -1 : 1),
        );
      const best = movers[0];
      if (best)
        add(best.row, '', { rankGain: best.gain, previousRank: best.previousRank }, source, [
          previous,
          source,
        ]);
    } else if (type === 'rookie-month' || type === 'annual') {
      const champion = firstPlaceChampion(sources);
      if (champion)
        add(
          champion.nominee,
          type === 'annual' ? chart : '',
          { firstPlaces: champion.firstPlaces },
          champion.source,
        );
    } else {
      const first = source.rows.find((row) => row.rank === 1);
      if (first) add(first);
    }
  }
  return selections;
}

export function candidateAwardPeriods(
  type: AwardType,
  editions: readonly AwardEdition[],
  now: Date,
): string[] {
  return [
    ...new Set(
      editions
        .filter(
          (source) => isCalendarEdition(source.week) && source.week.slice(0, 10) <= parisDate(now),
        )
        .flatMap((source) => {
          const date = new Date(`${source.week.slice(0, 10)}T12:00:00Z`);
          const kind = AWARD_DEFINITIONS[type].periodKind;
          const period =
            kind === 'week'
              ? isoWeekOf(date)
              : kind === 'month'
                ? source.week.slice(0, 7)
                : isoWeekOf(date).slice(0, 4);
          const parsed = (
            kind === 'week'
              ? awardWeekSchema
              : kind === 'month'
                ? monthPeriodSchema
                : yearPeriodSchema
          ).safeParse(period);
          return parsed.success ? [parsed.data] : [];
        }),
    ),
  ]
    .filter((period) => parisDate(now) > awardPeriodBounds(type, period).end)
    .sort();
}
export function assignedAwardPath(id: string): string {
  return `/charts/awards/edition/${awardAssignmentIdSchema.parse(id)}`;
}
export function assignedAwardBadgePath(id: string): string {
  return `/badges/awards/${awardAssignmentIdSchema.parse(id)}.svg`;
}
export function assignedAwardImagePath(id: string): string {
  return `/api/awards/edition/${awardAssignmentIdSchema.parse(id)}/image`;
}
export function assignedAwardShare(
  origin: string,
  award: { id: string; type: AwardType; period: string; name: string },
) {
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password)
    throw new Error('Origine du site invalide.');
  const url = new URL(assignedAwardPath(award.id), base.origin).href;
  return {
    url,
    image: new URL(assignedAwardImagePath(award.id), base.origin).href,
    text: `${award.name} - ${AWARD_DEFINITIONS[award.type].name} ${awardPeriod(award.type, award.period)}\n${url}`,
  };
}

export function awardEntityPath(award: { chart: AwardChart; slug: string }): string {
  return `/charts/${award.chart === 'github' || award.chart === 'rising' ? 'project' : 'entity'}/${slugSchema.parse(award.slug)}`;
}
export function awardSourcePath(award: { chart: AwardChart; sourceEdition: string }): string {
  if (!isCalendarEdition(award.sourceEdition)) throw new Error('Édition source invalide.');
  return `/charts/${award.chart === 'models' ? 'ai-models' : award.chart}/${encodeURIComponent(award.sourceEdition)}`;
}

/** Un identifiant d'attribution stable, y compris pour les entités sans dépôt GitHub. */
export function assignedAwardSnippets(
  origin: string,
  award: {
    id: string;
    type: AwardType;
    chart: AwardChart;
    period: string;
    scope: string;
    slug: string;
    name: string;
  },
) {
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password)
    throw new Error('Origine du site invalide.');
  const image = new URL(assignedAwardBadgePath(award.id), base.origin).href;
  const target = new URL(awardEntityPath(award), base.origin);
  target.searchParams.set('utm_source', 'sandbox_badge');
  target.searchParams.set('utm_medium', 'badge');
  target.searchParams.set('utm_campaign', award.type.replaceAll('-', '_'));
  target.hash = `award-${awardAssignmentIdSchema.parse(award.id)}`;
  const alt = `${award.name}: ${AWARD_DEFINITIONS[award.type].name}${award.scope ? ` (${awardScope(award.type, award.scope)})` : ''} ${awardPeriod(award.type, award.period)}`;
  const markdownAlt = alt
    .replaceAll('\\', '\\\\')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replace(/[\r\n]/g, ' ');
  return {
    image,
    target: target.href,
    alt,
    markdown: `[![${markdownAlt}](${image})](${target.href})`,
    html: `<a href="${escapeBadgeText(target.href)}"><img src="${escapeBadgeText(image)}" alt="${escapeBadgeText(alt)}" /></a>`,
  };
}
