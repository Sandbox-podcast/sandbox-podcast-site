import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import Image from 'next/image';
import { episodeArtwork } from '@/domain/episode-artwork';
import { formatDateShort, formatDuration, formatNumber } from '@/domain/format';
import type { Entity, Episode, Story } from '@/domain/schema';
import { plainText } from '@/domain/markup';
import { shortWeek } from '@/domain/weeks';
import { chartView, currentRanks, entityPath, getHost, getTopic } from '@/lib/repository';
import { MoveBadge, Mark, RankNum, TypeTag } from './ui';
export function readingMinutes(story: Story): number {
  const words = story.body
    .map((b) => {
      switch (b.type) {
        case 'p':
        case 'h2':
        case 'h3':
        case 'quote':
        case 'callout':
          return plainText(b.text);
        case 'list':
          return b.items.map(plainText).join(' ');
        default:
          return '';
      }
    })
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
export function StoryCard({ story, size = 'md' }: { story: Story; size?: 'md' | 'lg' }) {
  const author = getHost(story.author);
  return (
    <article className="card">
      <div className="flex items-center gap-2">
        <TypeTag type={story.type} />
        <span className="label text-ink-3">
          <Text>{formatDateShort(story.publishedAt)}</Text>
        </span>
      </div>
      <h3
        className={
          size === 'lg'
            ? 'font-display text-3xl font-extrabold leading-[1.02] md:text-4xl'
            : 'card-title'
        }
      >
        <Link href={`/stories/${story.slug}`} className="card-link">
          <span className="card-title">
            <Text>{story.title}</Text>
          </span>
        </Link>
      </h3>
      <p className={`text-ink-2 ${size === 'lg' ? 'max-w-xl text-base' : 'line-clamp-3 text-sm'}`}>
        <Text>{story.dek}</Text>
      </p>
      <p className="label mt-auto pt-1 text-ink-3">
        <Text>{author.name}</Text>
        <Text>{' \u00B7 '}</Text>
        <Text>{readingMinutes(story)}</Text>
        <Text>{' min'}</Text>
      </p>
    </article>
  );
}
/** Couverture d'épisode typographique : un gros numéro, une teinte, aucune illustration. */
export function EpisodeCover({
  episode,
  compact = false,
  showTitle = true,
}: {
  episode: Pick<Episode, 'number' | 'title' | 'cover' | 'platforms'>;
  compact?: boolean;
  showTitle?: boolean;
}) {
  const thumbnail = episodeArtwork(episode);
  return (
    <div className="cover" data-tone={episode.cover.tone}>
      <Text>
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(max-width: 48rem) 88vw, (max-width: 80rem) 35vw, 28rem"
            className="cover-image"
          />
        ) : null}
      </Text>
      <Text>{thumbnail ? <span className="cover-scrim" aria-hidden="true" /> : null}</Text>
      <span className={`cover-num ${compact ? 'cover-num-sm' : ''}`} aria-hidden="true">
        <Text>{episode.number}</Text>
      </span>
      <div className="flex items-center justify-between">
        <span className="label">
          <Text>{'EP. '}</Text>
          <Text>{episode.number}</Text>
        </span>
        <span className="label">
          <Text>{episode.cover.kicker}</Text>
        </span>
      </div>
      <Text>
        {showTitle ? (
          <p
            className={`display ${compact ? 'text-xl' : 'text-3xl md:text-5xl'} max-w-[85%]`}
            style={{ lineHeight: 0.95 }}
          >
            <Text>{episode.title}</Text>
          </p>
        ) : (
          <span />
        )}
      </Text>
    </div>
  );
}
export function EpisodeCard({ episode }: { episode: Episode }) {
  const href = `/episodes/${String(episode.number)}`;
  const artwork = episodeArtwork(episode);
  return (
    <article className="episode-card">
      <Link href={href} className="episode-card-poster-link">
        <div className="episode-card-poster" data-tone={episode.cover.tone}>
          <Text>
            {artwork ? (
              <Image
                src={artwork}
                alt=""
                fill
                sizes="(max-width: 40rem) 78vw, (max-width: 80rem) 30vw, 20rem"
                className="episode-card-image"
              />
            ) : (
              <span className="episode-card-poster-number" aria-hidden="true">
                <Text>{episode.number}</Text>
              </span>
            )}
          </Text>
          <span className="episode-card-poster-shade" aria-hidden="true" />
          <span className="episode-card-poster-mark label">
            <Text>{'Sandbox \u00B7 EP. '}</Text>
            <Text>{String(episode.number)}</Text>
          </span>
          <h3 className="episode-card-title">
            <Text>{episode.title}</Text>
          </h3>
          <span className="episode-card-poster-duration label">
            <Text>{formatDuration(episode.durationSec)}</Text>
          </span>
        </div>
      </Link>
      <p className="episode-card-under label">
        <Text>{formatDateShort(episode.publishedAt)}</Text>
      </p>
      <div className="episode-card-popover">
        <div className="episode-card-popover-actions">
          <Link
            href={href}
            className="episode-card-play"
            aria-label={`Voir l’épisode ${String(episode.number)}`}
          >
            <span aria-hidden="true">
              <Text>{'\u25B6'}</Text>
            </span>
          </Link>
          <Link href={href} className="episode-card-more">
            <Text>{'Fiche de l\u2019\u00E9pisode '}</Text>
            <span aria-hidden="true">
              <Text>{'\u2197'}</Text>
            </span>
          </Link>
        </div>
        <p className="episode-card-popover-meta label">
          <Text>{'\u00C9pisode '}</Text>
          <Text>{episode.number}</Text>
          <Text>{' \u00B7 '}</Text>
          <Text>{formatDateShort(episode.publishedAt)}</Text>
          <Text>{' \u00B7'}</Text>
          <Text> </Text>
          <Text>{formatDuration(episode.durationSec)}</Text>
        </p>
        <p className="episode-card-popover-dek">
          <Text>{episode.dek}</Text>
        </p>
        <p className="episode-card-topics label">
          <Text>
            {episode.topics
              .slice(0, 3)
              .map((topic) => getTopic(topic).label)
              .join(' · ')}
          </Text>
        </p>
      </div>
      <details className="episode-card-touch-details">
        <summary>
          <Text>{'\u00C0 propos de l\u2019\u00E9pisode'}</Text>
        </summary>
        <p>
          <Text>{episode.dek}</Text>
        </p>
        <Link href={href}>
          <Text>{'Voir la fiche de l\u2019\u00E9pisode \u2192'}</Text>
        </Link>
      </details>
    </article>
  );
}
/** Carte d'entité : identité, place actuelle dans chaque classement, un clic pour la fiche. */
export function EntityCard({ entity }: { entity: Entity }) {
  const ranks = currentRanks(entity.slug);
  return (
    <article className="card">
      <div className="flex items-start gap-3">
        <Mark entity={entity} size={44} />
        <div className="min-w-0">
          <h3 className="font-display text-xl font-extrabold leading-tight">
            <Link href={entityPath(entity)} className="card-link">
              <span className="card-title">
                <Text>{entity.name}</Text>
              </span>
            </Link>
          </h3>
          <p className="label mt-1 text-ink-2">
            <Text>{entity.org ? `${entity.org} · ` : ''}</Text>
            <Text>{entity.category}</Text>
          </p>
        </div>
      </div>
      <p className="line-clamp-2 text-sm text-ink-2">
        <Text>{entity.tagline}</Text>
      </p>
      <Text>
        {ranks.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            <Text>
              {ranks.map((r) => (
                <li key={r.chart.slug} className="chip">
                  <Text>{r.chart.short}</Text>{' '}
                  <b>
                    <Text>{'n\u00B0'}</Text>
                    <Text>{r.rank}</Text>
                  </b>
                </li>
              ))}
            </Text>
          </ul>
        ) : (
          <p className="label text-ink-3">
            <Text>{'Hors Top 10 cette semaine'}</Text>
          </p>
        )}
      </Text>
    </article>
  );
}
/**
 * Aperçu d'un classement : les premières places, avec leur mouvement. Sert à la page d'accueil,
 * aux articles et aux épisodes, pour que chaque contenu renvoie vers le classement vivant.
 */
export function MiniChart({
  chart,
  week,
  top = 5,
  heading = 'h3',
}: {
  chart: string;
  week?: string;
  top?: number;
  heading?: 'h2' | 'h3';
}) {
  const view = chartView(chart, week);
  const Heading = heading;
  const rows = view.rows.slice(0, top);
  return (
    <LocalizedElement
      as="section"
      className="flex h-full flex-col border-t-4 border-ink pt-2"
      aria-label={`${view.chart.title}, aperçu`}
    >
      <header className="mini-chart-heading mb-1 flex items-start justify-between gap-3">
        <div>
          <p className="label text-ink-2">
            <Text>{view.chart.code}</Text>
            <Text>{' \u00B7 '}</Text>
            <Text>{shortWeek(view.week)}</Text>
            <Text>{view.isLatest ? '' : ' · archive'}</Text>
          </p>
          <Heading className="display mini-chart-title text-3xl">
            <Link
              href={
                view.isLatest
                  ? `/charts/${view.chart.slug}`
                  : `/charts/${view.chart.slug}/${view.week}`
              }
              className="hover:underline hover:decoration-4 hover:underline-offset-4"
            >
              <Text>{view.chart.title}</Text>
            </Link>
          </Heading>
        </div>
      </header>
      <ol className="m-0 flex-1 list-none p-0">
        <Text>
          {rows.map((row) => (
            <li
              key={row.entity.slug}
              className="relative grid grid-cols-[3.25rem_1fr] items-center gap-3 border-t border-hair py-2.5 first:border-t-2 first:border-ink"
              data-lead={row.rank === 1}
            >
              <RankNum rank={row.rank} size={row.rank <= 3 ? 'md' : 'sm'} />
              <div className="min-w-0">
                <p className="flex items-center gap-2">
                  <Mark entity={row.entity} size={26} />
                  <Link
                    href={entityPath(row.entity)}
                    className="min-w-0 font-display text-lg font-extrabold leading-[1.05] after:absolute after:inset-0 hover:underline"
                  >
                    <Text>{row.entity.name}</Text>
                  </Link>
                </p>
                <p className="mt-1 flex items-center gap-2">
                  <MoveBadge
                    kind={row.movement.kind}
                    delta={row.movement.delta}
                    baseline={view.baseline}
                  />
                  <span className="label tnum text-ink-3">
                    <Text>{formatNumber(row.score, 1)}</Text>
                  </span>
                </p>
              </div>
            </li>
          ))}
        </Text>
      </ol>
      <footer className="mini-chart-footer mt-3 border-t-2 border-ink pt-2">
        <span className="label text-ink-3">
          <Text>{'Mis \u00E0 jour \u00B7 '}</Text>
          <Text>{formatDateShort(view.snapshot.publishedAt)}</Text>
        </span>
        <Link
          href={
            view.isLatest ? `/charts/${view.chart.slug}` : `/charts/${view.chart.slug}/${view.week}`
          }
          className="label underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
        >
          <Text>{'Voir le Top '}</Text>
          <Text>{view.chart.size}</Text>
          <Text>{' \u2192'}</Text>
        </Link>
      </footer>
    </LocalizedElement>
  );
}
