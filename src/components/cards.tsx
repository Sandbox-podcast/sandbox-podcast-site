import Link from 'next/link';
import Image from 'next/image';
import { formatDate, formatDateShort, formatDuration, formatNumber } from '@/domain/format';
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
        <span className="label text-ink-3">{formatDateShort(story.publishedAt)}</span>
      </div>
      <h3
        className={
          size === 'lg'
            ? 'font-display text-3xl font-extrabold leading-[1.02] md:text-4xl'
            : 'card-title'
        }
      >
        <Link href={`/stories/${story.slug}`} className="card-link">
          <span className="card-title">{story.title}</span>
        </Link>
      </h3>
      <p className={`text-ink-2 ${size === 'lg' ? 'max-w-xl text-base' : 'line-clamp-3 text-sm'}`}>
        {story.dek}
      </p>
      <p className="label mt-auto pt-1 text-ink-3">
        {author.name} · {readingMinutes(story)} min
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
  const thumbnail =
    episode.platforms.thumbnailUrl ??
    (episode.platforms.youtubeId
      ? `https://i.ytimg.com/vi/${episode.platforms.youtubeId}/hqdefault.jpg`
      : undefined);
  return (
    <div className="cover" data-tone={episode.cover.tone}>
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 48rem) 88vw, (max-width: 80rem) 35vw, 28rem"
          className="cover-image"
        />
      ) : null}
      {thumbnail ? <span className="cover-scrim" aria-hidden="true" /> : null}
      <span className={`cover-num ${compact ? 'cover-num-sm' : ''}`} aria-hidden="true">
        {episode.number}
      </span>
      <div className="flex items-center justify-between">
        <span className="label">EP. {episode.number}</span>
        <span className="label">{episode.cover.kicker}</span>
      </div>
      {showTitle ? (
        <p
          className={`display ${compact ? 'text-xl' : 'text-3xl md:text-5xl'} max-w-[85%]`}
          style={{ lineHeight: 0.95 }}
        >
          {episode.title}
        </p>
      ) : (
        <span />
      )}
    </div>
  );
}

export function EpisodeCard({ episode }: { episode: Episode }) {
  return (
    <article className="episode-card">
      <Link href={`/episodes/${String(episode.number)}`} className="episode-card-link">
        <EpisodeCover episode={episode} compact showTitle={false} />
        <p className="episode-card-meta label text-ink-3">
          <span>EP. {episode.number}</span>
          <span>{formatDateShort(episode.publishedAt)}</span>
          <span>{formatDuration(episode.durationSec)}</span>
        </p>
        <h3 className="episode-card-title">{episode.title}</h3>
        <div className="episode-card-details">
          <p>{episode.dek}</p>
          <p className="episode-card-topics">
            {episode.topics
              .slice(0, 3)
              .map((topic) => `#${getTopic(topic).label}`)
              .join(' · ')}
          </p>
          <span className="episode-card-cta">Découvrir l’épisode →</span>
        </div>
      </Link>
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
              <span className="card-title">{entity.name}</span>
            </Link>
          </h3>
          <p className="label mt-1 text-ink-2">
            {entity.org ? `${entity.org} · ` : ''}
            {entity.category}
          </p>
        </div>
      </div>
      <p className="line-clamp-2 text-sm text-ink-2">{entity.tagline}</p>
      {ranks.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {ranks.map((r) => (
            <li key={r.chart.slug} className="chip">
              {r.chart.short} <b>n°{r.rank}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="label text-ink-3">Hors Top 10 cette semaine</p>
      )}
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
    <section
      className="flex h-full flex-col border-t-4 border-ink pt-2"
      aria-label={`${view.chart.title}, aperçu`}
    >
      <header className="mini-chart-heading mb-1 flex items-start justify-between gap-3">
        <div>
          <p className="label text-ink-2">
            {view.chart.code} · {shortWeek(view.week)}
            {view.isLatest ? '' : ' · archive'}
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
              {view.chart.title}
            </Link>
          </Heading>
        </div>
      </header>
      <ol className="m-0 flex-1 list-none p-0">
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
                  {row.entity.name}
                </Link>
              </p>
              <p className="mt-1 flex items-center gap-2">
                <MoveBadge
                  kind={row.movement.kind}
                  delta={row.movement.delta}
                  baseline={view.baseline}
                />
                <span className="label tnum text-ink-3">{formatNumber(row.score, 1)}</span>
              </p>
            </div>
          </li>
        ))}
      </ol>
      <footer className="mt-3 flex items-center justify-between gap-3 border-t-2 border-ink pt-2">
        <span className="label text-ink-3">
          Mis à jour le {formatDate(view.snapshot.publishedAt)}
        </span>
        <Link
          href={
            view.isLatest ? `/charts/${view.chart.slug}` : `/charts/${view.chart.slug}/${view.week}`
          }
          className="label underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
        >
          Voir le Top {view.chart.size} →
        </Link>
      </footer>
    </section>
  );
}
