import Image from 'next/image';
import { Text, LocalizedLink as Link, LocalizedDate } from './localization';
import { DiscoveryStory } from './discovery-story';
import { CinematicStage } from './cinematic-stage';
import { HomeMotion } from './home-motion';
import { HomeSignal } from './home-signal';
import { StudioDoor } from './studio-door';
import { StudioEasterEggs } from './studio-easter-eggs';
import { homeProfiles } from '@/domain/home-story';
import { siteConfig } from '@/config/site';
import {
  HOME_STUDIO_IMAGE,
  HOME_STUDIO_DOOR_IMAGE,
  HOME_STUDIO_PEOPLE,
  STUDIO_VIDEO_CLUB_HREF,
} from '@/domain/home-studio';
import { episodeArtwork } from '@/domain/episode-artwork';
import { latestVideoEpisode, episodeYoutubeUrl } from '@/domain/home-discovery';
import type { Episode, Host } from '@/domain/schema';
import type { PersonalProject } from '@/domain/personal-projects';
import styles from './discovery-home.module.css';

export function DiscoveryHome({
  episodes,
  hosts = [],
  projects = [],
  videoClubEnabled = false,
}: {
  episodes: readonly Episode[];
  hosts?: readonly Host[];
  projects?: readonly PersonalProject[];
  videoClubEnabled?: boolean;
}) {
  const latest = latestVideoEpisode(episodes);
  const artwork = latest ? episodeArtwork(latest) : undefined;
  const team = homeProfiles(hosts);
  const spotify = siteConfig.platforms.spotify;
  const spotifyAvailable = new URL(spotify).pathname !== '/';
  return (
    <HomeMotion className={styles['page']}>
      <div data-home="editorial">
        <CinematicStage>
          <figure className={styles['stage']} aria-label="Plateau de Sandbox">
            <div className={styles['stageArtwork']} data-depth-stage>
              <Image
                src={videoClubEnabled ? HOME_STUDIO_DOOR_IMAGE : HOME_STUDIO_IMAGE}
                alt=""
                fill
                loading="eager"
                sizes="(max-width: 900px) 1px, max(100vw, 178vh)"
                quality={90}
              />
              <div className={styles['studioPeople']}>
                {team.map((host) => {
                  const person = Object.entries(HOME_STUDIO_PEOPLE).find(
                    ([slug]) => slug === host.slug,
                  )?.[1];
                  return host.photo && person ? (
                    <div key={host.slug} className={styles['studioPerson']} data-person={host.slug}>
                      <div
                        className={styles['studioPersonArtwork']}
                        style={{
                          aspectRatio: `${person.width} / ${person.height}`,
                          translate: `0 ${(-person.headTop / person.height) * 100}%`,
                        }}
                      >
                        <Image
                          src={person.photo}
                          alt={host.name}
                          fill
                          loading="eager"
                          quality={90}
                          sizes="(max-width: 900px) 1px, 540px"
                        />
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
              <StudioEasterEggs />
              {videoClubEnabled ? <StudioDoor /> : null}
            </div>
          </figure>
          <div className={styles['stageShade']} aria-hidden="true" />
          <p className={styles['showLabel']}>
            <span aria-hidden="true" />
            <Text>Le Talk Show IA & tech</Text>
          </p>
          <div className={styles['heroCopy']}>
            <p className={styles['hosts']}>
              <span>Lou</span>
              <span>Loïc</span>
              <span>Nico</span>
            </p>
            <h1 id="discovery-title">
              <Text>Gardez une longueur</Text>{' '}
              <em>
                <Text>d'avance sur la tech.</Text>
              </em>
            </h1>
          </div>
          <div className={styles['heroBottom']}>
            <p className={styles['description']}>
              <Text>
                Chaque semaine, retrouvez Lou, Loïc et Nico pour décrypter l'actualité de l'IA et de
                la tech, découvrir les outils qui valent le détour et confronter nos expériences.
              </Text>
            </p>
            <div className={styles['heroActions']}>
              <Link
                href={latest ? `/episodes/${latest.number}` : '/podcast'}
                className={styles['primaryAction']}
                data-analytics-event="discovery_open"
                data-analytics-destination="podcast"
                data-analytics-placement="home"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                <Text>{latest ? 'Regarder le dernier épisode' : "Découvrir l'émission"}</Text>
              </Link>
              <div className={styles['platforms']}>
                <a
                  href={siteConfig.platforms.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['platformLink']}
                  data-analytics-event="youtube_open"
                  data-analytics-placement="home"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.6 4.6 12 4.6 12 4.6s-5.6 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.9.5 7.5.5 7.5.5s5.6 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.2V8.8l5.6 3.2-5.6 3.2Z" />
                  </svg>
                  YouTube
                  <span className="sr-only">
                    {' '}
                    <Text>(nouvel onglet)</Text>
                  </span>
                </a>
                {spotifyAvailable ? (
                  <a
                    href={spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['platformLink']}
                  >
                    <SpotifyIcon />
                    Spotify
                    <span className="sr-only">
                      {' '}
                      <Text>(nouvel onglet)</Text>
                    </span>
                  </a>
                ) : (
                  <button className={styles['platformLink']} disabled title="Lien Spotify à venir">
                    <SpotifyIcon />
                    Spotify
                  </button>
                )}
              </div>
              {videoClubEnabled ? (
                <Link
                  href={STUDIO_VIDEO_CLUB_HREF}
                  className={styles['mobileVideoClub']}
                  aria-label="Découvrir le vidéoclub des projets"
                >
                  <Image
                    src="/video-club/entrance-cinematic-v2.webp"
                    alt=""
                    width={1672}
                    height={941}
                    sizes="(max-width: 600px) 92vw, 560px"
                    quality={90}
                  />
                  <span className={styles['mobileVideoClubLabel']}>
                    <Text>Le vidéoclub</Text>
                    <span aria-hidden="true">↗</span>
                  </span>
                </Link>
              ) : null}
            </div>
          </div>
          <a className={styles['scrollCue']} href="#home-story">
            <span className={styles['scrollLine']} aria-hidden="true" />
            <Text>La suite</Text>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M12 3v18m-6-6 6 6 6-6" />
            </svg>
          </a>
        </CinematicStage>
        <DiscoveryStory hosts={hosts} projects={projects} />
        {latest ? (
          <article
            className={`wrap ${styles['episode']}`}
            aria-labelledby="home-episode-title"
            data-home-section="episode"
          >
            <div className={styles['episodeCopy']} data-reveal="title">
              <p className={styles['episodeMeta']} data-signal-contact>
                <span className={styles['chapterNumber']} aria-hidden="true">
                  04
                </span>
                <Text>Dernier épisode</Text>
                <span aria-hidden="true">/</span>
                <LocalizedDate iso={latest.publishedAt} format="short" />
              </p>
              <h2 id="home-episode-title">
                <Link href={`/episodes/${latest.number}`}>
                  <Text>{latest.title}</Text>
                </Link>
              </h2>
              <a
                href={episodeYoutubeUrl(latest)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles['youtubeLink']}
                data-analytics-event="youtube_open"
                data-analytics-placement="home"
                data-analytics-episode={latest.number}
              >
                <Text>Voir sur YouTube</Text>
                <span aria-hidden="true">↗</span>
                <span className="sr-only">
                  <Text>(nouvel onglet)</Text>
                </span>
              </a>
            </div>
            <Link
              href={`/episodes/${latest.number}`}
              className={styles['artwork']}
              aria-label={latest.title}
              data-reveal="portal"
              data-reveal-side="right"
              data-reveal-delay="80"
            >
              {artwork ? (
                <Image src={artwork} alt="" fill sizes="(max-width: 1000px) 92vw, 55vw" />
              ) : (
                <span>SANDBOX / {latest.number}</span>
              )}
              <span className={styles['posterPlay']} aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </Link>
          </article>
        ) : null}
      </div>
      <HomeSignal />
    </HomeMotion>
  );
}

function SpotifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.5a.75.75 0 0 1-1 .25c-2.7-1.65-5.65-1.9-9.1-1.1a.75.75 0 1 1-.35-1.45c3.85-.9 7.25-.6 10.2 1.25a.75.75 0 0 1 .25 1.05Zm1.2-2.7a.9.9 0 0 1-1.25.3c-3.05-1.85-7.65-2.4-11.2-1.3a.9.9 0 1 1-.55-1.7c4.05-1.25 9.15-.65 12.7 1.5a.9.9 0 0 1 .3 1.2Zm.1-2.8C14.25 8.85 8.2 8.65 4.7 9.7a1.1 1.1 0 1 1-.65-2.1c4.05-1.2 10.75-.95 14.95 1.5a1.1 1.1 0 0 1-1.1 1.9Z" />
    </svg>
  );
}
