import Image from 'next/image';
import { EpisodeArtwork } from './episode-artwork';
import { LocalizedLink as Link, Text, LocalizedDate } from './localization';
import { StudioScroll } from './studio-scroll';
import { siteConfig } from '@/config/site';
import {
  HOME_STUDIO_WIDE_IMAGE,
  HOME_STUDIO_REVERSE_IMAGE,
  STUDIO_VIDEO_CLUB_HREF,
} from '@/domain/home-studio';
import { replayPosterArtwork } from '@/domain/replay-posters';
import { latestVideoEpisode } from '@/domain/home-discovery';
import type { Episode } from '@/domain/schema';
import styles from './studio-landing.module.css';

export function StudioLanding({
  episodes,
  newsAvailable,
  videoClubEnabled,
}: {
  episodes: readonly Episode[];
  newsAvailable: boolean;
  videoClubEnabled: boolean;
}) {
  const latest = latestVideoEpisode(episodes);
  const replays = episodes
    .filter((episode) => episode.status !== 'draft' && episode.platforms.youtubeId)
    .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.number - a.number)
    .slice(0, 8);
  const spotify = siteConfig.platforms.spotify;
  return (
    <StudioScroll>
      <div className={styles['front']} data-studio-front>
        <figure className={styles['set']} aria-label="Plateau de Sandbox">
          <div className={styles['setArtwork']}>
            <Image
              src={HOME_STUDIO_WIDE_IMAGE}
              alt=""
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 900px) 100vw, min(100vw, 178vh)"
              quality={75}
            />
            <div className={styles['practicalLights']} aria-hidden="true">
              {['charts', 'news', 'projects', 'history'].map((lamp) => (
                <div key={lamp} className={styles['lightPass']} data-lamp={lamp}>
                  <Image
                    src={HOME_STUDIO_WIDE_IMAGE}
                    alt=""
                    fill
                    loading="eager"
                    sizes="(max-width: 900px) 100vw, min(100vw, 178vh)"
                    quality={75}
                  />
                </div>
              ))}
            </div>
            <nav className={styles['objects']} aria-label="Explorer le plateau">
              <Link
                href="/charts"
                className={styles['object']}
                data-object="charts"
                aria-label="Classements"
                data-analytics-event="discovery_open"
                data-analytics-destination="charts"
                data-analytics-placement="home"
              />
              {newsAvailable ? (
                <Link
                  href="/news"
                  className={styles['object']}
                  data-object="news"
                  aria-label="Actualités"
                />
              ) : null}
              {videoClubEnabled ? (
                <Link
                  href={STUDIO_VIDEO_CLUB_HREF}
                  className={styles['object']}
                  data-object="projects"
                  aria-label="Découvrir le vidéoclub des projets"
                  data-analytics-event="discovery_open"
                  data-analytics-destination="projects"
                  data-analytics-placement="home"
                />
              ) : null}
              <Link
                href="/time-machine"
                className={styles['object']}
                data-object="history"
                aria-label="Time Machine"
                data-analytics-event="discovery_open"
                data-analytics-destination="time-machine"
                data-analytics-placement="home"
              />
            </nav>
          </div>
        </figure>
        <div className={styles['setShade']} aria-hidden="true" />
      </div>
      <div className={styles['copy']} data-studio-copy>
        <div className={styles['heroHeading']}>
          <p className={styles['eyebrow']}>
            <span />
            <Text>{siteConfig.heroEyebrow}</Text>
          </p>
          <h1 id="discovery-title">
            {siteConfig.heroTitle === "Ce que l'IA change pour ceux qui construisent." ? (
              <>
                <Text>Ce que l'IA change</Text>{' '}
                <em>
                  <Text>pour ceux qui construisent.</Text>
                </em>
              </>
            ) : (
              <Text>{siteConfig.heroTitle}</Text>
            )}
          </h1>
        </div>
        <div className={styles['copyBottom']}>
          <p className={styles['description']}>
            <Text>{siteConfig.heroDek}</Text>
          </p>
          <div className={styles['actions']}>
            <Link
              href={latest ? `/episodes/${latest.number}` : '/podcast'}
              className={styles['primaryAction']}
              data-analytics-event="discovery_open"
              data-analytics-destination="podcast"
              data-analytics-placement="home"
            >
              <span aria-hidden="true">▶</span>
              <Text>Voir l'émission</Text>
            </Link>
            <Link
              href="/nos-projets"
              className={styles['secondaryAction']}
              data-analytics-event="discovery_open"
              data-analytics-destination="projects"
              data-analytics-placement="home"
            >
              <Text>Découvrir nos projets</Text>
            </Link>
            <div className={styles['platforms']}>
              <a
                href={siteConfig.platforms.youtube}
                target="_blank"
                rel="noopener noreferrer"
                data-analytics-event="youtube_open"
                data-analytics-placement="home"
              >
                YouTube
                <span className="sr-only">
                  <Text> (nouvel onglet)</Text>
                </span>
              </a>
              {new URL(spotify).pathname !== '/' ? (
                <a href={spotify} target="_blank" rel="noopener noreferrer">
                  Spotify
                  <span className="sr-only">
                    <Text> (nouvel onglet)</Text>
                  </span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
        <a className={styles['scrollCue']} href="#studio-lights">
          <span aria-hidden="true">↓</span>
          <Text>Scroll pour allumer le plateau</Text>
        </a>
        <a className={styles['skipToReplays']} href="#studio-replays">
          <Text>Voir les replays</Text>
        </a>
      </div>
      <section
        className={styles['wall']}
        data-studio-wall
        aria-labelledby="home-replays-title"
        data-home-section="replays"
      >
        <div className={styles['reverseRoom']}>
          <Image
            src={HOME_STUDIO_REVERSE_IMAGE}
            alt=""
            fill
            sizes="(max-width: 900px) 160vw, min(100vw, 178vh)"
            quality={90}
          />
          <header className={styles['wallHeading']}>
            <p className={styles['eyebrow']}>
              <Text>Depuis le plateau</Text>
            </p>
            <h2 id="home-replays-title">
              <Text>Les émissions en replay.</Text>
            </h2>
          </header>
          {replays.length ? (
            <ul className={styles['posters']} data-count={replays.length}>
              {replays.map((episode) => {
                const artwork = replayPosterArtwork(episode);
                return (
                  <li key={episode.number}>
                    <Link
                      href={`/episodes/${episode.number}`}
                      className={styles['poster']}
                      aria-label={episode.title}
                      data-analytics-event="discovery_open"
                      data-analytics-destination="podcast"
                      data-analytics-placement="home"
                      data-analytics-episode={episode.number}
                    >
                      <span className={styles['posterImage']}>
                        {artwork ? (
                          <EpisodeArtwork
                            artwork={artwork}
                            videoId={episode.platforms.youtubeId}
                            number={episode.number}
                            title={episode.title}
                            portrait
                            sizes="(max-width: 600px) 70vw, (max-width: 900px) 32vw, 25vh"
                          />
                        ) : (
                          <span>SANDBOX</span>
                        )}
                        <span className={styles['play']} aria-hidden="true">
                          ▶
                        </span>
                      </span>
                      <div className={styles['posterCopy']}>
                        <span>
                          <LocalizedDate iso={episode.publishedAt} format="short" />
                        </span>
                        <h3>
                          <Text>{episode.title}</Text>
                        </h3>
                        <span className={styles['posterWatch']}>
                          <Text>Voir le replay</Text>
                          <b aria-hidden="true">↗</b>
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles['empty']}>
              <Text>Les prochaines émissions seront à retrouver ici.</Text>
            </p>
          )}
          <Link href="/podcast" className={styles['allReplays']}>
            <Text>Toutes les émissions</Text>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </StudioScroll>
  );
}
