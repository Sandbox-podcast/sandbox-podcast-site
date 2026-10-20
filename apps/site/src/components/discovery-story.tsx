import Image from 'next/image';
import type { CSSProperties } from 'react';
import { Text, LocalizedLink as Link } from './localization';
import type { Host } from '@/domain/schema';
import { homeProfiles, homeProjects } from '@/domain/home-story';
import type { PersonalProject } from '@/domain/personal-projects';
import { HomeProjectSpotlight } from './home-project-spotlight';
import styles from './discovery-chapters.module.css';

const explorationCards = [
  {
    destination: 'time-machine',
    href: '/time-machine',
    id: 'history',
    kicker: "Histoire de l'IA",
    title: 'Time Machine',
    description: "Remonter l'histoire de l'IA, de ses premières avancées aux modèles actuels.",
    image: '/images/rooms/time-machine-room-v1.webp',
    color: '#6480ff',
    rgb: '100, 128, 255',
  },
  {
    destination: 'charts',
    href: '/charts',
    id: 'charts',
    kicker: 'Sandbox Charts',
    title: 'Les classements',
    description: 'GitHub · Skills · Models · Rising',
    image: '/images/rooms/rankings-room-v1.webp',
    color: '#ff784f',
    rgb: '255, 120, 79',
  },
  {
    destination: 'projects',
    href: '/nos-projets',
    id: 'project-room',
    kicker: 'Le vidéoclub',
    title: 'Nos projets',
    description: "Nos projets et retours d'expérience.",
    image: '/images/rooms/video-club-room-v2.webp',
    color: '#bb64ff',
    rgb: '187, 100, 255',
  },
  {
    destination: 'news',
    href: '/news',
    id: 'news',
    kicker: 'Sandbox News',
    title: "L'actualité",
    description: "L'actualité IA et développement",
    image: '/images/rooms/radar-room-v1.webp',
    color: '#5ed6b0',
    rgb: '94, 214, 176',
  },
] as const;

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
      <section
        className={`${styles['chapter']} ${styles['exploreChapter']}`}
        aria-labelledby="home-explore-title"
        data-home-section="explore"
      >
        <header className={styles['chapterHeading']} data-reveal="title">
          <div>
            <p className={styles['eyebrow']} data-signal-contact>
              <span className={styles['chapterNumber']} aria-hidden="true">
                01
              </span>
              <Text>Pour aller plus loin</Text>
            </p>
            <h2 id="home-explore-title">
              <Text>Des repères pour tes prochains choix.</Text>
            </h2>
          </div>
        </header>
        <div className={styles['exploreGrid']} data-news={newsAvailable ? 'true' : undefined}>
          {explorationCards
            .filter((card) => card.destination !== 'news' || newsAvailable)
            .map((card, index) => (
              <Link
                key={card.destination}
                href={card.href}
                className={styles['exploreLink']}
                style={
                  { '--bookmark-color': card.color, '--bookmark-rgb': card.rgb } as CSSProperties
                }
                aria-labelledby={`home-${card.id}-title`}
                aria-describedby={`home-${card.id}-description`}
                data-analytics-event="discovery_open"
                data-analytics-destination={card.destination}
                data-analytics-placement="home"
                data-reveal="portal"
                data-reveal-side={index % 2 === 0 ? 'left' : 'right'}
                data-reveal-delay={String(index * 80)}
              >
                <div className={styles['bookmarkFrame']}>
                  <span className={styles['bookmarkSurface']} aria-hidden="true" />
                  <span className={styles['panelKicker']}>
                    <Text>{card.kicker}</Text>
                  </span>
                  <div className={styles['exploreArtwork']}>
                    <Image
                      src={card.image}
                      unoptimized
                      alt=""
                      fill
                      sizes="(max-width: 700px) calc(100vw - 72px), (max-width: 1280px) 44vw, 300px"
                    />
                    <p id={`home-${card.id}-description`} className={styles['exploreDescription']}>
                      <Text>{card.description}</Text>
                    </p>
                  </div>
                  <div className={styles['exploreCopy']}>
                    <h3 id={`home-${card.id}-title`} className={styles['exploreName']}>
                      <Text>{card.title}</Text>
                    </h3>
                  </div>
                  <div className={styles['bookmarkFooter']} aria-hidden="true">
                    <span className={styles['bookmarkDots']}>
                      {[0, 1, 2].map((dot) => (
                        <i key={dot} data-lit={dot <= index % 3 ? 'true' : undefined} />
                      ))}
                    </span>
                    <span className={styles['exploreArrow']}>
                      <ArrowIcon />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>
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
                  02
                </span>
                <Text>Derrière les micros</Text>
              </p>
              <h2 id="home-team-title">
                <Text>Le code et le produit, en discussion.</Text>
              </h2>
            </div>
          </header>
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
                    03
                  </span>
                  <Text>Nos expérimentations</Text>
                </p>
                <h2 id="home-projects-title">
                  <Text>Ce que nous construisons.</Text>
                </h2>
              </div>
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
