'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import {
  HISTORY_CATEGORIES,
  HISTORY_DATE_KINDS,
  HISTORY_ERAS,
  buildHistoryWrapped,
  changeHistoryPeriod,
  filterHistory,
  historyDate,
  historyEventAnchor,
  historyYears,
  type HistoryCategory,
  type HistoryEvent,
  type HistoryPeriod,
  type TimeMachineData,
} from '@/domain/time-machine';
import { timeMachineWrappedSvg } from '@/domain/time-machine-export';
import { TimeMachineChart } from './time-machine-chart';
import { CopyButton } from './client';
import { historySelectionFromHash } from '@/domain/history-sharing';
import { HistoryArtwork } from './history-artwork';
import { TemporalStarfield } from './temporal-starfield';
import { historyCardWindow } from '@/domain/time-machine-cards';
import styles from './time-machine.module.css';

type IconName =
  'play' | 'pause' | 'back' | 'next' | 'rewind' | 'search' | 'download' | 'source' | 'motion';
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    play: <path d="m9 5 11 7-11 7z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    back: <path d="m14 6-6 6 6 6" />,
    next: <path d="m10 6 6 6-6 6" />,
    rewind: <path d="M5 5v14m14-14L8 12l11 7z" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    download: <path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" />,
    source: <path d="M14 4h6v6m0-6L9 15m2-11H4v16h16v-7" />,
    motion: (
      <>
        <path d="M3 7h11M3 12h7M3 17h11" />
        <path d="m15 8 5 4-5 4z" />
      </>
    ),
  };
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener('change', callback);
  return () => {
    query.removeEventListener('change', callback);
  };
}
function readMotion() {
  return window.matchMedia(reducedMotionQuery).matches;
}
function serverMotion() {
  return false;
}

function eventStyle(event: HistoryEvent): CSSProperties {
  return { '--event-color': HISTORY_CATEGORIES[event.category].color } as CSSProperties;
}

function EventInspector({
  event,
  events,
  index,
  total,
  onSelect,
}: {
  event: HistoryEvent;
  events: HistoryEvent[];
  index: number;
  total: number;
  onSelect: (index: number) => void;
}) {
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [windowCenter, setWindowCenter] = useState(index);
  const currentWindow = historyCardWindow(events.length, windowCenter);
  const visible = currentWindow.includes(index)
    ? currentWindow
    : historyCardWindow(events.length, index);
  if (!currentWindow.includes(index)) setWindowCenter(index);
  const mobileVisible = historyCardWindow(visible.length, visible.indexOf(index), 3)
    .map((localIndex) => visible[localIndex])
    .filter((value): value is number => value !== undefined);
  return (
    <aside
      className={styles['inspector']}
      style={eventStyle(event)}
      aria-label="Fiche de l'événement sélectionné"
    >
      <div className={styles['expandedStage']} data-history-carousel>
        <div
          className={styles['expandedRail']}
          style={
            {
              '--desktop-folded-count': visible.length - 1,
              '--mobile-folded-count': mobileVisible.length - 1,
            } as CSSProperties
          }
          aria-label="Inventions voisines dans la chronologie"
          data-mobile-count={mobileVisible.length}
          onPointerMove={(pointerEvent) => {
            if (
              pointerEvent.pointerType !== 'mouse' ||
              !window.matchMedia('(hover: hover) and (pointer: fine)').matches
            )
              return;
            const previous = pointer.current;
            pointer.current = { x: pointerEvent.clientX, y: pointerEvent.clientY };
            if (
              previous &&
              Math.hypot(pointerEvent.clientX - previous.x, pointerEvent.clientY - previous.y) < 3
            )
              return;
            const target = pointerEvent.target;
            if (!(target instanceof Element)) return;
            const card = target.closest<HTMLElement>('[data-expanded-index]');
            if (!card) return;
            const next = Number(card.dataset['expandedIndex']);
            if (Number.isInteger(next) && next !== index) onSelect(next);
          }}
          onPointerLeave={() => {
            pointer.current = null;
          }}
        >
          {visible.map((cardIndex) => {
            const item = events[cardIndex];
            if (!item) return null;
            const active = cardIndex === index;
            return (
              <div
                className={styles['expandedCard']}
                key={item.id}
                style={eventStyle(item)}
                data-expanded-index={cardIndex}
                data-expanded-event={item.id}
                data-active={active}
                data-mobile-visible={mobileVisible.includes(cardIndex)}
              >
                <HistoryArtwork
                  event={item}
                  featured={active}
                  sizes="(max-width: 700px) 75vw, 70vw"
                />
                <button
                  type="button"
                  className={styles['expandedSelect']}
                  aria-label={'Explorer : ' + item.title}
                  aria-pressed={active}
                  onClick={() => {
                    onSelect(cardIndex);
                  }}
                  onKeyDown={(keyEvent) => {
                    const next =
                      keyEvent.key === 'ArrowRight'
                        ? Math.min(total - 1, cardIndex + 1)
                        : keyEvent.key === 'ArrowLeft'
                          ? Math.max(0, cardIndex - 1)
                          : undefined;
                    if (next === undefined) return;
                    keyEvent.preventDefault();
                    onSelect(next);
                    const rail = keyEvent.currentTarget.parentElement?.parentElement;
                    requestAnimationFrame(() => {
                      rail
                        ?.querySelector<HTMLButtonElement>('[data-active="true"] button')
                        ?.focus();
                    });
                  }}
                />
                <span className={styles['expandedNumber']} aria-hidden="true">
                  {String(cardIndex + 1).padStart(2, '0')}
                </span>
                <span className={styles['slatYear']} aria-hidden="true">
                  {item.date.slice(0, 4)}
                </span>
                <time
                  className={styles['expandedDate']}
                  dateTime={item.date}
                  aria-label={historyDate(item.date)}
                  aria-hidden={!active}
                  data-history-date="prominent"
                >
                  <strong>{item.date.slice(0, 4)}</strong>
                  {item.date.length > 4 ? (
                    <span>{historyDate(item.date).replace(/\s\d{4}$/, '')}</span>
                  ) : null}
                </time>
                <div className={styles['expandedCaption']} aria-hidden={!active}>
                  <div className={styles['expandedMeta']}>
                    <span>{item.organization}</span>
                  </div>
                  <h3>{item.shortTitle}</h3>
                  <p className={styles['eventSummary']}>{item.summary}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div
          className={styles['expandedNavigation']}
          role="group"
          aria-label="Parcourir la chronologie"
        >
          <button
            type="button"
            onClick={() => {
              onSelect(index - 1);
            }}
            disabled={index === 0}
            aria-label="Événement précédent"
          >
            <Icon name="back" />
          </button>
          <button
            type="button"
            onClick={() => {
              onSelect(index + 1);
            }}
            disabled={index >= total - 1}
            aria-label="Événement suivant"
          >
            <Icon name="next" />
          </button>
        </div>
      </div>
      <div className={styles['expandedFooter']}>
        <div className={styles['inspectorTop']}>
          <span>
            <i />
            {HISTORY_CATEGORIES[event.category].singular} / {HISTORY_DATE_KINDS[event.dateKind]}
          </span>
          <span>
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        </div>
        <details key={event.id} className={styles['eventDetails']}>
          <summary>
            Détails et sources <span>{event.sources.length}</span>
          </summary>
          <h4>{event.title}</h4>
          <p className={styles['eventSummary']}>{event.summary}</p>
          <p className={styles['eventContext']}>{event.context}</p>
          {event.date.length < 10 ? (
            <p className={styles['precision']}>
              Date documentée {event.date.length === 4 ? "à l'année" : 'au mois'}.
            </p>
          ) : null}
          <div className={styles['sources']}>
            {event.sources.map((source) => (
              <a href={source.url} key={source.url} target="_blank" rel="noopener noreferrer">
                {source.label}
                <Icon name="source" />
              </a>
            ))}
          </div>
        </details>
        <div className={styles['inspectorBottom']}>
          <span
            data-analytics-event="experience_interaction"
            data-analytics-placement="time-machine"
            data-analytics-action="share"
          >
            <CopyButton
              text={'/time-machine#' + historyEventAnchor(event.id)}
              label="Partager cette date"
            />
          </span>
        </div>
      </div>
    </aside>
  );
}

export function TimeMachine({ data }: { data: TimeMachineData }) {
  const [view, setView] = useState<'explore' | 'wrapped'>('explore');
  const [period, setPeriod] = useState<HistoryPeriod>(() => ({
    fromYear: data.fromYear,
    toYear: data.toYear,
  }));
  const [category, setCategory] = useState<HistoryCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [landmarksOnly, setLandmarksOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(() => data.events.at(-1)?.id ?? '');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [motionPaused, setMotionPaused] = useState(false);
  const [newestFirst, setNewestFirst] = useState(false);
  const [year, setYear] = useState(() => historyYears(data.events)[0] ?? data.toYear);
  const [exportMessage, setExportMessage] = useState('');
  const board = useRef<HTMLElement>(null);
  const reducedMotion = useSyncExternalStore(subscribeMotion, readMotion, serverMotion);
  const motionEnabled = !reducedMotion && !motionPaused;
  const { fromYear, toYear } = period;
  const era = HISTORY_ERAS.find((item) => item.from === fromYear && item.to === toYear);
  const allYears = fromYear === data.fromYear && toYear === data.toYear;
  const availableYears = Array.from(
    { length: data.toYear - data.fromYear + 1 },
    (_, index) => data.fromYear + index,
  );
  const events = useMemo(
    () =>
      filterHistory(data.events, {
        category,
        query,
        landmarksOnly,
        fromYear,
        toYear,
      }),
    [data.events, category, query, landmarksOnly, fromYear, toYear],
  );
  const selectedIndex = Math.max(
    0,
    events.findIndex((event) => event.id === selectedId),
  );
  const selected = events[selectedIndex];
  const isPlaying = playing && motionEnabled && events.length > 1 && view === 'explore';
  const wrapped = useMemo(() => buildHistoryWrapped(data, year), [data, year]);
  const latestEvent = data.events.at(-1);
  const orderedList = newestFirst ? [...events].reverse() : events;
  const groups = new Map<string, HistoryEvent[]>();
  orderedList.forEach((event) => {
    const eventYear = event.date.slice(0, 4);
    const group = groups.get(eventYear) ?? [];
    group.push(event);
    groups.set(eventYear, group);
  });

  useEffect(() => {
    function restoreSelection() {
      const selection = historySelectionFromHash(window.location.hash, data);
      if (!selection) return;
      setPlaying(false);
      if (selection.kind === 'event') {
        setPeriod({ fromYear: data.fromYear, toYear: data.toYear });
        setCategory('all');
        setQuery('');
        setLandmarksOnly(false);
        setSelectedId(selection.id);
        setView('explore');
      } else {
        setYear(selection.year);
        setView('wrapped');
      }
    }
    restoreSelection();
    window.addEventListener('hashchange', restoreSelection);
    return () => {
      window.removeEventListener('hashchange', restoreSelection);
    };
  }, [data]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => {
      const next = events[selectedIndex + 1];
      if (next) setSelectedId(next.id);
      else setPlaying(false);
    }, 1500 / speed);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isPlaying, events, selectedIndex, speed]);

  useEffect(() => {
    if (view !== 'explore' || events.length === 0) return;
    function navigateWithArrows(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
      )
        return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="slider"], [role="tab"], [role="dialog"], dialog',
        )
      )
        return;
      event.preventDefault();
      setPlaying(false);
      setSelectedId((currentId) => {
        const currentIndex = Math.max(
          0,
          events.findIndex((item) => item.id === currentId),
        );
        const nextIndex = Math.max(
          0,
          Math.min(events.length - 1, currentIndex + (event.key === 'ArrowRight' ? 1 : -1)),
        );
        return events[nextIndex]?.id ?? currentId;
      });
    }
    window.addEventListener('keydown', navigateWithArrows);
    return () => {
      window.removeEventListener('keydown', navigateWithArrows);
    };
  }, [events, view]);

  function selectEvent(index: number) {
    const next = events[index];
    if (next) {
      setSelectedId(next.id);
      setPlaying(false);
    }
  }

  function resetFilters() {
    setPeriod({ fromYear: data.fromYear, toYear: data.toYear });
    setCategory('all');
    setQuery('');
    setLandmarksOnly(false);
    setPlaying(false);
  }

  function changeYear(boundary: 'from' | 'to', value: string) {
    setPeriod((current) => changeHistoryPeriod(current, boundary, Number(value), data));
    setPlaying(false);
  }

  function openEvent(event: HistoryEvent) {
    resetFilters();
    setSelectedId(event.id);
    setView('explore');
    board.current?.scrollIntoView({
      behavior: motionEnabled ? 'smooth' : 'instant',
      block: 'start',
    });
  }

  function changeView(next: 'explore' | 'wrapped') {
    setView(next);
    setPlaying(false);
    setExportMessage('');
  }

  function download(format: 'svg' | 'json') {
    try {
      const content =
        format === 'svg'
          ? timeMachineWrappedSvg(wrapped)
          : JSON.stringify(
              {
                title: `Sandbox Wrapped ${year}`,
                scope: "Sélection éditoriale non exhaustive de l'histoire mondiale de l'IA.",
                ...wrapped,
              },
              null,
              2,
            );
      const url = URL.createObjectURL(
        new Blob([content], {
          type: format === 'svg' ? 'image/svg+xml;charset=utf-8' : 'application/json;charset=utf-8',
        }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `sandbox-wrapped-ia-${year}.${format}`;
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      setExportMessage('Export ' + format.toUpperCase() + ' téléchargé.');
    } catch {
      setExportMessage('Le téléchargement a échoué. Réessayez.');
    }
  }

  return (
    <div className={styles['page']} data-motion={motionEnabled ? 'on' : 'off'}>
      <TemporalStarfield
        position={
          selected
            ? Date.parse(
                selected.date.length === 4
                  ? selected.date + '-01-01'
                  : selected.date.length === 7
                    ? selected.date + '-01'
                    : selected.date,
              )
            : 0
        }
        paused={!motionEnabled || view !== 'explore'}
      />
      <div className={styles['breadcrumb']}>
        <Link href="/">Sandbox</Link>
        <span>/</span>
        <span>Time Machine</span>
        <span className={styles['editionTag']}>ÉDITION MONDIALE</span>
      </div>
      <header className={styles['hero']}>
        <div>
          <h1>
            Time Machine<span>.</span>
            <span className={styles['heroSubtitle']}>Histoire de l'intelligence artificielle</span>
          </h1>
        </div>
      </header>
      <div className={styles['tabsBar']}>
        <div
          role="tablist"
          aria-label="Explorer l'histoire ou son récapitulatif annuel"
          data-analytics-event="experience_interaction"
          data-analytics-placement="time-machine"
          data-analytics-action="tab"
        >
          <button
            id="tm-explore-tab"
            role="tab"
            aria-selected={view === 'explore'}
            aria-controls="tm-explore-panel"
            tabIndex={view === 'explore' ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                changeView('wrapped');
                document.getElementById('tm-wrapped-tab')?.focus();
              }
            }}
            onClick={() => {
              changeView('explore');
            }}
          >
            Chronologie<span>{data.events.length}</span>
          </button>
          <button
            id="tm-wrapped-tab"
            role="tab"
            aria-selected={view === 'wrapped'}
            aria-controls="tm-wrapped-panel"
            tabIndex={view === 'wrapped' ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                changeView('explore');
                document.getElementById('tm-explore-tab')?.focus();
              }
            }}
            onClick={() => {
              changeView('wrapped');
            }}
          >
            L'année en IA<span>WRAPPED</span>
          </button>
        </div>
        <button
          type="button"
          className={styles['motionButton']}
          aria-pressed={motionEnabled}
          onClick={() => {
            setMotionPaused(!motionPaused);
            setPlaying(false);
          }}
          disabled={reducedMotion}
        >
          <Icon name="motion" />
          {motionEnabled ? 'Animations activées' : 'Animations réduites'}
        </button>
      </div>
      <section
        id="tm-explore-panel"
        role="tabpanel"
        aria-labelledby="tm-explore-tab"
        hidden={view !== 'explore'}
      >
        <p className="sr-only" role="status" aria-atomic="true">
          {selected
            ? historyDate(selected.date) + ', ' + selected.title
            : 'Aucun événement sélectionné.'}
        </p>
        <details className={styles['advancedFilters']}>
          <summary>
            Affiner la chronologie
            <span>
              {fromYear} - {toYear}
              {category !== 'all' ? ' / ' + HISTORY_CATEGORIES[category].label : ''}
              {query ? ' / Recherche active' : ''}
            </span>
          </summary>
          <div className={styles['eras']} aria-label="Périodes de l'histoire de l'IA">
            {HISTORY_ERAS.map((item, index) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={era?.id === item.id}
                onClick={() => {
                  setPeriod(
                    era?.id === item.id
                      ? { fromYear: data.fromYear, toYear: data.toYear }
                      : { fromYear: item.from, toYear: item.to },
                  );
                  setPlaying(false);
                }}
              >
                <span>
                  <small>{String(index + 1).padStart(2, '0')}</small>
                  {item.from} - {item.to}
                </span>
                <strong>{item.label}</strong>
              </button>
            ))}
          </div>
          <div className={styles['filterBar']}>
            <div className={styles['categories']} aria-label="Types d'événements">
              <button
                type="button"
                aria-pressed={category === 'all'}
                onClick={() => {
                  setCategory('all');
                  setPlaying(false);
                }}
              >
                Tout
              </button>
              {(
                Object.entries(HISTORY_CATEGORIES) as [
                  HistoryCategory,
                  (typeof HISTORY_CATEGORIES)[HistoryCategory],
                ][]
              ).map(([id, item]) => (
                <button
                  type="button"
                  key={id}
                  style={{ '--event-color': item.color } as CSSProperties}
                  aria-pressed={category === id}
                  onClick={() => {
                    setCategory(id);
                    setPlaying(false);
                  }}
                >
                  <i />
                  {item.label}
                </button>
              ))}
            </div>
            <label className={styles['search']}>
              <Icon name="search" />
              <span className="sr-only">Rechercher une annonce, un modèle ou une organisation</span>
              <input
                type="search"
                value={query}
                placeholder="Un modèle, une annonce..."
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPlaying(false);
                }}
              />
            </label>
          </div>
          <div className={styles['periodBar']} role="group" aria-label="Filtrer par années">
            <div className={styles['periodLabel']}>
              <span>PÉRIODE AFFICHÉE</span>
              <strong>{fromYear === toYear ? fromYear : `${fromYear} - ${toYear}`}</strong>
            </div>
            <div className={styles['periodControls']}>
              <label>
                <span>De</span>
                <select
                  aria-label="Année de début"
                  value={fromYear}
                  onChange={(event) => {
                    changeYear('from', event.target.value);
                  }}
                >
                  {availableYears.map((value) => (
                    <option value={value} key={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>à</span>
                <select
                  aria-label="Année de fin"
                  value={toYear}
                  onChange={(event) => {
                    changeYear('to', event.target.value);
                  }}
                >
                  {availableYears.map((value) => (
                    <option value={value} key={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={allYears}
                onClick={() => {
                  setPeriod({ fromYear: data.fromYear, toYear: data.toYear });
                  setPlaying(false);
                }}
              >
                Toutes les années
              </button>
            </div>
          </div>
        </details>
        <section ref={board} className={styles['board']} aria-label="Explorateur chronologique">
          <div className={styles['boardHeading']}>
            <div>
              <h2>
                {era?.label ??
                  (allYears
                    ? "Les grandes dates de l'IA"
                    : fromYear === toYear
                      ? `Annonces de ${fromYear}`
                      : `Annonces de ${fromYear} à ${toYear}`)}
              </h2>
            </div>
            <div>
              {!allYears || category !== 'all' || query || landmarksOnly ? (
                <button type="button" onClick={resetFilters}>
                  Tout l'historique
                </button>
              ) : null}
            </div>
          </div>
          {selected ? (
            <div className={styles['explorerGrid']}>
              <EventInspector
                event={selected}
                events={events}
                index={selectedIndex}
                total={events.length}
                onSelect={selectEvent}
              />
              <div className={styles['curvePanel']}>
                <div className={styles['transport']}>
                  <button
                    type="button"
                    className={styles['playButton']}
                    aria-label={isPlaying ? 'Mettre la lecture en pause' : "Rejouer l'histoire"}
                    disabled={!motionEnabled || events.length < 2}
                    onClick={() => {
                      if (!isPlaying && selectedIndex >= events.length - 1 && events[0])
                        setSelectedId(events[0].id);
                      setPlaying(!isPlaying);
                    }}
                  >
                    <Icon name={isPlaying ? 'pause' : 'play'} />
                  </button>
                  <button
                    type="button"
                    className={styles['rewindButton']}
                    aria-label="Revenir au premier événement"
                    onClick={() => {
                      selectEvent(0);
                    }}
                    disabled={selectedIndex === 0}
                  >
                    <Icon name="rewind" />
                  </button>
                  <div className={styles['scrubber']}>
                    <div>
                      <span>{historyDate(events[0]?.date ?? String(fromYear))}</span>
                      <label htmlFor="tm-timeline">REMONTEZ LE TEMPS</label>
                      <span>{historyDate(events.at(-1)?.date ?? String(toYear))}</span>
                    </div>
                    <input
                      id="tm-timeline"
                      aria-label="Parcourir les événements chronologiques"
                      aria-valuetext={historyDate(selected.date) + ', ' + selected.shortTitle}
                      type="range"
                      min="0"
                      max={events.length - 1}
                      step="1"
                      value={selectedIndex}
                      onChange={(event) => {
                        selectEvent(Number(event.target.value));
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles['speedButton']}
                    aria-label={`Vitesse de lecture : ${speed}. Cliquer pour changer.`}
                    onClick={() => {
                      setSpeed(speed === 1 ? 2 : speed === 2 ? 0.5 : 1);
                    }}
                  >
                    {speed.toLocaleString('fr-FR')}x
                  </button>
                </div>
                <details className={styles['curveDisclosure']}>
                  <summary>
                    Voir la courbe chronologique <Icon name="next" />
                  </summary>
                  <TimeMachineChart
                    key={`${fromYear}-${toYear}`}
                    events={events}
                    fromYear={fromYear}
                    toYear={toYear}
                    selectedIndex={selectedIndex}
                    onSelect={selectEvent}
                  />
                </details>
              </div>
            </div>
          ) : (
            <div className={styles['empty']}>
              <h3>Aucun résultat.</h3>
              <button type="button" className={styles['primaryButton']} onClick={resetFilters}>
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </section>
        <div className={styles['underBoard']}>
          <label>
            <input
              type="checkbox"
              checked={landmarksOnly}
              onChange={(event) => {
                setLandmarksOnly(event.target.checked);
                setPlaying(false);
              }}
            />
            Jalons majeurs uniquement
          </label>
        </div>
        <section className={styles['archive']} aria-labelledby="tm-archive-title">
          <div className={styles['sectionHeading']}>
            <div>
              <h2 id="tm-archive-title">
                Toutes les annonces<span>.</span>
              </h2>
            </div>
            <div>
              <span>{events.length} événements</span>
              <button
                type="button"
                aria-pressed={newestFirst}
                onClick={() => {
                  setNewestFirst(!newestFirst);
                }}
              >
                {newestFirst ? "Plus récents d'abord" : "Plus anciens d'abord"}
                <Icon name="next" />
              </button>
            </div>
          </div>
          <div className={styles['eventList']}>
            {[...groups].map(([groupYear, items]) => (
              <details
                key={groupYear}
                className={styles['yearGroup']}
                open={groupYear === selected?.date.slice(0, 4) || fromYear === toYear}
              >
                <summary>
                  <h3>{groupYear}</h3>
                  <span>
                    {items.length} {items.length === 1 ? 'événement' : 'événements'}
                    <Icon name="next" />
                  </span>
                </summary>
                <div>
                  {items.map((event) => (
                    <article
                      key={event.id}
                      id={historyEventAnchor(event.id)}
                      className={styles['eventRow']}
                      style={eventStyle(event)}
                      data-selected={selectedId === event.id}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(event.id);
                          setPlaying(false);
                          board.current?.scrollIntoView({
                            behavior: motionEnabled ? 'smooth' : 'instant',
                            block: 'start',
                          });
                        }}
                        aria-label={'Explorer : ' + event.title}
                      >
                        <span className={styles['rowArtwork']}>
                          <HistoryArtwork event={event} />
                        </span>
                        <div className={styles['rowCopy']}>
                          <time dateTime={event.date}>
                            {historyDate(event.date).replace(' ' + groupYear, '')}
                          </time>
                          <div>
                            <span className={styles['rowCategory']}>
                              <i />
                              {HISTORY_CATEGORIES[event.category].singular}
                              <small>{HISTORY_DATE_KINDS[event.dateKind]}</small>
                            </span>
                            <h4>{event.shortTitle}</h4>
                          </div>
                          <span className={styles['rowOrganization']}>
                            {event.organization}
                            <Icon name="next" />
                          </span>
                        </div>
                      </button>
                      <details className={styles['archiveDetails']}>
                        <summary>Détails et sources</summary>
                        <h5>{event.title}</h5>
                        <p>{event.summary}</p>
                        <p>{event.context}</p>
                        <div className={styles['sources']}>
                          {event.sources.map((source) => (
                            <a
                              key={source.url}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={'Source primaire : ' + event.title + ', ' + source.label}
                            >
                              {source.label}
                              <Icon name="source" />
                            </a>
                          ))}
                        </div>
                      </details>
                    </article>
                  ))}
                </div>
              </details>
            ))}
          </div>
          {!events.length ? (
            <p className={styles['listEmpty']}>Aucun résultat pour cette sélection.</p>
          ) : null}
        </section>
      </section>
      <section
        id="tm-wrapped-panel"
        role="tabpanel"
        aria-labelledby="tm-wrapped-tab"
        hidden={view !== 'wrapped'}
      >
        <div className={styles['wrappedControls']}>
          <span
            data-analytics-event="experience_interaction"
            data-analytics-placement="time-machine"
            data-analytics-action="share"
          >
            <CopyButton
              text={'/time-machine#wrapped-' + String(year)}
              label="Partager cette année"
            />
          </span>
          <label>
            Année
            <select
              value={year}
              onChange={(event) => {
                setYear(Number(event.target.value));
                setExportMessage('');
              }}
            >
              {historyYears(data.events).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles['wrappedPoster']}>
          <div className={styles['posterTop']}>
            <span>SANDBOX WRAPPED</span>
            <span>{wrapped.ongoing ? 'ANNÉE EN COURS' : 'RÉTROSPECTIVE'}</span>
          </div>
          <div className={styles['posterYear']} aria-hidden="true">
            {year}
          </div>
          <h2>
            L'année en IA<span>.</span>
          </h2>
          <p className={styles['posterIntro']}>{wrapped.events.length} événements documentés.</p>
          <div className={styles['wrappedStats']}>
            <div>
              <strong>{wrapped.models}</strong>
              <span>annonces de modèles</span>
            </div>
            <div>
              <strong>{wrapped.organizations}</strong>
              <span>organisations représentées</span>
            </div>
            <div>
              <strong>{wrapped.highlights.length}</strong>
              <span>jalons à retenir</span>
            </div>
          </div>
          <div className={styles['wrappedHighlights']}>
            {(wrapped.highlights.length ? wrapped.highlights : wrapped.events.slice(0, 6)).map(
              (event) => (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => {
                    openEvent(event);
                  }}
                  style={eventStyle(event)}
                >
                  <span className={styles['wrappedArtwork']}>
                    <HistoryArtwork event={event} />
                  </span>
                  <time dateTime={event.date}>{historyDate(event.date)}</time>
                  <h3>{event.shortTitle}</h3>
                  <span>
                    {event.organization}
                    <Icon name="next" />
                  </span>
                </button>
              ),
            )}
          </div>
          <p className={styles['posterNote']}>
            Sélection non exhaustive.
            {wrapped.ongoing
              ? ' Année en cours, recherche vérifiée le ' + historyDate(data.reviewedAt) + '.'
              : ''}
          </p>
        </div>
        <div
          className={styles['exportBar']}
          data-analytics-event="experience_interaction"
          data-analytics-placement="time-machine"
          data-analytics-action="export"
        >
          <div>
            <button
              type="button"
              onClick={() => {
                download('json');
              }}
              disabled={!wrapped.events.length}
            >
              Exporter les données
            </button>
            <button
              type="button"
              className={styles['primaryButton']}
              onClick={() => {
                download('svg');
              }}
              disabled={!wrapped.events.length}
            >
              <Icon name="download" />
              Télécharger le Wrapped
            </button>
          </div>
        </div>
        <p className={styles['exportMessage']} role="status">
          {exportMessage}
        </p>
        <div className={styles['wrappedAll']}>
          <h3>Toutes les annonces de {year}</h3>
          {wrapped.events.map((event) => (
            <button
              type="button"
              key={event.id}
              onClick={() => {
                openEvent(event);
              }}
            >
              <time>{historyDate(event.date)}</time>
              <span>{event.title}</span>
              <Icon name="next" />
            </button>
          ))}
        </div>
      </section>
      <details className={styles['methodology']}>
        <summary>Sources et méthode</summary>
        <p>Les références renvoient aux sources primaires.</p>
        <p>Illustrations de concept, sans valeur de document d'archive.</p>
        <div>
          <h2>Sources et méthode</h2>
        </div>
        <div>
          <p>
            Sélection non exhaustive, vérifiée auprès des laboratoires, des chercheurs et des
            institutions. La courbe cumule les événements retenus.
          </p>
          <p>
            Chaque fiche distingue annonce, publication et sortie. Une annonce ne garantit pas un
            accès public. Les dates conservent leur précision d'origine.
          </p>
          <p>
            En recherche, les fiches précisent la portée du résultat : preuve proposée, vérification
            formelle, expérience ou essai clinique.
          </p>
          <p>
            Vérifié le <time dateTime={data.reviewedAt}>{historyDate(data.reviewedAt)}</time>.
            Dernier événement : {latestEvent ? historyDate(latestEvent.date) : 'aucun'}.
          </p>
          <p>
            Par <Link href="/about">l'équipe Sandbox</Link>.{' '}
            <Link href="/podcast">Talk Show IA</Link> et{' '}
            <Link href="/charts">classements d'outils IA</Link>.
          </p>
        </div>
      </details>
      <div className={styles['pageFootnote']}>
        <a
          href="#tm-archive-title"
          onClick={() => {
            changeView('explore');
          }}
        >
          Consulter la chronologie
          <Icon name="next" />
        </a>
      </div>
    </div>
  );
}
