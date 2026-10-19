import Image from 'next/image';
import { Text, LocalizedLink as Link } from './localization';
import type { Host } from '@/domain/schema';
import { type PersonalProject } from '@/domain/personal-projects';
import { homeProfiles, homeProjects } from '@/domain/home-story';
import styles from './discovery-chapters.module.css';
import { HomeProjectSpotlight } from './home-project-spotlight';
import { HomeHostCard } from './home-host-card';

export function DiscoveryStory({
  hosts,
  projects,
  newsAvailable = false,
}: {
  hosts: readonly Host[];
  projects: readonly PersonalProject[];
  newsAvailable?: boolean;
}) {
  const team = homeProfiles(hosts);
  const selection = homeProjects(projects);
  return (
    <div id="home-story" className={styles['story']}>
      {team.length > 0 ? (
        <section
          className={`${styles['chapter']} ${styles['teamChapter']}`}
          aria-labelledby="home-team-title"
          data-home-section="team"
        >
          <header className={styles['chapterHeading']} data-reveal="title">
            <div>
              <p className={styles['eyebrow']} data-signal-contact>
                <span className={styles['chapterNumber']} aria-hidden="true">
                  01
                </span>
                <Text>Derrière les micros</Text>
              </p>
              <h2 id="home-team-title">
                <Text>Les voix de Sandbox.</Text>
              </h2>
            </div>
            <p className={styles['teamNames']} aria-hidden="true">
              {team.map((host) => (
                <span key={host.slug}>{host.name}</span>
              ))}
            </p>
          </header>
          <div
            className={styles['teamGrid']}
            role="region"
            aria-labelledby="home-team-title"
            aria-describedby="home-team-hint"
            tabIndex={0}
            data-home-team-rail="true"
          >
            {team.map((host, index) => (
              <div
                key={host.slug}
                className={styles['teamCard']}
                data-reveal="collection"
                data-reveal-side={index === 0 ? 'left' : index === 2 ? 'right' : undefined}
                data-reveal-delay={index * 90}
              >
                <HomeHostCard host={host} index={index} />
              </div>
            ))}
          </div>
          <p id="home-team-hint" className={styles['collectionHint']}>
            <Text>Fais défiler pour découvrir l'équipe.</Text>
            <ArrowIcon />
          </p>
        </section>
      ) : null}
      {selection.length > 0 ? (
        <section
          className={styles['projectsChapter']}
          aria-labelledby="home-projects-title"
          data-home-section="projects"
        >
          <div className={styles['chapter']}>
            <header className={styles['chapterHeading']} data-reveal="title">
              <div>
                <p className={styles['eyebrow']} data-signal-contact>
                  <span className={styles['chapterNumber']} aria-hidden="true">
                    02
                  </span>
                  <Text>Du Talk Show au concret</Text>
                </p>
                <h2 id="home-projects-title">
                  <Text>Ce que nous construisons.</Text>
                </h2>
              </div>
              <p className={styles['chapterIntro']}>
                <Text>Jeux, musique et outils : voici quelques projets de l'équipe.</Text>
              </p>
            </header>
            <div data-reveal="project" data-reveal-delay="90">
              <HomeProjectSpotlight projects={selection} />
            </div>
            <div className={styles['chapterFooter']}>
              <Link
                href="/nos-projets"
                className={styles['chapterAction']}
                data-analytics-event="discovery_open"
                data-analytics-destination="projects"
                data-analytics-placement="home"
              >
                <Text>Voir tous nos projets</Text>
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
      <section
        className={`${styles['chapter']} ${styles['exploreChapter']}`}
        aria-labelledby="home-explore-title"
        data-home-section="explore"
      >
        <header className={styles['chapterHeading']} data-reveal="title">
          <div>
            <p className={styles['eyebrow']} data-signal-contact>
              <span className={styles['chapterNumber']} aria-hidden="true">
                03
              </span>
              <Text>Pour aller plus loin</Text>
            </p>
            <h2 id="home-explore-title">
              <Text>Explorer l'IA.</Text>
            </h2>
          </div>
        </header>
        <div className={styles['exploreGrid']} data-news={newsAvailable ? 'true' : undefined}>
          <Link
            href="/time-machine"
            className={styles['exploreLink']}
            aria-labelledby="home-history-title"
            aria-describedby="home-history-description"
            data-analytics-event="discovery_open"
            data-analytics-destination="time-machine"
            data-analytics-placement="home"
            data-reveal="portal"
            data-reveal-side="left"
            data-reveal-delay="0"
          >
            <div className={styles['exploreArtwork']} aria-hidden="true">
              <Image
                src="/images/home/explore/time-machine-photographs-v2.webp"
                alt=""
                fill
                sizes="(max-width: 700px) calc(100vw - 48px), (max-width: 1280px) 50vw, 610px"
                quality={90}
              />
            </div>
            <span className={styles['panelKicker']}>
              <Text>Histoire de l'IA</Text>
            </span>
            <div className={styles['exploreCopy']}>
              <h3 id="home-history-title" className={styles['exploreName']}>
                Time Machine
              </h3>
              <p id="home-history-description" className={styles['exploreDescription']}>
                <Text>
                  Remonter l'histoire de l'IA, de ses premières avancées aux modèles actuels.
                </Text>
              </p>
            </div>
            <span className={styles['exploreArrow']} aria-hidden="true">
              <ArrowIcon />
            </span>
          </Link>
          <Link
            href="/charts"
            className={styles['exploreLink']}
            aria-labelledby="home-charts-title"
            aria-describedby="home-charts-description"
            data-analytics-event="discovery_open"
            data-analytics-destination="charts"
            data-analytics-placement="home"
            data-reveal="portal"
            data-reveal-side="right"
            data-reveal-delay="80"
          >
            <div
              className={`${styles['exploreArtwork']} ${styles['rankingArtwork']}`}
              aria-hidden="true"
            >
              <Image
                src="/images/home/explore/charts-editorial-v2.webp"
                alt=""
                fill
                sizes="(max-width: 700px) calc(100vw - 48px), (max-width: 1280px) 50vw, 610px"
                quality={90}
              />
            </div>
            <span className={styles['panelKicker']}>Sandbox Charts</span>
            <div className={styles['exploreCopy']}>
              <h3 id="home-charts-title" className={styles['exploreName']}>
                <Text>Les classements</Text>
              </h3>
              <p id="home-charts-description" className={styles['exploreDescription']}>
                <Text>
                  Explorer les projets, les modèles et les skills, avec leurs sources et leurs
                  méthodes.
                </Text>
              </p>
            </div>
            <span className={styles['exploreArrow']} aria-hidden="true">
              <ArrowIcon />
            </span>
          </Link>
          {newsAvailable ? (
            <Link
              href="/news"
              className={`${styles['exploreLink']} ${styles['newsLink']}`}
              aria-labelledby="home-news-title"
              aria-describedby="home-news-description"
              data-reveal="portal"
              data-reveal-side="right"
              data-reveal-delay="160"
            >
              <div className={styles['exploreArtwork']} aria-hidden="true">
                <Image
                  src="/images/home/explore/news-editorial-v1.webp"
                  alt=""
                  fill
                  sizes="(max-width: 700px) calc(100vw - 48px), (max-width: 1050px) 100vw, 33vw"
                  quality={90}
                />
              </div>
              <span className={styles['panelKicker']}>Sandbox News</span>
              <div className={styles['exploreCopy']}>
                <h3 id="home-news-title" className={styles['exploreName']}>
                  <Text>L'actualité</Text>
                </h3>
                <p id="home-news-description" className={styles['exploreDescription']}>
                  <Text>IA, développement et open source. Une phrase, sa source et sa date.</Text>
                </p>
              </div>
              <span className={styles['exploreArrow']} aria-hidden="true">
                <ArrowIcon />
              </span>
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
