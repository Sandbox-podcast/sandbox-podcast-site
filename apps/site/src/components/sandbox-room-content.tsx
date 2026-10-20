'use client';

import Image from 'next/image';
import { useLinkStatus } from 'next/link';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { localizedHref } from '@/i18n/routing';
import { siteConfig } from '@/config/site';
import { latestVideoEpisode } from '@/domain/home-discovery';
import { HOME_PROJECT_ARTWORK } from '@/domain/home-project-artwork';
import {
  PROJECT_CREATORS,
  type PersonalProject,
  type ProjectCreator,
} from '@/domain/personal-projects';
import { replayPosterArtwork } from '@/domain/replay-posters';
import { SANDBOX_CHART_TERMINALS, sandboxRoom, type SandboxRoomId } from '@/domain/sandbox-rooms';
import type { Episode } from '@/domain/schema';
import {
  HISTORY_ERAS,
  historyDate,
  historyEventAnchor,
  historyTimestamp,
  sortHistory,
  type TimeMachineData,
} from '@/domain/time-machine';
import { EpisodeArtwork } from './episode-artwork';
import {
  LocalizedLink as Link,
  LocalizedDate,
  LocalizedElement,
  Text,
  useLocalization,
} from './localization';
import styles from './sandbox-room-content.module.css';

export interface SandboxRoomContentProps {
  roomId: SandboxRoomId;
  episodes: readonly Episode[];
  projects: readonly PersonalProject[];
  newsAvailable?: boolean;
  minimalStudio?: boolean;
  heroCopy?: { eyebrow: string; title: string; description: string };
  historyData?: TimeMachineData | undefined;
  onRoomChange?: (roomId: SandboxRoomId) => void;
}

function RankingsWall() {
  const { locale } = useLocalization();
  useEffect(() => {
    // Next désactive le préchargement automatique en développement : anticiper la compilation
    // dès l'entrée dans la salle, plutôt que de la faire attendre au premier clic.
    if (process.env.NODE_ENV !== 'development') return;
    const controller = new AbortController();
    void Promise.allSettled(
      SANDBOX_CHART_TERMINALS.map(({ href }) =>
        fetch(localizedHref(href, locale), { method: 'HEAD', signal: controller.signal }),
      ),
    );
    return () => {
      controller.abort();
    };
  }, [locale]);
  return (
    <LocalizedElement as="ul" className={styles['terminals']} aria-label="Classements">
      {SANDBOX_CHART_TERMINALS.map((terminal) => (
        <li key={terminal.href}>
          <Link href={terminal.href} prefetch={true} className={styles['terminal']}>
            <span className={styles['terminalScreen']}>
              <span className={styles['terminalSymbol']} aria-hidden="true">
                {terminal.symbol}
              </span>
              <strong>{terminal.label}</strong>
              <span className={styles['terminalDetail']}>
                <Text>{terminal.detail}</Text>
              </span>
            </span>
            <span className={styles['terminalFoot']} aria-hidden="true">
              <span /> SANDBOX CHARTS <span>↗</span>
            </span>
            <RankingOpeningStatus />
          </Link>
        </li>
      ))}
    </LocalizedElement>
  );
}

function RankingOpeningStatus() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span className={styles['terminalPending']} role="status">
      <Text>Ouverture du classement…</Text>
    </span>
  ) : null;
}

function HistoryWall({ data }: { data?: TimeMachineData | undefined }) {
  const events = sortHistory(data?.events ?? []);
  const [selectedId, setSelectedId] = useState<string>();
  const rail = useRef<HTMLOListElement>(null);
  const detailId = useId();
  const index = Math.max(
    0,
    events.findIndex((event) => event.id === selectedId),
  );
  const selected = events[index];
  if (!selected || !data)
    return (
      <p className={styles['empty']}>
        <Text>La chronologie sera bientôt disponible.</Text>
      </p>
    );
  const from = historyTimestamp(String(data.fromYear));
  const span = historyTimestamp(String(data.toYear + 1)) - from;
  const selectedYear = Number(selected.date.slice(0, 4));
  function selectEvent(next: number, focus = false) {
    const event = events[next];
    if (!event) return;
    setSelectedId(event.id);
    const item = rail.current?.querySelector<HTMLButtonElement>(`[data-history-index="${next}"]`);
    if (item && rail.current) {
      const track = rail.current.getBoundingClientRect();
      const bounds = item.getBoundingClientRect();
      rail.current.scrollTo({
        left: rail.current.scrollLeft + bounds.left - track.left - (track.width - bounds.width) / 2,
        behavior: 'instant',
      });
      if (focus) item.focus({ preventScroll: true });
    }
  }
  return (
    <section className={styles['historyTimeline']} data-history-timeline>
      <header className={styles['historyHeader']}>
        <strong>
          {data.fromYear} — {data.toYear}
        </strong>
        <span>
          {events.length} <Text>événements documentés.</Text>
        </span>
      </header>
      <LocalizedElement
        as="nav"
        className={styles['historyEras']}
        aria-label="Périodes de l'histoire de l'IA"
      >
        {HISTORY_ERAS.map((era) => {
          const first = events.findIndex((event) => {
            const year = Number(event.date.slice(0, 4));
            return year >= era.from && year <= era.to;
          });
          return (
            <button
              key={era.id}
              type="button"
              disabled={first < 0}
              aria-pressed={selectedYear >= era.from && selectedYear <= era.to}
              onClick={() => {
                selectEvent(first);
              }}
            >
              <span>
                {era.from}–{era.to}
              </span>
              <Text>{era.label}</Text>
            </button>
          );
        })}
      </LocalizedElement>
      <div className={styles['historyOverview']} aria-hidden="true">
        <div className={styles['historyOverviewLine']}>
          {events.map((event) => (
            <i
              key={event.id}
              data-active={event.id === selected.id}
              style={{ left: `${((historyTimestamp(event.date) - from) / span) * 100}%` }}
            />
          ))}
        </div>
        <div className={styles['historyAxis']}>
          <span>{data.fromYear}</span>
          <span>{Math.round((data.fromYear + data.toYear) / 2)}</span>
          <span>{data.toYear}</span>
        </div>
      </div>
      <p className={styles['historyHint']}>
        <Text>Choisissez une période, puis parcourez les événements.</Text>
      </p>
      <ol
        ref={rail}
        className={styles['historyRail']}
        data-history-rail
        onKeyDown={(event) => {
          const next =
            event.key === 'ArrowRight'
              ? Math.min(events.length - 1, index + 1)
              : event.key === 'ArrowLeft'
                ? Math.max(0, index - 1)
                : event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? events.length - 1
                    : null;
          if (next === null) return;
          event.preventDefault();
          selectEvent(next, true);
        }}
      >
        {events.map((event, eventIndex) => (
          <li key={event.id}>
            <button
              type="button"
              data-history-index={eventIndex}
              aria-pressed={event.id === selected.id}
              aria-controls={detailId}
              tabIndex={event.id === selected.id ? 0 : -1}
              onClick={() => {
                selectEvent(eventIndex);
              }}
            >
              <time dateTime={event.date}>{historyDate(event.date)}</time>
              <strong>{event.shortTitle}</strong>
            </button>
          </li>
        ))}
      </ol>
      <article
        id={detailId}
        className={styles['historyDetail']}
        aria-live="polite"
        aria-atomic="true"
      >
        <div>
          <span className={styles['historyDetailDate']}>
            <time dateTime={selected.date}>{historyDate(selected.date)}</time> ·{' '}
            {selected.organization}
          </span>
          <h3>{selected.title}</h3>
          <p>{selected.summary}</p>
          <Link href={`/time-machine#${historyEventAnchor(selected.id)}`}>
            <Text>Lire l’événement et ses sources</Text> <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className={styles['historyNavigation']}>
          <LocalizedElement
            as="button"
            type="button"
            aria-label="Événement précédent"
            disabled={index === 0}
            onClick={() => {
              selectEvent(index - 1);
            }}
          >
            ←
          </LocalizedElement>
          <span>
            {index + 1} / {events.length}
          </span>
          <LocalizedElement
            as="button"
            type="button"
            aria-label="Événement suivant"
            disabled={index === events.length - 1}
            onClick={() => {
              selectEvent(index + 1);
            }}
          >
            →
          </LocalizedElement>
        </div>
      </article>
    </section>
  );
}

function NewsTerminal() {
  return (
    <Link href="/news" className={styles['newsTerminal']} data-news-terminal>
      <span className={styles['radarDisplay']} aria-hidden="true">
        <span className={styles['radarBeam']} />
      </span>
      <span className={styles['radarCopy']}>
        <span className={styles['radarLabel']}>SANDBOX / NEWS</span>
        <strong>
          <Text>IA & développement</Text>
        </strong>
        <span className={styles['radarAction']}>
          <Text>Ouvrir le fil</Text> <span aria-hidden="true">↗</span>
        </span>
      </span>
    </Link>
  );
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
          const artwork =
            HOME_PROJECT_ARTWORK[project.slug] ??
            project.cover?.src ??
            project.images[0]?.src ??
            project.icon?.src;
          return (
            <li
              key={project.slug}
              style={
                {
                  '--tape-x': `${21 + bayIndex * 23 + (slot % 3) * 6}%`,
                  '--tape-y': `${[43.5, 55, 66][Math.floor(slot / 3)]}%`,
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
  requestedPageSize = 2,
) {
  const replays = episodes
    .filter((episode) => episode.status !== 'draft' && episode.platforms.youtubeId)
    .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.number - a.number);
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.max(1, Math.min(2, Math.trunc(requestedPageSize)))
    : 2;
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
  newsAvailable = true,
  minimalStudio = false,
  heroCopy,
  historyData,
  onRoomChange,
}: SandboxRoomContentProps) {
  const room = sandboxRoom(roomId);
  const latest = latestVideoEpisode(episodes);
  const isStudio = roomId === 'studio';
  const newsUnavailable = roomId === 'news' && !newsAvailable;
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
          <p className={styles['studioHint']} data-studio-navigation>
            <Text>Explore les six salles via le portail ou le bouton en haut à droite.</Text>
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
      {roomId === 'rankings' ? <RankingsWall /> : null}
      {roomId === 'history' ? <HistoryWall data={historyData} /> : null}
      {roomId === 'news' && newsAvailable ? <NewsTerminal /> : null}
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
          {newsUnavailable ? (
            <p className={styles['availability']}>
              <Text>Les actualités seront bientôt disponibles.</Text>
            </p>
          ) : (
            <Link
              href={isStudio && latest ? `/episodes/${latest.number}` : room.href}
              className={styles['primary']}
              data-analytics-event="discovery_open"
              data-analytics-destination={
                isStudio || roomId === 'cinema'
                  ? 'podcast'
                  : roomId === 'rankings'
                    ? 'charts'
                    : roomId === 'history'
                      ? 'time-machine'
                      : roomId
              }
              data-analytics-placement="home"
            >
              <Text>{room.action}</Text>
              <span aria-hidden="true">↗</span>
            </Link>
          )}
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
