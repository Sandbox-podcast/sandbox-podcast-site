import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { notFound } from 'next/navigation';
import { EpisodeCover } from '@/components/cards';
import { episodeArtwork } from '@/domain/episode-artwork';
import { episodeYoutubeUrl } from '@/domain/home-discovery';
import {
  episodeChapters,
  episodeVideoClips,
  episodeStartOffset,
  verifiedEpisodeDuration,
} from '@/domain/episode-presentation';
import { episodeResources } from '@/domain/episode-resources';
import { episodeProjects } from '@/domain/episode-projects';
import { personalProjectPath, PROJECT_CREATORS } from '@/domain/personal-projects';
import { personalProjects } from '@/lib/personal-projects';
import { indexableEpisode } from '@/domain/episode-seo';
import { CopyButton, YouTubeFacade } from '@/components/client';
import { Breadcrumbs } from '@/components/ui';
import { JsonLd } from '@/components/json-ld';
import { siteConfig } from '@/config/site';
import { formatDate, formatDurationExact, formatTimestamp, isoDuration } from '@/domain/format';
import type { Episode } from '@/domain/schema';
import { allEpisodes, getEpisode, getHost } from '@/lib/repository';
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';
// Les épisodes publiés dans l'admin après le build doivent aussi être accessibles.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
interface Props {
  params: Promise<{
    number: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}
const find = (raw: string): Episode | undefined => getEpisode(Number(raw));
export async function generateMetadata({ params }: Props) {
  await preparePublishedEditorialContent();
  const { number } = await params;
  const episode = find(number);
  if (!episode) return {};
  return pageMetadata({
    title: `Épisode ${String(episode.number)} : ${episode.title}`,
    description: episode.dek,
    path: `/episodes/${String(episode.number)}`,
    type: 'article',
    publishedTime: episode.publishedAt,
    ownImage: true,
    noindex: !indexableEpisode(episode),
  });
}
export default async function EpisodePage({ params, searchParams }: Props) {
  await preparePublishedEditorialContent();
  const { number } = await params;
  const episode = find(number);
  if (!episode) notFound();
  const youtubeId = episode.platforms.youtubeId;
  const chapters = episodeChapters(episode);
  const durationSec = verifiedEpisodeDuration(episode);
  const startAt = episodeStartOffset((await searchParams)?.['t'], durationSec);
  const episodeAt = (at: number): string | undefined =>
    youtubeId ? `/episodes/${String(episode.number)}?t=${String(at)}#episode-video` : undefined;
  const all = allEpisodes().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const idx = all.findIndex((item) => item.number === episode.number);
  const older = all[idx + 1];
  const newer = all[idx - 1];
  const path = `/episodes/${String(episode.number)}`;
  const resources = episodeResources(episode, personalProjects);
  const projects = episodeProjects(episode, personalProjects);
  return (
    <article className="wrap episode-page pt-6">
      <Breadcrumbs
        items={[
          { label: 'Le podcast', href: '/podcast' },
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
          {durationSec !== undefined ? (
            <span>
              <Text>{formatDurationExact(durationSec)}</Text>
            </span>
          ) : null}
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
            href={episodeYoutubeUrl(episode) ?? siteConfig.platforms.youtube}
            target="_blank"
            rel="noopener noreferrer"
            data-analytics-event="youtube_open"
            data-analytics-placement="episode"
            data-analytics-episode={episode.number}
          >
            <Text>{episodeYoutubeUrl(episode) ? 'Voir sur YouTube' : 'La chaîne YouTube'}</Text>
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
        <a href="#chapters">
          <Text>{'Chapitres '}</Text>
          <span>
            <Text>{chapters.length}</Text>
          </span>
        </a>
        <a href="#mentions">
          <Text>{'Sources et ressources '}</Text>
          <span>
            <Text>{resources.length}</Text>
          </span>
        </a>
      </LocalizedElement>

      <div className="episode-media">
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
                episodeNumber={episode.number}
                title={episode.title}
                {...(startAt !== undefined ? { startAt } : {})}
                thumbnailUrl={episodeArtwork(episode)}
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
      </div>

      <div className="episode-layout">
        <div className="episode-main">
          {projects.length ? (
            <section className="episode-projects" aria-labelledby="episode-projects-title">
              <h2 id="episode-projects-title" className="episode-details-heading">
                <Text>{'Les projets de cet épisode'}</Text>
              </h2>
              {projects.map(({ project }) => (
                <p key={project.slug}>
                  <Link
                    className="underline"
                    href={personalProjectPath(project.slug)}
                    data-analytics-event="episode_project_open"
                    data-analytics-episode={episode.number}
                    data-analytics-project={project.slug}
                  >
                    <Text>{'Découvrir'}</Text> {project.name}
                  </Link>
                  {' · '}
                  <Text>{'Un projet de'}</Text> {PROJECT_CREATORS[project.creator].name}
                </p>
              ))}
            </section>
          ) : null}
          <section className="episode-chapters" aria-labelledby="chapters">
            <h2 id="chapters" className="episode-details-heading">
              <Text>{'Chapitres '}</Text>
              <span className="episode-details-count">
                <Text>{chapters.length}</Text>
              </span>
            </h2>
            <Text>
              {chapters.length > 0 ? (
                <ol className="chapter-list">
                  <Text>
                    {chapters.map((chapter) => {
                      const timestamp = episodeAt(chapter.at);
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
                              <a className="chapter-row" href={timestamp}>
                                <Text>{content}</Text>
                                <span className="sr-only">
                                  <Text>{'(lecteur vidéo)'}</Text>
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
          <h2 id="resources-title" className="episode-details-heading">
            <Text>{'Sources & ressources'}</Text>{' '}
            <span className="episode-details-count">
              <Text>{resources.length}</Text>
            </span>
          </h2>

          <Text>
            {resources.length > 0 ? (
              <ul className="resource-list">
                <Text>
                  {resources.map((mention, index) => {
                    const timestamp = mention.at === undefined ? undefined : episodeAt(mention.at);
                    return (
                      <li
                        className="resource-item"
                        id={`resource-${String(index)}`}
                        key={`${mention.url ?? mention.label}-${String(index)}`}
                      >
                        <Text>
                          {mention.url ? (
                            <a
                              href={mention.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-analytics-event="episode_source_open"
                              data-analytics-episode={episode.number}
                              data-analytics-resource={index}
                            >
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
                            <a className="resource-time" href={timestamp}>
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
            ...(durationSec !== undefined ? { timeRequired: isoDuration(durationSec) } : {}),
            url: absoluteUrl(path),
            inLanguage: siteConfig.language,
            partOfSeries: {
              '@type': 'PodcastSeries',
              name: siteConfig.name,
              url: absoluteUrl('/podcast'),
            },
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
                  thumbnailUrl: absoluteUrl(
                    episodeArtwork(episode) ?? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
                  ),
                  uploadDate: episode.publishedAt,
                  ...(durationSec !== undefined ? { duration: isoDuration(durationSec) } : {}),
                  embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
                  mainEntityOfPage: absoluteUrl(path),
                  hasPart: episodeVideoClips(chapters, durationSec, absoluteUrl(path)),
                },
              ]
            : []),
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Le podcast', path: '/podcast' },
            { name: `Épisode ${String(episode.number)}`, path },
          ]),
        ]}
      />
    </article>
  );
}
