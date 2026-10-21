'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  filterPersonalProjects,
  PROJECT_CREATORS,
  type PersonalProject,
  type ProjectCreator,
} from '@/domain/personal-projects';
import {
  VIDEO_CLUB_BAYS,
  VIDEO_CLUB_ROOM_IMAGE,
  VIDEO_CLUB_VHS_CLOSED_IMAGE,
  VIDEO_CLUB_VHS_OPEN_IMAGE,
  videoClubCamera,
  videoClubRoomFit,
  videoClubShelves,
} from '@/domain/video-club';
import { VideoClubDossier } from './video-club-dossier';
import { vhsProjectArtwork } from '@/domain/vhs-project-artwork';
import { LocalizedElement, Text } from './localization';
import styles from './video-club.module.css';

function TapeArtwork({ project, number }: { project: PersonalProject; number: number }) {
  const artwork = vhsProjectArtwork(project);
  return (
    <span
      className={styles['tapeArtwork']}
      style={{ '--tape-color': project.color } as CSSProperties}
    >
      <span className={styles['tapeInsert']}>
        <span className={styles['tapeTop']}>
          SANDBOX HOME VIDEO <span>VHS</span>
        </span>
        <span className={styles['coverVisual']}>
          {artwork ? (
            <Image
              src={artwork}
              alt=""
              fill
              sizes="(max-width: 600px) 180px, 400px"
              draggable={false}
            />
          ) : (
            <span className={styles['coverInitial']}>{project.name.slice(0, 2)}</span>
          )}
        </span>
        <span className={styles['coverTitle']}>{project.name}</span>
        <span className={styles['coverCreator']}>
          Une création de {PROJECT_CREATORS[project.creator].name}
        </span>
        <span className={styles['tapeBottom']}>
          <b>VHS</b>
          <span>PAL / {String(number).padStart(3, '0')}</span>
        </span>
      </span>
      <Image
        className={styles['tapeShell']}
        src={VIDEO_CLUB_VHS_CLOSED_IMAGE}
        alt=""
        fill
        sizes="(max-width: 600px) 180px, 200px"
        draggable={false}
      />
    </span>
  );
}

export function VideoClub({
  projects,
  startInside = false,
}: {
  projects: readonly PersonalProject[];
  startInside?: boolean;
}) {
  const [entered, setEntered] = useState(startInside);
  const [bay, setBay] = useState<ProjectCreator | null>(null);
  const [query, setQuery] = useState('');
  const [list, setList] = useState(false);
  const [selected, setSelected] = useState<PersonalProject | null>(null);
  const [phase, setPhase] = useState<'held' | 'opening' | 'details'>('held');
  const [hovered, setHovered] = useState<PersonalProject | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const openingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shelves = videoClubShelves(projects);
  const visible = filterPersonalProjects(projects, { query });
  const visibleSlugs = new Set(visible.map((project) => project.slug));
  const camera = videoClubCamera(bay, entered, !photoFailed);

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const resize = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      element.style.setProperty('--room-fit', String(videoClubRoomFit(width, height, bay)));
    });
    resize.observe(element);
    return () => {
      resize.disconnect();
    };
  }, [bay]);

  useEffect(
    () => () => {
      if (openingTimer.current) clearTimeout(openingTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (selected) {
      dialog.current?.showModal();
      dialog.current
        ?.querySelector<HTMLButtonElement>('[data-open-box]')
        ?.focus({ preventScroll: true });
    }
  }, [selected]);

  useEffect(() => {
    if (phase === 'details')
      dialog.current
        ?.querySelector<HTMLElement>('#video-club-project-title')
        ?.focus({ preventScroll: true });
  }, [phase]);

  function pick(project: PersonalProject) {
    setEntered(true);
    setBay(project.creator);
    setPhase('held');
    setSelected(project);
    setHovered(null);
  }

  function close() {
    if (openingTimer.current) clearTimeout(openingTimer.current);
    dialog.current?.close();
    setSelected(null);
    setPhase('held');
  }

  function openBox() {
    if (phase !== 'held') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('details');
      return;
    }
    setPhase('opening');
    openingTimer.current = setTimeout(() => {
      setPhase('details');
    }, 1400);
  }

  function move(direction: number) {
    const index = bay === null ? 1 : VIDEO_CLUB_BAYS.indexOf(bay);
    setEntered(true);
    setBay(
      VIDEO_CLUB_BAYS[(index + direction + VIDEO_CLUB_BAYS.length) % VIDEO_CLUB_BAYS.length] ??
        null,
    );
  }

  return (
    <div
      className={`${styles['club']} ${photoFailed ? '' : styles['photographic']}`}
      data-entered={entered}
      data-list={list}
    >
      <header className={styles['toolbar']}>
        <LocalizedElement
          as="a"
          href={startInside ? '/' : '/nos-projets'}
          className={styles['exit']}
        >
          <span aria-hidden="true">‹</span>{' '}
          <Text>{startInside ? 'Retour au plateau' : 'Catalogue classique'}</Text>
        </LocalizedElement>
        <span className={styles['toolbarBrand']}>
          <span>Sandbox</span> Le vidéoclub
        </span>
        <span className={styles['local']}>{projects.length} cassettes</span>
      </header>

      {entered ? <h1 className="sr-only">Sandbox Vidéo Club</h1> : null}
      <div
        className={styles['scene']}
        ref={scene}
        onKeyDown={(event) => {
          if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLButtonElement ||
            event.target instanceof HTMLAnchorElement
          )
            return;
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            move(-1);
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            move(1);
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setEntered(true);
            setBay(bay ?? 'loic');
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setBay(null);
          }
        }}
        tabIndex={entered ? 0 : -1}
        aria-label="Vidéoclub. Flèches gauche et droite pour changer de rayon, haut pour avancer, bas pour reculer."
      >
        <div className={styles['roomFit']}>
          <div
            className={styles['camera']}
            style={
              { '--camera-x': `${camera.x}px`, '--camera-z': `${camera.z}px` } as CSSProperties
            }
          >
            {!photoFailed ? (
              <div className={styles['photoRoom']} aria-hidden="true">
                <Image
                  src={VIDEO_CLUB_ROOM_IMAGE}
                  alt=""
                  fill
                  preload
                  quality={90}
                  sizes="(max-width: 600px) 1000px, 1600px"
                  draggable={false}
                  onError={() => {
                    setPhotoFailed(true);
                  }}
                />
              </div>
            ) : null}
            <div className={styles['backWall']}>
              <div className={styles['wallStripe']} />
              <div className={styles['neon']} aria-hidden="true">
                <span>SANDBOX</span>
                <strong>VIDÉO CLUB</strong>
                <small>LES PROJETS DE L'ÉQUIPE</small>
              </div>
              <div className={styles['clock']} aria-hidden="true">
                21:07
              </div>
              <div className={styles['openSign']} aria-hidden="true">
                OUVERT
              </div>
              <div className={styles['shelves']} inert={!entered || list}>
                {shelves.map((shelf) => (
                  <section
                    key={shelf.creator}
                    className={styles['bay']}
                    aria-label={`Rayon de ${shelf.name}`}
                  >
                    <div className={styles['baySign']}>
                      <span>
                        {String(VIDEO_CLUB_BAYS.indexOf(shelf.creator) + 1).padStart(2, '0')}
                      </span>
                      <h2>LES PROJETS DE {shelf.name.toLocaleUpperCase('fr-FR')}</h2>
                      <span>{shelf.rows.flat().length} TITRES</span>
                    </div>
                    {Array.from({ length: Math.max(3, shelf.rows.length) }, (_, row) => (
                      <div className={styles['shelfRow']} key={row}>
                        {(shelf.rows[row] ?? []).map((project) => (
                          <button
                            key={project.slug}
                            type="button"
                            className={styles['tape']}
                            data-dimmed={!visibleSlugs.has(project.slug)}
                            disabled={!visibleSlugs.has(project.slug)}
                            aria-label={`Ramasser la cassette ${project.name}`}
                            title={`${project.name} : ${project.tagline}`}
                            onClick={() => {
                              pick(project);
                            }}
                            onMouseEnter={() => {
                              setHovered(project);
                            }}
                            onMouseLeave={() => {
                              setHovered(null);
                            }}
                            onFocus={() => {
                              setHovered(project);
                              setBay(project.creator);
                            }}
                            onBlur={() => {
                              setHovered(null);
                            }}
                          >
                            <TapeArtwork project={project} number={projects.indexOf(project) + 1} />
                            <span className={styles['spine']}>{project.name}</span>
                          </button>
                        ))}
                        {!shelf.rows[row]?.length ? (
                          <div className={styles['spareTapes']} aria-hidden="true">
                            {Array.from({ length: row === 2 ? 12 : 8 }, (_, n) => (
                              <i
                                key={n}
                                style={
                                  { '--spine-hue': `${n * 38 + row * 21}deg` } as CSSProperties
                                }
                              >
                                SANDBOX
                              </i>
                            ))}
                          </div>
                        ) : null}
                        <div className={styles['shelfLip']} aria-hidden="true">
                          <span>
                            {row === 0
                              ? 'LA SÉLECTION SANDBOX'
                              : row === 1
                                ? 'À DÉCOUVRIR'
                                : 'LE COIN DES CURIEUX'}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className={styles['bayBase']} aria-hidden="true" />
                  </section>
                ))}
              </div>
              <div className={styles['skirting']} />
            </div>
            <div className={styles['leftWall']} aria-hidden="true">
              <div className={styles['poster']}>
                UNE SOIRÉE.
                <br />
                <b>UN PROJET.</b>
                <span>SANDBOX PRÉSENTE</span>
              </div>
              <div className={styles['sideStripe']} />
            </div>
            <div className={styles['rightWall']} aria-hidden="true">
              <div className={styles['sideStripe']} />
              <div className={styles['rewindSign']}>
                MERCI DE
                <br />
                <b>REMBOBINER</b>
              </div>
            </div>
            <div className={styles['ceiling']} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div className={styles['floor']} aria-hidden="true">
              <div className={styles['floorMat']}>
                SANDBOX
                <br />
                <span>BIENVENUE AU CLUB</span>
              </div>
            </div>
            <div className={styles['counter']} aria-hidden="true">
              <div className={styles['counterTop']} />
              <div className={styles['crt']}>
                <div>
                  <span>PLAY</span>
                  <strong>
                    FAITES
                    <br />
                    VOTRE CHOIX.
                  </strong>
                  <small>{projects.length} PROJETS EN RAYON</small>
                </div>
                <i />
              </div>
              <div className={styles['counterLabel']}>
                LE COIN
                <br />
                <strong>DES RETOURS</strong>
              </div>
              <div className={styles['counterStickers']}>
                VHS <span>PAL</span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles['vignette']} aria-hidden="true" />
        <div className={styles['grain']} aria-hidden="true" />
      </div>

      {!entered ? (
        <div className={styles['welcome']}>
          <p className={styles['eyebrow']}>LES PROJETS, COMME AU VIDÉOCLUB</p>
          <h1>
            On se prend
            <br />
            <em>une cassette ?</em>
          </h1>
          <p>
            Les créations de Lou, Loïc et Nicolas, en VHS.
            <br />
            Choisis une boîte. Le projet est à l'intérieur.
          </p>
          <button
            type="button"
            className={styles['primary']}
            onClick={() => {
              setEntered(true);
              scene.current?.focus();
            }}
          >
            Entrer dans le vidéoclub <span aria-hidden="true">›</span>
          </button>
        </div>
      ) : null}

      {entered ? (
        <>
          <div className={styles['browseBar']}>
            <label>
              <span className="sr-only">Rechercher une cassette</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="6" />
                <path d="m15 15 6 6" />
              </svg>
              <input
                type="search"
                value={query}
                placeholder="Un titre en tête ?"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setBay(
                    filterPersonalProjects(projects, { query: event.target.value })[0]?.creator ??
                      null,
                  );
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setList(!list);
              }}
              aria-pressed={list}
            >
              {list ? 'Voir les rayons' : 'Voir la liste'}
            </button>
          </div>
          {query && !list ? (
            <p className={styles['searchStatus']} role="status">
              {visible.length
                ? `${visible.length} cassette${visible.length > 1 ? 's' : ''} en rayon`
                : 'Aucune cassette trouvée.'}{' '}
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                }}
              >
                Tout afficher
              </button>
            </p>
          ) : null}
          {list ? (
            <div className={styles['listPanel']}>
              <h2>Toutes les cassettes</h2>
              <div>
                {visible.map((project) => (
                  <button
                    key={project.slug}
                    type="button"
                    onClick={() => {
                      pick(project);
                    }}
                  >
                    <span style={{ background: project.color }} />
                    {project.name}
                    <small>{PROJECT_CREATORS[project.creator].name}</small>
                  </button>
                ))}
              </div>
              {!visible.length ? <p>Essaie un autre titre ou le nom d'un créateur.</p> : null}
            </div>
          ) : null}
          {hovered && !list ? (
            <div className={styles['hoverCard']} role="status">
              <span>{PROJECT_CREATORS[hovered.creator].name}</span>
              <strong>{hovered.name}</strong>
              <p>{hovered.tagline}</p>
              <small>Cliquer pour ramasser</small>
            </div>
          ) : null}
        </>
      ) : null}

      <footer className={styles['hud']}>
        <span className={styles['hudNote']}>
          {entered ? 'Choisis une cassette sur le rayon.' : 'Ouvert aux curieux.'}
        </span>
        <nav aria-label="Se déplacer dans le vidéoclub">
          <button
            type="button"
            onClick={() => {
              move(-1);
            }}
            aria-label="Rayon précédent"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => {
              setEntered(true);
              setBay(null);
            }}
            aria-current={entered && bay === null ? 'location' : undefined}
          >
            Vue d'ensemble
          </button>
          {VIDEO_CLUB_BAYS.map((creator) => (
            <button
              key={creator}
              type="button"
              onClick={() => {
                setEntered(true);
                setBay(creator);
              }}
              aria-current={bay === creator ? 'location' : undefined}
            >
              {PROJECT_CREATORS[creator].name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              move(1);
            }}
            aria-label="Rayon suivant"
          >
            ›
          </button>
        </nav>
        <span className={styles['hudCount']}>
          {String(projects.length).padStart(2, '0')} TITRES / VHS
        </span>
      </footer>

      <dialog
        ref={dialog}
        className={styles['pickup']}
        data-phase={phase}
        aria-label={selected ? `Cassette ${selected.name}` : 'Cassette'}
        onCancel={close}
        onClose={() => {
          setSelected(null);
          setPhase('held');
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        {selected ? (
          <>
            <button
              type="button"
              className={styles['close']}
              onClick={close}
              aria-label="Reposer la cassette"
            >
              × <span>Reposer</span>
            </button>
            {phase !== 'details' ? (
              <div className={styles['held']}>
                <p className={styles['eyebrow']}>TU AS CHOISI</p>
                <h2>{selected.name}</h2>
                <div className={styles['boxStage']}>
                  <div className={styles['openCasePhoto']} aria-hidden="true">
                    <Image
                      src={VIDEO_CLUB_VHS_OPEN_IMAGE}
                      alt=""
                      fill
                      sizes="(max-width: 600px) 300px, 550px"
                    />
                  </div>
                  <div className={styles['box']}>
                    <div className={styles['boxCover']}>
                      <TapeArtwork
                        project={selected}
                        number={projects.findIndex((project) => project.slug === selected.slug) + 1}
                      />
                    </div>
                  </div>
                </div>
                <p className={styles['heldTagline']}>{selected.tagline}</p>
                <button
                  type="button"
                  className={styles['primary']}
                  data-open-box
                  onClick={openBox}
                  disabled={phase === 'opening'}
                  autoFocus
                >
                  {phase === 'opening' ? 'Ouverture de la boîte' : 'Ouvrir la boîte'}
                </button>
              </div>
            ) : (
              <VideoClubDossier project={selected} />
            )}
          </>
        ) : null}
      </dialog>
    </div>
  );
}
