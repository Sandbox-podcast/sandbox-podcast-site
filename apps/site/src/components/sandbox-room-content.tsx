'use client';

import Image from 'next/image';
import { useId, useState, type CSSProperties } from 'react';
import { siteConfig } from '@/config/site';
import { latestVideoEpisode } from '@/domain/home-discovery';
import { vhsProjectArtwork } from '@/domain/vhs-project-artwork';
import { videoClubTapeSlot } from '@/domain/video-club';
import {
  PROJECT_CREATORS,
  type PersonalProject,
  type ProjectCreator,
} from '@/domain/personal-projects';
import { replayPosterArtwork } from '@/domain/replay-posters';
import { sandboxRoom, type SandboxRoomId } from '@/domain/sandbox-rooms';
import type { Episode } from '@/domain/schema';
import { EpisodeArtwork } from './episode-artwork';
import { LocalizedLink as Link, LocalizedDate, LocalizedElement, Text } from './localization';
import styles from './sandbox-room-content.module.css';

export interface SandboxRoomContentProps {
  roomId: SandboxRoomId;
  episodes: readonly Episode[];
  projects: readonly PersonalProject[];
  minimalStudio?: boolean;
  heroCopy?: { eyebrow: string; title: string; description: string };
  onRoomChange?: (roomId: SandboxRoomId) => void;
}

/** Trois rangées de trois boîtes par auteur ; la pagination conserve tout son catalogue. */
export function projectBayPage(
  projects: readonly PersonalProject[],
  creator: ProjectCreator,
  requestedPage: number,
) {
  const collection = projects.filter((project) => project.creator === creator);
  const pageCount = Math.ceil(collection.length / 9);
  const page = Number.isFinite(requestedPage)
    ? Math.max(0, Math.min(Math.max(0, pageCount - 1), Math.trunc(requestedPage)))
    : 0;
  return {
    items: collection.slice(page * 9, page * 9 + 9),
    total: collection.length,
    page,
    pageCount,
  };
}

function ProjectBay({
  projects,
  creator,
  bayIndex,
}: {
  projects: readonly PersonalProject[];
  creator: ProjectCreator;
  bayIndex: number;
}) {
  const [requestedPage, setPage] = useState(0);
  const page = projectBayPage(projects, creator, requestedPage);
  const listId = useId();
  return (
    <section
      className={styles['projectBay']}
      aria-label={PROJECT_CREATORS[creator].name}
      style={{ '--bay-x': `${27 + bayIndex * 23}%` } as CSSProperties}
    >
      <h3 className={styles['bayName']}>{PROJECT_CREATORS[creator].name}</h3>
      <ul id={listId}>
        {page.items.map((project, slot) => {
          const artwork = vhsProjectArtwork(project);
          const position = videoClubTapeSlot(bayIndex, slot);
          return (
            <li
              key={project.slug}
              style={
                {
                  '--tape-x': `${position.x * 100}%`,
                  '--tape-y': `${position.y * 100}%`,
                } as CSSProperties
              }
            >
              <Link
                href={`/nos-projets/${project.slug}`}
                className={styles['tape']}
                title={project.name}
                style={{ '--tape-accent': project.color } as CSSProperties}
                data-analytics-event="discovery_open"
                data-analytics-destination="projects"
                data-analytics-placement="home"
                data-vhs-project={project.slug}
              >
                <span className={styles['tapeTop']} aria-hidden="true">
                  SANDBOX <span>VHS</span>
                </span>
                <span className={styles['tapeArt']} aria-hidden="true">
                  {artwork ? (
                    <Image src={artwork} alt="" fill sizes="(max-width: 900px) 100px, 130px" />
                  ) : (
                    <span className={styles['initial']}>{project.name.slice(0, 2)}</span>
                  )}
                </span>
                <strong className={styles['tapeTitle']}>{project.name}</strong>
                <span className={styles['tapeCreator']}>
                  {PROJECT_CREATORS[project.creator].name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {page.pageCount > 1 ? (
        <div className={styles['bayPagination']}>
          <LocalizedElement
            as="button"
            type="button"
            aria-label="Précédent"
            aria-controls={listId}
            disabled={page.page === 0}
            onClick={() => {
              setPage(page.page - 1);
            }}
          >
            ←
          </LocalizedElement>
          <span role="status" aria-live="polite">
            {page.page + 1} / {page.pageCount}
          </span>
          <LocalizedElement
            as="button"
            type="button"
            aria-label="Suivant"
            aria-controls={listId}
            disabled={page.page >= page.pageCount - 1}
            onClick={() => {
              setPage(page.page + 1);
            }}
          >
            →
          </LocalizedElement>
        </div>
      ) : null}
    </section>
  );
}

function ProjectShelf({ projects }: { projects: readonly PersonalProject[] }) {
  if (projects.length === 0)
    return (
      <p className={styles['empty']}>
        <Text>Les projets seront bientôt disponibles.</Text>
      </p>
    );

  return (
    <LocalizedElement as="div" className={styles['projects']} aria-label="Nos projets">
      {(['lou', 'loic', 'nicolas'] as const).map((creator, index) => (
        <ProjectBay key={creator} projects={projects} creator={creator} bayIndex={index} />
      ))}
    </LocalizedElement>
  );
}

/** Pagination bornée des seuls replays publiés. Aucun épisode hors page n'est monté. */
export function cinemaReplayPage(
  episodes: readonly Episode[],
  requestedPage: number,
  requestedPageSize = 6,
) {
  const replays = episodes
    .filter((episode) => episode.status !== 'draft' && episode.platforms.youtubeId)
    .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.number - a.number);
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.max(1, Math.min(6, Math.trunc(requestedPageSize)))
    : 6;
  const pageCount = Math.ceil(replays.length / pageSize);
  const page = Number.isFinite(requestedPage)
    ? Math.max(0, Math.min(Math.max(0, pageCount - 1), Math.trunc(requestedPage)))
    : 0;
  const start = page * pageSize;
  return {
    items: replays.slice(start, start + pageSize),
    page,
    pageCount,
    pageSize,
    total: replays.length,
    from: replays.length ? start + 1 : 0,
    to: Math.min(start + pageSize, replays.length),
  };
}

function CinemaPosters({ episodes }: { episodes: readonly Episode[] }) {
  const postersId = useId();
  const [requestedPage, setPage] = useState(0);
  const page = cinemaReplayPage(episodes, requestedPage);
  if (page.total === 0)
    return (
      <p className={styles['empty']}>
        <Text>Aucun replay disponible pour le moment.</Text>
      </p>
    );

  return (
    <div className={styles['cinemaCollection']}>
      <LocalizedElement
        as="ul"
        id={postersId}
        className={styles['posters']}
        aria-label="Les replays"
      >
        {page.items.map((episode) => (
          <li key={episode.number}>
            <Link
              className={styles['poster']}
              href={`/episodes/${episode.number}`}
              data-analytics-event="discovery_open"
              data-analytics-destination="podcast"
              data-analytics-placement="home"
            >
              <span className={styles['posterArt']}>
                <EpisodeArtwork
                  artwork={replayPosterArtwork(episode)}
                  videoId={episode.platforms.youtubeId}
                  title={episode.title}
                  number={episode.number}
                  portrait
                  cinema
                  loading="eager"
                  sizes="(max-width: 600px) 115px, 160px"
                />
                <span className={styles['play']} aria-hidden="true">
                  ▶
                </span>
              </span>
              <span className={styles['posterCaption']}>
                <span>
                  <Text values={{ number: episode.number }}>{'Épisode {number}'}</Text>
                  <span aria-hidden="true"> · </span>
                  <LocalizedDate iso={episode.publishedAt} format="short" />
                </span>
                <strong>
                  <Text>{episode.title}</Text>
                </strong>
              </span>
            </Link>
          </li>
        ))}
      </LocalizedElement>
      {page.pageCount > 1 ? (
        <div className={styles['cinemaPagination']} data-cinema-pagination>
          <LocalizedElement
            as="button"
            type="button"
            aria-label="Replays précédents"
            aria-controls={postersId}
            disabled={page.page === 0}
            onClick={() => {
              setPage(Math.max(0, page.page - 1));
            }}
          >
            <span aria-hidden="true">←</span>
            <Text>Replays précédents</Text>
          </LocalizedElement>
          <p role="status" aria-live="polite" aria-atomic="true">
            <Text values={{ from: page.from, to: page.to, total: page.total }}>
              {'Replays {from}–{to} sur {total}'}
            </Text>
          </p>
          <LocalizedElement
            as="button"
            type="button"
            aria-label="Replays suivants"
            aria-controls={postersId}
            disabled={page.page >= page.pageCount - 1}
            onClick={() => {
              setPage(Math.min(page.pageCount - 1, page.page + 1));
            }}
          >
            <Text>Replays suivants</Text>
            <span aria-hidden="true">→</span>
          </LocalizedElement>
        </div>
      ) : null}
    </div>
  );
}

/** Contenu HTML lisible et accessible, indépendant du rendu WebGL du décor. */
export function SandboxRoomContent({
  roomId,
  episodes,
  projects,
  minimalStudio = false,
  heroCopy,
  onRoomChange,
}: SandboxRoomContentProps) {
  const room = sandboxRoom(roomId);
  const latest = latestVideoEpisode(episodes);
  const isStudio = roomId === 'studio';
  const hero = heroCopy ?? {
    eyebrow: siteConfig.heroEyebrow,
    title: siteConfig.heroTitle,
    description: siteConfig.heroDek,
  };
  if (isStudio && minimalStudio)
    return (
      <section
        className={styles['content']}
        data-room-content="studio"
        data-minimal-studio
        aria-labelledby="room-title-studio"
      >
        <div className={styles['deskInscription']} data-studio-inscription>
          <div className={styles['copy']}>
            <h1 id="room-title-studio" tabIndex={-1}>
              <Text>{hero.title}</Text>
            </h1>
            <p className={styles['studioIntroduction']}>
              <Text>{hero.description}</Text>
            </p>
          </div>
          <a
            href={siteConfig.platforms.youtube}
            className={`${styles['primary']} ${styles['studioVideos']}`}
            target="_blank"
            rel="noopener noreferrer"
            data-studio-videos
            data-analytics-event="youtube_open"
            data-analytics-placement="home"
          >
            <Text>Nos vidéos</Text>
            <span aria-hidden="true">↗</span>
          </a>
          <p className={styles['studioHint']} data-studio-navigation>
            <Text>Explore les trois salles via le portail ou le bouton en haut à droite.</Text>
          </p>
        </div>
      </section>
    );
  return (
    <section
      className={styles['content']}
      data-room-content={roomId}
      aria-labelledby={`room-title-${roomId}`}
      style={{ '--room-accent': room.accent } as CSSProperties}
    >
      {roomId === 'projects' ? <ProjectShelf projects={projects} /> : null}
      {roomId === 'cinema' ? <CinemaPosters episodes={episodes} /> : null}
      <div className={styles['caption']}>
        <div className={styles['copy']}>
          <p className={styles['eyebrow']}>
            <span className={styles['number']}>{room.number}</span>
            <Text>{isStudio ? hero.eyebrow : room.subtitle}</Text>
          </p>
          {isStudio ? (
            <h1 id={`room-title-${roomId}`} tabIndex={-1}>
              <Text>{hero.title}</Text>
            </h1>
          ) : (
            <h2 id={`room-title-${roomId}`} tabIndex={-1}>
              <Text>{room.title}</Text>
            </h2>
          )}
          <p className={styles['description']}>
            <Text>{isStudio ? hero.description : room.description}</Text>
          </p>
        </div>
        <div className={styles['actions']}>
          <Link
            href={isStudio && latest ? `/episodes/${latest.number}` : room.href}
            className={styles['primary']}
            data-analytics-event="discovery_open"
            data-analytics-destination={isStudio || roomId === 'cinema' ? 'podcast' : roomId}
            data-analytics-placement="home"
          >
            <Text>{room.action}</Text>
            <span aria-hidden="true">↗</span>
          </Link>
          {isStudio && onRoomChange ? (
            <button
              className={styles['secondary']}
              type="button"
              onClick={() => {
                onRoomChange('projects');
              }}
            >
              <Text>Découvrir nos projets</Text>
              <span aria-hidden="true">→</span>
            </button>
          ) : null}
          {isStudio ? (
            <Link href="/about" className={styles['team']}>
              Lou, Loïc &amp; Nicolas
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
