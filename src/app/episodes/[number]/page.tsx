import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EpisodeCover } from '@/components/cards';
import { YouTubeFacade } from '@/components/client';
import { JsonLd } from '@/components/json-ld';
import { siteConfig } from '@/config/site';
import { formatDate, formatDuration, formatTimestamp, isoDuration } from '@/domain/format';
import { MENTION_KINDS, mentionTag } from '@/domain/kinds';
import type { Episode } from '@/domain/schema';
import { allEpisodes, getEpisode, getHost, getTopic } from '@/lib/repository';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return allEpisodes().map((episode) => ({ number: String(episode.number) }));
}

interface Props {
  params: Promise<{ number: string }>;
}

const find = (raw: string): Episode | undefined => getEpisode(Number(raw));

export async function generateMetadata({ params }: Props) {
  const { number } = await params;
  const episode = find(number);
  if (!episode) return {};
  return pageMetadata({
    title: `Épisode ${String(episode.number)} : ${episode.title}`,
    description: `${episode.dek} Retrouvez la vidéo, les chapitres et les ressources citées.`,
    path: `/episodes/${String(episode.number)}`,
    type: 'article',
    publishedTime: episode.publishedAt,
    ownImage: true,
  });
}

export default async function EpisodePage({ params }: Props) {
  const { number } = await params;
  const episode = find(number);
  if (!episode) notFound();

  const youtubeId = episode.platforms.youtubeId;
  const youtubeAt = (at: number): string | undefined =>
    youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}&t=${String(at)}s` : undefined;
  const all = allEpisodes().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const idx = all.findIndex((item) => item.number === episode.number);
  const older = all[idx + 1];
  const newer = all[idx - 1];
  const path = `/episodes/${String(episode.number)}`;
  const groups = MENTION_KINDS.map((kind) => ({
    ...kind,
    items: episode.mentions
      .map((mention, index) => ({ mention, index }))
      .filter(({ mention }) => mention.kind === kind.kind),
  })).filter((group) => group.items.length > 0);

  return (
    <article className="wrap episode-page pt-6">
      <nav aria-label="Fil d’Ariane" className="label mb-5 text-ink-2">
        <Link href="/episodes" className="underline decoration-2 underline-offset-4">
          Podcasts
        </Link>{' '}
        / Épisode {episode.number}
      </nav>

      <header className="episode-heading">
        <p className="label mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="tag tag-hl">Épisode {episode.number}</span>
          <span>{formatDate(episode.publishedAt)}</span>
          <span>{formatDuration(episode.durationSec)}</span>
          <span>{episode.hosts.map((host) => getHost(host).name).join(' · ')}</span>
        </p>
        <h1
          className="display"
          style={{ fontSize: 'clamp(2.5rem, 7vw, 5.7rem)', lineHeight: 0.96 }}
        >
          {episode.title}
        </h1>
        <p className="mt-4 max-w-4xl font-serif text-xl leading-snug text-ink-2 md:text-2xl">
          {episode.dek}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            className="btn btn-solid"
            href={episode.platforms.youtubeUrl ?? siteConfig.platforms.youtube}
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube ↗
          </a>
          {episode.platforms.spotifyUrl ? (
            <a
              className="btn"
              href={episode.platforms.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Spotify ↗
            </a>
          ) : null}
          {episode.platforms.appleUrl ? (
            <a
              className="btn"
              href={episode.platforms.appleUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Apple Podcasts ↗
            </a>
          ) : null}
          <a className="btn" href="#mentions">
            Sources et ressources ↓
          </a>
        </div>
      </header>

      <div className="episode-layout">
        <div className="episode-main">
          <section aria-label="Lecteur vidéo" className="episode-player">
            {youtubeId ? (
              <YouTubeFacade
                id={youtubeId}
                title={episode.title}
                thumbnailUrl={episode.platforms.thumbnailUrl}
              />
            ) : (
              <EpisodeCover episode={episode} />
            )}
          </section>
          {episode.platforms.audioUrl ? (
            <audio className="w-full" controls preload="none" src={episode.platforms.audioUrl}>
              <track kind="captions" />
            </audio>
          ) : null}

          <section aria-labelledby="episode-about">
            <h2 id="episode-about" className="label border-t-2 border-ink pt-2">
              À propos de l’épisode
            </h2>
            <p className="episode-description">{episode.description}</p>
            {episode.topics.length > 0 ? (
              <p className="mt-4 flex flex-wrap gap-2">
                {episode.topics.map((topic) => (
                  <Link key={topic} href={`/topics/${topic}`} className="chip">
                    #{getTopic(topic).label}
                  </Link>
                ))}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="chapters">
            <h2 id="chapters" className="label mb-3 border-t-2 border-ink pt-2">
              Chapitres <span className="text-ink-3">· {episode.chapters.length}</span>
            </h2>
            {episode.chapters.length > 0 ? (
              <ol className="m-0 list-none p-0">
                {episode.chapters.map((chapter, index) => {
                  const timestamp = youtubeAt(chapter.at);
                  return (
                    <li
                      key={chapter.at}
                      className="grid grid-cols-[4.5rem_2rem_1fr] items-baseline gap-2 border-t border-hair py-3"
                    >
                      <span className="font-mono text-sm tnum">
                        {timestamp ? (
                          <a
                            href={timestamp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-hl underline underline-offset-2"
                          >
                            {formatTimestamp(chapter.at)}
                          </a>
                        ) : (
                          formatTimestamp(chapter.at)
                        )}
                      </span>
                      <span className="label text-ink-3">{String(index + 1).padStart(2, '0')}</span>
                      <span className="font-display text-lg font-extrabold leading-tight">
                        {chapter.title}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="empty-note">Les chapitres seront ajoutés à cette fiche.</p>
            )}
          </section>

          {episode.charts.length > 0 ? (
            <section aria-labelledby="episode-rankings">
              <h2 id="episode-rankings" className="label mb-3 border-t-2 border-ink pt-2">
                Classements commentés
              </h2>
              <div className="flex flex-wrap gap-2">
                {episode.charts.map((chart) => (
                  <Link
                    key={`${chart.chart}-${chart.week}`}
                    className="chip"
                    href={`/charts/${chart.chart}/${chart.week}`}
                  >
                    {chart.chart} · {chart.week}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside id="mentions" className="episode-resources" aria-labelledby="resources-title">
          <h2 id="resources-title">Sources & ressources</h2>
          <p className="resource-intro">
            Liens cités à l’écran ou consultés pour préparer cet épisode.
          </p>

          {groups.map((group) => (
            <section className="resource-group" key={group.kind}>
              <h3>
                {group.label}
                <span>{group.items.length}</span>
              </h3>
              <ul className="resource-list">
                {group.items.map(({ mention, index }) => {
                  const timestamp = mention.at === undefined ? undefined : youtubeAt(mention.at);
                  return (
                    <li
                      className="resource-item"
                      id={`resource-${String(index)}`}
                      key={`${mention.kind}-${String(index)}`}
                    >
                      {mention.url ? (
                        <a href={mention.url} target="_blank" rel="noopener noreferrer">
                          {mention.label}
                        </a>
                      ) : (
                        <span>{mention.label}</span>
                      )}
                      {timestamp ? (
                        <a
                          className="resource-time"
                          href={timestamp}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Voir à {formatTimestamp(mention.at ?? 0)} ↗
                        </a>
                      ) : null}
                      {mention.note ? <small>{mention.note}</small> : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {episode.sources.length > 0 ? (
            <section className="resource-group">
              <h3>
                Sources de préparation<span>{episode.sources.length}</span>
              </h3>
              <ul className="resource-list">
                {episode.sources.map((source) => (
                  <li className="resource-item" key={`${source.url}-${source.label}`}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.label}
                    </a>
                    <small>{source.publisher ?? mentionTag(source.kind)}</small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {episode.mentions.length === 0 && episode.sources.length === 0 ? (
            <p className="resource-intro">Aucune ressource n’a encore été ajoutée.</p>
          ) : null}
        </aside>
      </div>

      <nav
        aria-label="Épisodes voisins"
        className="mt-14 grid gap-px border border-hair sm:grid-cols-2"
      >
        {older ? (
          <Link
            href={`/episodes/${String(older.number)}`}
            className="bg-paper-2 p-4 hover:bg-paper-3"
            rel="prev"
          >
            <span className="label">← Épisode précédent</span>
            <span className="mt-1 block font-display text-lg font-extrabold">{older.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link
            href={`/episodes/${String(newer.number)}`}
            className="bg-paper-2 p-4 text-right hover:bg-paper-3"
            rel="next"
          >
            <span className="label">Épisode suivant →</span>
            <span className="mt-1 block font-display text-lg font-extrabold">{newer.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'PodcastEpisode',
            name: episode.title,
            episodeNumber: episode.number,
            description: episode.description,
            datePublished: episode.publishedAt,
            timeRequired: isoDuration(episode.durationSec),
            url: absoluteUrl(path),
            inLanguage: siteConfig.language,
            partOfSeries: { '@type': 'PodcastSeries', name: siteConfig.name, url: siteConfig.url },
            keywords: episode.topics.map((topic) => getTopic(topic).label).join(', '),
          },
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Podcasts', path: '/episodes' },
            { name: `Épisode ${String(episode.number)}`, path },
          ]),
        ]}
      />
    </article>
  );
}
