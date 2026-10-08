import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
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
  params: Promise<{
    number: string;
  }>;
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
          <span className="tag tag-hl">
            <Text>{'\u00C9pisode '}</Text>
            <Text>{episode.number}</Text>
          </span>
          <span>
            <Text>{formatDate(episode.publishedAt)}</Text>
          </span>
          <span>
            <Text>{formatDuration(episode.durationSec)}</Text>
          </span>
          <span>
            <Text>{episode.hosts.map((host) => getHost(host).name).join(' · ')}</Text>
          </span>
        </p>
        <h1 className="display">
          <Text>{episode.title}</Text>
        </h1>
        <p className="episode-dek">
          <Text>{episode.dek}</Text>
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            className="btn btn-solid"
            href={episode.platforms.youtubeUrl ?? siteConfig.platforms.youtube}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Text>{episode.platforms.youtubeUrl ? 'Voir sur YouTube' : 'La chaîne YouTube'}</Text>
            <Text>{' \u2197'}</Text>
            <span className="sr-only">
              <Text>{'(nouvel onglet)'}</Text>
            </span>
          </a>
          <Text>
            {episode.platforms.spotifyUrl ? (
              <a
                className="btn"
                href={episode.platforms.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Text>{'Spotify \u2197'}</Text>
              </a>
            ) : null}
          </Text>
          <Text>
            {episode.platforms.appleUrl ? (
              <a
                className="btn"
                href={episode.platforms.appleUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Text>{'Apple Podcasts \u2197'}</Text>
              </a>
            ) : null}
          </Text>
          <CopyButton text={path} label="Partager l'épisode" />
        </div>
      </header>

      <LocalizedElement as="nav" className="episode-section-nav" aria-label="Dans cet épisode">
        <a href="#episode-video">
          <Text>{'Vid\u00E9o'}</Text>
        </a>
        <a href="#episode-about">
          <Text>{'\u00C0 propos'}</Text>
        </a>
        <a href="#chapters">
          <Text>{'Chapitres '}</Text>
          <span>
            <Text>{episode.chapters.length}</Text>
          </span>
        </a>
        <a href="#mentions">
          <Text>{'Sources et ressources '}</Text>
          <span>
            <Text>{resources.length}</Text>
          </span>
        </a>
      </LocalizedElement>

      <div className="episode-layout">
        <div className="episode-main">
          <LocalizedElement
            as="section"
            id="episode-video"
            aria-label="Lecteur vidéo"
            className="episode-player"
          >
            <Text>
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
                    <Text>{"La vid\u00E9o de cet \u00E9pisode n'est pas encore disponible."}</Text>
                  </p>
                </>
              )}
            </Text>
          </LocalizedElement>
          <Text>
            {episode.platforms.audioUrl ? (
              <audio className="w-full" controls preload="none" src={episode.platforms.audioUrl}>
                <track kind="captions" />
              </audio>
            ) : null}
          </Text>

          <section aria-labelledby="episode-about">
            <h2 id="episode-about" className="label border-t-2 border-ink pt-2">
              <Text>{'\u00C0 propos de l\u2019\u00E9pisode'}</Text>
            </h2>
            <p className="episode-description">
              <Text>{episode.description}</Text>
            </p>
            <Text>
              {episode.topics.length > 0 ? (
                <p className="mt-4 flex flex-wrap gap-2">
                  <Text>
                    {episode.topics.map((topic) => (
                      <Link key={topic} href={`/topics/${topic}`} className="chip">
                        <Text>{'#'}</Text>
                        <Text>{getTopic(topic).label}</Text>
                      </Link>
                    ))}
                  </Text>
                </p>
              ) : null}
            </Text>
          </section>

          <section aria-labelledby="chapters">
            <h2 id="chapters" className="label mb-3 border-t-2 border-ink pt-2">
              <Text>{'Chapitres '}</Text>
              <span className="text-ink-3">
                <Text>{'\u00B7 '}</Text>
                <Text>{episode.chapters.length}</Text>
              </span>
            </h2>
            <Text>
              {episode.chapters.length > 0 ? (
                <ol className="chapter-list">
                  <Text>
                    {episode.chapters.map((chapter) => {
                      const timestamp = youtubeAt(chapter.at);
                      const content = (
                        <>
                          <span className="chapter-time">
                            <Text>{formatTimestamp(chapter.at)}</Text>
                          </span>
                          <span className="chapter-title">
                            <Text>{chapter.title}</Text>
                          </span>
                          {timestamp ? (
                            <span aria-hidden="true">
                              <Text>{'\u2197'}</Text>
                            </span>
                          ) : null}
                        </>
                      );
                      return (
                        <li key={chapter.at}>
                          <Text>
                            {timestamp ? (
                              <a
                                className="chapter-row"
                                href={timestamp}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Text>{content}</Text>
                                <span className="sr-only">
                                  <Text>{'(YouTube, nouvel onglet)'}</Text>
                                </span>
                              </a>
                            ) : (
                              <div className="chapter-row">
                                <Text>{content}</Text>
                              </div>
                            )}
                          </Text>
                        </li>
                      );
                    })}
                  </Text>
                </ol>
              ) : (
                <p className="empty-note">
                  <Text>{'Les chapitres seront ajout\u00E9s \u00E0 cette fiche.'}</Text>
                </p>
              )}
            </Text>
          </section>

          <Text>
            {episode.charts.length > 0 ? (
              <section aria-labelledby="episode-rankings">
                <h2 id="episode-rankings" className="label mb-3 border-t-2 border-ink pt-2">
                  <Text>{'Classements comment\u00E9s'}</Text>
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Text>
                    {episode.charts.map((chart) => (
                      <Link
                        key={`${chart.chart}-${chart.week}`}
                        className="chip"
                        href={`/charts/${chart.chart}/${chart.week}`}
                      >
                        <Text>{chart.chart}</Text>
                        <Text>{' \u00B7 '}</Text>
                        <Text>{chart.week}</Text>
                      </Link>
                    ))}
                  </Text>
                </div>
              </section>
            ) : null}
          </Text>
        </div>

        <aside id="mentions" className="episode-resources" aria-labelledby="resources-title">
          <h2 id="resources-title">
            <Text>{'Sources & ressources'}</Text>
          </h2>
          <p className="resource-intro">
            <Text>
              {
                'Liens cit\u00E9s \u00E0 l\u2019\u00E9cran ou consult\u00E9s pour pr\u00E9parer cet \u00E9pisode.'
              }
            </Text>
          </p>

          <Text>
            {resources.length > 0 ? (
              <section className="resource-group">
                <h3>
                  <Text>{'Tous les liens '}</Text>
                  <span>
                    <Text>{resources.length}</Text>
                  </span>
                </h3>
                <ul className="resource-list">
                  <Text>
                    {resources.map((mention, index) => {
                      const timestamp =
                        mention.at === undefined ? undefined : youtubeAt(mention.at);
                      return (
                        <li
                          className="resource-item"
                          id={`resource-${String(index)}`}
                          key={`${mention.url ?? mention.label}-${String(index)}`}
                        >
                          <Text>
                            {mention.url ? (
                              <a href={mention.url} target="_blank" rel="noopener noreferrer">
                                <Text>{mention.label}</Text>
                              </a>
                            ) : (
                              <span>
                                <Text>{mention.label}</Text>
                              </span>
                            )}
                          </Text>
                          <Text>
                            {timestamp ? (
                              <a
                                className="resource-time"
                                href={timestamp}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Text>{'Voir \u00E0 '}</Text>
                                <Text>{formatTimestamp(mention.at ?? 0)}</Text>
                                <Text>{' \u2197'}</Text>
                              </a>
                            ) : null}
                          </Text>
                          <Text>
                            {mention.note ? (
                              <small>
                                <Text>{mention.note}</Text>
                              </small>
                            ) : null}
                          </Text>
                        </li>
                      );
                    })}
                  </Text>
                </ul>
              </section>
            ) : null}
          </Text>
          <Text>
            {resources.length === 0 ? (
              <p className="resource-intro">
                <Text>{'Aucune ressource n\u2019a encore \u00E9t\u00E9 ajout\u00E9e.'}</Text>
              </p>
            ) : null}
          </Text>
        </aside>
      </div>

      <LocalizedElement
        as="nav"
        aria-label="Épisodes voisins"
        className="mt-14 grid gap-px border border-hair sm:grid-cols-2"
      >
        <Text>
          {older ? (
            <Link
              href={`/episodes/${String(older.number)}`}
              className="bg-paper-2 p-4 hover:bg-paper-3"
              rel="prev"
            >
              <span className="label">
                <Text>{'\u2190 \u00C9pisode pr\u00E9c\u00E9dent'}</Text>
              </span>
              <span className="mt-1 block font-display text-lg font-extrabold">
                <Text>{older.title}</Text>
              </span>
            </Link>
          ) : (
            <span />
          )}
        </Text>
        <Text>
          {newer ? (
            <Link
              href={`/episodes/${String(newer.number)}`}
              className="bg-paper-2 p-4 text-right hover:bg-paper-3"
              rel="next"
            >
              <span className="label">
                <Text>{'\u00C9pisode suivant \u2192'}</Text>
              </span>
              <span className="mt-1 block font-display text-lg font-extrabold">
                <Text>{newer.title}</Text>
              </span>
            </Link>
          ) : (
            <span />
          )}
        </Text>
      </LocalizedElement>

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
