import { z } from 'zod';
import { snapshotSchema, slugSchema } from './schema.ts';
import { isCalendarEdition, isoWeekOf, weekEnd, weekStart } from './weeks.ts';
import { validAwardReference } from './award-reference.ts';
import { githubChartConfigSchema } from './github-charts.ts';

export const BADGE_DEFINITIONS = {
  'github-top-100': { name: 'Sandbox Top 100', kind: 'ranking', chart: 'github' },
  'rising-star': { name: 'Sandbox Rising Star', kind: 'award', chart: 'rising' },
} as const;
export type BadgeId = keyof typeof BADGE_DEFINITIONS;
export const RISING_STAR_RULE = 'rising-sunday-v1';
export const RANK_MAX_AGE_MS = 48 * 60 * 60 * 1000;
export const githubBadgeIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,15}$/)
  .refine((id) => Number.isSafeInteger(Number(id)));
export const awardWeekSchema = z
  .string()
  .regex(/^20\d{2}-W(0[1-9]|[1-4]\d|5[0-3])$/)
  .pipe(z.string().refine((id) => isoWeekOf(weekStart(id)) === id, 'Semaine ISO inexistante.'));

export function parisDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function parisWeek(now: Date): string {
  return isoWeekOf(new Date(`${parisDate(now)}T12:00:00Z`));
}
export function awardSunday(week: string): string {
  return weekEnd(awardWeekSchema.parse(week)).toISOString().slice(0, 10);
}

export interface RankingEligibility {
  status: 'ranked' | 'unranked' | 'stale' | 'pending' | 'unavailable';
  rank: number | null;
  edition: string | null;
  asOf: string | null;
}
export const emptyRanking = (status: RankingEligibility['status']): RankingEligibility => ({
  status,
  rank: null,
  edition: null,
  asOf: null,
});

/** Lit uniquement un résultat officiel. Le score n'est jamais recalculé ici. */
export function rankingEligibility(
  payload: unknown,
  slug: string,
  now: Date,
  available = true,
): RankingEligibility {
  if (payload === null) return emptyRanking('pending');
  const parsed = snapshotSchema.safeParse(payload);
  if (!parsed.success || parsed.data.chart !== 'github' || parsed.data.provenance !== 'auto')
    return emptyRanking('unavailable');
  const snapshot = parsed.data;
  const age = now.getTime() - Date.parse(snapshot.retrievedAt);
  if (age < 0 || age >= RANK_MAX_AGE_MS)
    return { ...emptyRanking('stale'), edition: snapshot.week, asOf: snapshot.retrievedAt };
  const entry = snapshot.entries.find((item) => item.entity === slug);
  const rank = available && entry && entry.rank >= 1 && entry.rank <= 100 ? entry.rank : null;
  return {
    status: rank === null ? 'unranked' : 'ranked',
    rank,
    edition: snapshot.week,
    asOf: snapshot.retrievedAt,
  };
}

export const risingEvidenceSchema = z.object({
  rawMetrics: z.object({
    stars: z.number().int().nonnegative(),
    stars7d: z.number(),
    acceleration: z.number().positive(),
    baselineDate: z.iso.date(),
    previousBaselineDate: z.iso.date(),
    collectedAt: z.iso.datetime(),
    insufficientHistory: z.literal(false),
  }),
  sourceEvidence: z.object({ score: z.number().min(0).max(10), assessedOn: z.iso.date() }),
  project: z.object({ entityId: z.string().min(1), slug: slugSchema, fullName: z.string().min(1) }),
});
export interface AwardSource {
  id: string;
  week: string;
  chart: string;
  publishedAt: string | null;
  frozenAt: string;
  scoringVersion: string;
  config: unknown;
  payload: unknown;
}
export interface AwardCandidate {
  entityId: string;
  githubId: number;
  slug: string;
  name: string;
  rank: number;
  score: number;
  metadata: unknown;
}

/** Le rang figé départage déjà score, stars gagnées, puis slug. Aucun second score. */
export function risingStarWinner(
  source: AwardSource,
  candidates: readonly AwardCandidate[],
  week: string,
  now: Date,
): AwardCandidate | null {
  if (!awardWeekSchema.safeParse(week).success || week >= parisWeek(now)) return null;
  const sunday = awardSunday(week);
  if (
    source.chart !== 'rising' ||
    !isCalendarEdition(source.week) ||
    source.week.slice(0, 10) !== sunday ||
    !source.publishedAt ||
    Date.parse(source.publishedAt) > now.getTime() ||
    Date.parse(source.frozenAt) > now.getTime()
  )
    return null;
  const snapshot = snapshotSchema.safeParse(source.payload);
  if (
    !snapshot.success ||
    snapshot.data.chart !== 'rising' ||
    snapshot.data.week !== source.week ||
    snapshot.data.provenance !== 'auto' ||
    parisDate(new Date(snapshot.data.retrievedAt)) !== sunday
  )
    return null;
  if (
    source.scoringVersion !== 'rising-cross-source-v2' &&
    !validAwardReference(source, snapshot.data.entries)
  )
    return null;
  if (
    snapshot.data.entries.length !== candidates.length ||
    candidates.length === 0 ||
    new Set(candidates.map((item) => item.entityId)).size !== candidates.length ||
    new Set(candidates.map((item) => item.githubId)).size !== candidates.length ||
    new Set(candidates.map((item) => item.rank)).size !== candidates.length
  )
    return null;
  for (const candidate of candidates) {
    const entry = snapshot.data.entries.find((item) => item.entity === candidate.slug);
    if (
      entry?.rank !== candidate.rank ||
      entry.score !== candidate.score ||
      !Number.isSafeInteger(candidate.githubId) ||
      candidate.githubId <= 0
    )
      return null;
  }
  const winner = candidates.find((item) => item.rank === 1);
  if (!winner) return null;
  const proof = risingEvidenceSchema.safeParse(winner.metadata);
  const config = githubChartConfigSchema.safeParse(source.config);
  if (!config.success) return null;
  if (
    !proof.success ||
    proof.data.project.entityId !== winner.entityId ||
    proof.data.project.slug !== winner.slug ||
    proof.data.rawMetrics.previousBaselineDate >= proof.data.rawMetrics.baselineDate ||
    proof.data.rawMetrics.baselineDate >= sunday ||
    parisDate(new Date(proof.data.rawMetrics.collectedAt)) !== sunday ||
    proof.data.sourceEvidence.assessedOn > sunday ||
    Date.parse(sunday) - Date.parse(proof.data.sourceEvidence.assessedOn) > 14 * 86400000
  )
    return null;
  const { rawMetrics } = proof.data;
  if (
    rawMetrics.stars > config.data.maximumRisingStars ||
    Math.abs((Date.parse(sunday) - Date.parse(rawMetrics.baselineDate)) / 86400000 - 7) >
      config.data.toleranceDays ||
    Math.abs(
      (Date.parse(rawMetrics.baselineDate) - Date.parse(rawMetrics.previousBaselineDate)) /
        86400000 -
        7,
    ) > config.data.toleranceDays
  )
    return null;
  return winner;
}

export function escapeBadgeText(value: string): string {
  return Array.from(value)
    .filter((character) => character.charCodeAt(0) >= 32 || ['\t', '\n', '\r'].includes(character))
    .join('')
    .replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ??
        character,
    );
}
export type BadgeVisual =
  | { kind: 'ranking'; eligibility: RankingEligibility }
  | { kind: 'award'; week: string; status: 'awarded' | 'missing' | 'withdrawn' | 'unavailable' }
  | {
      kind: 'distinction';
      label: string;
      period: string;
      scope?: string;
      status: 'awarded' | 'missing' | 'withdrawn' | 'unavailable';
    };

/** Triangle repris de app/icon.svg. Textes bornés, sans ressources ni scripts externes. */
export function badgeSvg(visual: BadgeVisual): string {
  const awarded = visual.kind !== 'ranking' && visual.status === 'awarded';
  const ranked = visual.kind === 'ranking' && visual.eligibility.status === 'ranked';
  const height = awarded ? 40 : 30;
  const message =
    visual.kind !== 'ranking'
      ? awarded
        ? visual.kind === 'award'
          ? `RISING STAR  ${visual.week}`
          : `${visual.label.slice(0, 40)}${visual.scope ? `  ${visual.scope.slice(0, 40).toUpperCase()}` : ''}  ${visual.period.slice(0, 10)}`
        : visual.status === 'withdrawn'
          ? 'AWARD WITHDRAWN'
          : visual.status === 'unavailable'
            ? 'DATA UNAVAILABLE'
            : 'NO AWARD'
      : ranked
        ? `GITHUB AI  TOP 100  #${visual.eligibility.rank}`
        : visual.eligibility.status === 'stale'
          ? 'GITHUB AI  DATA OUTDATED'
          : visual.eligibility.status === 'unavailable'
            ? 'GITHUB AI  DATA UNAVAILABLE'
            : visual.eligibility.status === 'pending'
              ? 'GITHUB AI  AWAITING DATA'
              : 'GITHUB AI  NOT CURRENTLY RANKED';
  const description =
    visual.kind === 'ranking' && ranked
      ? `Sandbox GitHub AI Top 100, rank ${visual.eligibility.rank}, edition ${visual.eligibility.edition}`
      : `Sandbox ${message}`;
  const left = 112;
  const width = left + Math.ceil(message.length * 7.1) + 28;
  const accent = awarded ? '#ade9f9' : ranked ? '#3cd6fc' : '#9baebb';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeBadgeText(description)}"><title>${escapeBadgeText(description)}</title><rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="5" fill="#05090d" stroke="${awarded ? '#1cb5ed' : '#294457'}"/><path d="M${left} 1v${height - 2}" stroke="#294457"/>${awarded ? `<path d="M${left + 1} 1h${width - left - 6}" stroke="#3cd6fc" stroke-width="2"/>` : ''}<g transform="translate(10 ${height / 2 - 9}) scale(.28)"><path d="M32 10 55 52H9L32 10Zm0 14L21.8 43h20.4L32 24Z" fill="#1cb5ed" fill-rule="evenodd"/></g><g font-family="Verdana,Arial,sans-serif" font-size="10" font-weight="700" dominant-baseline="central"><text x="32" y="${height / 2}" fill="#f4f7fa" letter-spacing=".6">SANDBOX</text><text x="${left + 14}" y="${height / 2}" fill="${accent}">${escapeBadgeText(message)}</text></g></svg>`;
}

export function badgePath(githubId: string | number, week?: string): string {
  const id = githubBadgeIdSchema.parse(String(githubId));
  return week
    ? `/badges/github/${id}/rising-star/${awardWeekSchema.parse(week)}.svg`
    : `/badges/github/${id}/rank.svg`;
}
export function awardPath(week: string): string {
  return `/charts/awards/${awardWeekSchema.parse(week)}`;
}
export function awardShareContent(origin: string, week: string, name: string) {
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password)
    throw new Error('Origine du site invalide.');
  const url = new URL(awardPath(week), base.origin).href;
  return {
    url,
    image: new URL(`/api/awards/${awardWeekSchema.parse(week)}/image`, base.origin).href,
    text: `${name} - Sandbox Rising Star ${week}\n${url}`,
  };
}
export function badgeSnippets(
  origin: string,
  project: { githubId: number; slug: string; name: string },
  week?: string,
) {
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password)
    throw new Error('Origine du site invalide.');
  const image = new URL(badgePath(project.githubId, week), base.origin).href;
  const target = new URL(`/charts/project/${slugSchema.parse(project.slug)}`, base.origin);
  target.searchParams.set('utm_source', 'sandbox_badge');
  target.searchParams.set('utm_medium', 'badge');
  target.searchParams.set('utm_campaign', week ? 'rising_star' : 'github_top_100');
  if (week) target.hash = `award-${awardWeekSchema.parse(week)}`;
  // Ne pas figer un rang dans le texte alternatif d'une image dynamique.
  const alt = week
    ? `${project.name}: Sandbox Rising Star ${week}`
    : `${project.name}: classement Sandbox GitHub AI`;
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
