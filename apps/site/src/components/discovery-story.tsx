import Image from 'next/image';
import { Text, LocalizedLink as Link } from './localization';
import type { Host } from '@/domain/schema';
import { type PersonalProject } from '@/domain/personal-projects';
import { homeProfiles, homeProjects } from '@/domain/home-story';
import styles from './discovery-chapters.module.css';
import { HomeProjectSpotlight } from './home-project-spotlight';

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
                <Text>Le code et le produit, en discussion.</Text>
              </h2>
            </div>
            <p className={styles['teamNames']} aria-hidden="true">
              {team.map((host) => (
                <span key={host.slug}>{host.name}</span>
              ))}
            </p>
          </header>
          <p className={styles['teamIntro']}>
            <Text>
              Deux développeurs et un Product Manager. Nous confrontons nos essais et nos points de
              vue sur ce que l'IA change pour les produits et les équipes tech.
            </Text>
          </p>
          <ul className={styles['teamProfiles']}>
            {team.map((host) => (
              <li key={host.slug}>
                <div className={styles['teamPortrait']}>
                  {host.photo ? (
                    <Image src={host.photo} alt="" fill sizes="(max-width: 600px) 90px, 160px" />
                  ) : (
                    <span>{host.name.slice(0, 1)}</span>
                  )}
                </div>
                <div className={styles['teamProfileCopy']}>
                  <h3>
                    <Text>{host.name}</Text>
                  </h3>
                  {host.aka ? <p className={styles['teamAka']}>{host.aka}</p> : null}
                  <p>
                    <Text>{host.bio}</Text>
                  </p>
                  <nav aria-label={host.name}>
                    {Object.entries(host.socials).map(([network, href]) =>
                      href ? (
                        <a key={network} href={href} target="_blank" rel="noopener noreferrer">
                          {network === 'github'
                            ? 'GitHub'
                            : network === 'linkedin'
                              ? 'LinkedIn'
                              : 'X'}
                          <span className="sr-only">
                            <Text> (nouvel onglet)</Text>
                          </span>
                        </a>
                      ) : null,
                    )}
                  </nav>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/about" className={styles['chapterAction']}>
            <Text>À propos de Sandbox</Text>
            <ArrowIcon />
          </Link>
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
                  <Text>Nos expérimentations</Text>
                </p>
                <h2 id="home-projects-title">
                  <Text>Ce que nous construisons.</Text>
                </h2>
              </div>
              <p className={styles['chapterIntro']}>
                <Text>Les projets qui nourrissent nos essais et nos discussions.</Text>
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
              <Text>Des repères pour tes prochains choix.</Text>
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
                  Retrouver les dates et les sources pour comprendre d'où vient l'IA d'aujourd'hui.
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
                  Repérer quoi tester parmi les projets, les modèles et les skills, avec leurs
                  mesures et leurs sources.
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
                  <Text>
                    Les annonces IA et développement, résumées et reliées à leurs sources.
                  </Text>
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
