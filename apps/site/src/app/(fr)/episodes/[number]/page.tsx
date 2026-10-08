import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EpisodeCover } from '@/components/cards';
import { CopyButton, YouTubeFacade } from '@/components/client';
import { Breadcrumbs } from '@/components/ui';
import { JsonLd } from '@/components/json-ld';
import { siteConfig } from '@/config/site';
import { formatDate, formatDuration, formatTimestamp, isoDuration } from '@/domain/format';
import { mentionTag } from '@/domain/kinds';
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
  const resources: Episode['mentions'] = [
    ...episode.mentions,
    ...episode.sources.map((source) => ({
      kind: source.kind,
      label: source.label,
      url: source.url,
      note: source.publisher ?? mentionTag(source.kind),
    })),
  ];

  return (
    <article className="wrap episode-page pt-6">
      <Breadcrumbs
        items={[
          { label: 'Podcasts', href: '/episodes' },
          { label: `Épisode ${String(episode.number)}` },
        ]}
      />

      <header className="episode-heading">
        <p className="label mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="tag tag-hl">Épisode {episode.number}</span>
          <span>{formatDate(episode.publishedAt)}</span>
          <span>{formatDuration(episode.durationSec)}</span>
          <span>{episode.hosts.map((host) => getHost(host).name).join(' · ')}</span>
        </p>
        <h1 className="display">{episode.title}</h1>
        <p className="episode-dek">{episode.dek}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            className="btn btn-solid"
            href={episode.platforms.youtubeUrl ?? siteConfig.platforms.youtube}
            target="_blank"
            rel="noopener noreferrer"
          >
            {episode.platforms.youtubeUrl ? 'Voir sur YouTube' : 'La chaîne YouTube'} ↗
            <span className="sr-only">(nouvel onglet)</span>
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
          <CopyButton text={path} label="Partager l'épisode" />
        </div>
      </header>

      <nav className="episode-section-nav" aria-label="Dans cet épisode">
        <a href="#episode-video">Vidéo</a>
        <a href="#episode-about">À propos</a>
        <a href="#chapters">
          Chapitres <span>{episode.chapters.length}</span>
        </a>
        <a href="#mentions">
          Sources et ressources <span>{resources.length}</span>
        </a>
      </nav>

      <div className="episode-layout">
        <div className="episode-main">
          <section id="episode-video" aria-label="Lecteur vidéo" className="episode-player">
            {youtubeId ? (
              <YouTubeFacade
                id={youtubeId}
                title={episode.title}
                thumbnailUrl={episode.platforms.thumbnailUrl}
              />
            ) : (
              <>
                <EpisodeCover episode={episode} showTitle={false} />
                <p className="player-unavailable">
                  La vidéo de cet épisode n'est pas encore disponible.
                </p>
              </>
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
              <ol className="chapter-list">
                {episode.chapters.map((chapter) => {
                  const timestamp = youtubeAt(chapter.at);
                  const content = (
                    <>
                      <span className="chapter-time">{formatTimestamp(chapter.at)}</span>
                      <span className="chapter-title">{chapter.title}</span>
                      {timestamp ? <span aria-hidden="true">↗</span> : null}
                    </>
                  );
                  return (
                    <li key={chapter.at}>
                      {timestamp ? (
                        <a
                          className="chapter-row"
                          href={timestamp}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {content}
                          <span className="sr-only">(YouTube, nouvel onglet)</span>
                        </a>
                      ) : (
                        <div className="chapter-row">{content}</div>
                      )}
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

          {resources.length > 0 ? (
            <section className="resource-group">
              <h3>
                Tous les liens <span>{resources.length}</span>
              </h3>
              <ul className="resource-list">
                {resources.map((mention, index) => {
                  const timestamp = mention.at === undefined ? undefined : youtubeAt(mention.at);
                  return (
                    <li
                      className="resource-item"
                      id={`resource-${String(index)}`}
                      key={`${mention.url ?? mention.label}-${String(index)}`}
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
          ) : null}
          {resources.length === 0 ? (
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
            ...(youtubeId ? { associatedMedia: { '@id': `${absoluteUrl(path)}#video` } } : {}),
          },
          ...(youtubeId
            ? [
                {
                  '@context': 'https://schema.org',
                  '@type': 'VideoObject',
                  '@id': `${absoluteUrl(path)}#video`,
                  name: episode.title,
                  description: episode.dek,
                  thumbnailUrl:
                    episode.platforms.thumbnailUrl ??
                    `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
                  uploadDate: episode.publishedAt,
                  duration: isoDuration(episode.durationSec),
                  embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
                },
              ]
            : []),
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
