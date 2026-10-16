import Image from 'next/image';
import { Text, LocalizedLink as Link } from './localization';
import type { Host } from '@/domain/schema';
import { PROJECT_CREATORS, type PersonalProject } from '@/domain/personal-projects';
import { homeProfiles, homeProjects } from '@/domain/home-story';
import styles from './discovery-home.module.css';

const networks = ['github', 'linkedin', 'x'] as const;
const networkNames = { github: 'GitHub', linkedin: 'LinkedIn', x: 'X' };

export function DiscoveryStory({
  hosts,
  projects,
}: {
  hosts: readonly Host[];
  projects: readonly PersonalProject[];
}) {
  const team = homeProfiles(hosts);
  const selection = homeProjects(projects);
  return (
    <div id="home-story">
      {team.length > 0 ? (
        <section
          className={`wrap ${styles['chapter']}`}
          aria-labelledby="home-team-title"
          data-home-section="team"
        >
          <header className={styles['chapterHeading']}>
            <p className={styles['eyebrow']}>
              <Text>Derrière les micros</Text>
            </p>
            <h2 id="home-team-title">
              <Text>Les voix de Sandbox.</Text>
            </h2>
          </header>
          <div className={styles['teamGrid']}>
            {team.map((host) => (
              <article key={host.slug} className={styles['person']}>
                <div className={styles['portrait']}>
                  {host.photo ? (
                    <Image
                      src={host.photo}
                      alt=""
                      fill
                      quality={90}
                      sizes="(max-width: 900px) 45vw, (max-width: 1280px) 30vw, 360px"
                    />
                  ) : (
                    <span aria-hidden="true">{host.name[0]}</span>
                  )}
                </div>
                <h3>{host.name}</h3>
                <p className={styles['focus']}>
                  <Text>{host.focus}</Text>
                </p>
                {host.bio.split(/\n\s*\n/).map((paragraph) => (
                  <p key={paragraph} className={styles['bio']}>
                    <Text>{paragraph}</Text>
                  </p>
                ))}
                <div className={styles['socials']}>
                  {networks.map((network) =>
                    host.socials[network] ? (
                      <a
                        key={network}
                        href={host.socials[network]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {networkNames[network]}
                        <span className="sr-only">
                          {' '}
                          - {host.name} <Text>(nouvel onglet)</Text>
                        </span>
                      </a>
                    ) : null,
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {selection.length > 0 ? (
        <section
          className={styles['projectsChapter']}
          aria-labelledby="home-projects-title"
          data-home-section="projects"
        >
          <div className={`wrap ${styles['chapter']}`}>
            <header className={styles['chapterHeading']}>
              <p className={styles['eyebrow']}>
                <Text>Du podcast au concret</Text>
              </p>
              <h2 id="home-projects-title">
                <Text>Ce qu'on construit.</Text>
              </h2>
              <p className={styles['chapterIntro']}>
                <Text>Des jeux, de la musique, des outils. Voici quelques-uns de nos projets.</Text>
              </p>
            </header>
            <div className={styles['projectGrid']}>
              {selection.map((project) => (
                <Link
                  key={project.slug}
                  href={`/nos-projets/${project.slug}`}
                  className={styles['projectLink']}
                >
                  <div className={styles['projectCover']}>
                    {project.cover ? (
                      <Image
                        src={project.cover.src}
                        alt=""
                        fill
                        sizes="(max-width: 700px) 90vw, 30vw"
                      />
                    ) : (
                      <span>{project.name}</span>
                    )}
                  </div>
                  <p className={styles['projectCreator']}>
                    {PROJECT_CREATORS[project.creator].name}
                  </p>
                  <h3>
                    {project.name}
                    <span aria-hidden="true">↗</span>
                  </h3>
                  <p className={styles['projectTagline']}>
                    <Text>{project.tagline}</Text>
                  </p>
                </Link>
              ))}
            </div>
            <Link
              href="/nos-projets"
              className={styles['chapterAction']}
              data-analytics-event="discovery_open"
              data-analytics-destination="projects"
              data-analytics-placement="home"
            >
              <Text>Voir tous nos projets</Text>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      ) : null}
      <section
        className={`wrap ${styles['exploreChapter']}`}
        aria-labelledby="home-explore-title"
        data-home-section="explore"
      >
        <header className={styles['chapterHeading']}>
          <p className={styles['eyebrow']}>
            <Text>Pour aller plus loin</Text>
          </p>
          <h2 id="home-explore-title">
            <Text>Explorer l'IA.</Text>
          </h2>
        </header>
        <Link
          href="/time-machine"
          className={styles['exploreLink']}
          data-analytics-event="discovery_open"
          data-analytics-destination="time-machine"
          data-analytics-placement="home"
        >
          <span className={styles['exploreName']}>Time Machine</span>
          <span className={styles['exploreDescription']}>
            <Text>Remonter l'histoire de l'IA, de ses premières avancées aux modèles actuels.</Text>
          </span>
          <span className={styles['exploreArrow']} aria-hidden="true">
            ↗
          </span>
        </Link>
        <Link
          href="/charts"
          className={styles['exploreLink']}
          data-analytics-event="discovery_open"
          data-analytics-destination="charts"
          data-analytics-placement="home"
        >
          <span className={styles['exploreName']}>
            <Text>Les classements</Text>
          </span>
          <span className={styles['exploreDescription']}>
            <Text>
              Explorer les projets, les modèles et les skills, avec leurs sources et leurs méthodes.
            </Text>
          </span>
          <span className={styles['exploreArrow']} aria-hidden="true">
            ↗
          </span>
        </Link>
      </section>
    </div>
  );
}
