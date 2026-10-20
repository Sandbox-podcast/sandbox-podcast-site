'use client';

import Image from 'next/image';
import {
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import { StageMotionContext, HomeMotionToggleContext } from './home-motion';
import { SandboxRoomContent } from './sandbox-room-content';
import { Text, useLocalization } from './localization';
import { SANDBOX_ROOMS, sandboxRoom, type SandboxRoomId } from '@/domain/sandbox-rooms';
import { portalProjects } from '@/domain/studio-portal';
import type { PersonalProject } from '@/domain/personal-projects';
import type { Episode } from '@/domain/schema';
import type { TimeMachineData } from '@/domain/time-machine';
import {
  worldAnchorFromScreen,
  worldAnchorOnScreen,
  type WorldAnchor,
} from '@/domain/sandbox-world-motion';
import { localizedHref } from '@/i18n/routing';
import type { WorldRenderer } from './sandbox-world-renderer';
import styles from './sandbox-world.module.css';

function nextRoom(id: SandboxRoomId): SandboxRoomId {
  const index = SANDBOX_ROOMS.findIndex((room) => room.id === id);
  return SANDBOX_ROOMS[(index + 1) % SANDBOX_ROOMS.length]?.id ?? 'studio';
}

function roomFromHash(): SandboxRoomId {
  const value = window.location.hash.replace('#room-', '');
  return SANDBOX_ROOMS.find((room) => room.id === value)?.id ?? 'studio';
}

export function SandboxWorld({
  episodes,
  projects,
  newsAvailable,
  heroCopy,
  historyData,
}: {
  episodes: readonly Episode[];
  projects: readonly PersonalProject[];
  newsAvailable: boolean;
  heroCopy: { eyebrow: string; title: string; description: string };
  historyData?: TimeMachineData | undefined;
}) {
  const { locale, t } = useLocalization();
  const paused = useContext(StageMotionContext);
  const toggleMotion = useContext(HomeMotionToggleContext);
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<WorldRenderer | null>(null);
  const current = useRef<SandboxRoomId>('studio');
  const operation = useRef(0);
  const pointerAnchor = useRef<WorldAnchor>({ x: 0.5, y: 0.4 });
  const requestedPreview = useRef<SandboxRoomId | null>(null);
  const focusAfterTravel = useRef(false);
  const restoringFocus = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const [roomId, setRoomId] = useState<SandboxRoomId>('studio');
  const [exploreId, setExploreId] = useState<SandboxRoomId>('projects');
  const [ready, setReady] = useState(false);
  const [traveling, setTraveling] = useState(false);
  const [previewId, setPreviewId] = useState<SandboxRoomId | null>(null);
  const [loading, setLoading] = useState<SandboxRoomId | null>(null);
  const [revision, setRevision] = useState(0);
  const [failedImage, setFailedImage] = useState(false);
  const [sceneSize, setSceneSize] = useState({ width: 1672, height: 941 });
  const [announcement, setAnnouncement] = useState('');
  const room = sandboxRoom(roomId);
  const photoScale = Math.max(sceneSize.width / 1672, sceneSize.height / 941);
  const wallAnchors: Record<SandboxRoomId, WorldAnchor> = {
    studio: { x: 0.5, y: 0.4 },
    projects: { x: 0.5, y: 0.5 },
    rankings: { x: 0.503, y: 0.285 },
    history: { x: 0.5, y: 0.5 },
    cinema: { x: 0.5, y: 0.5 },
    news: { x: 0.288, y: 0.356 },
  };
  const wall = worldAnchorOnScreen(wallAnchors[roomId], sceneSize.width, sceneSize.height);

  function announceArrival(id: SandboxRoomId) {
    setAnnouncement(t(sandboxRoom(id).title));
    if (focusAfterTravel.current) {
      requestAnimationFrame(() => {
        document.getElementById(`room-title-${id}`)?.focus({ preventScroll: true });
      });
    }
  }

  useEffect(() => {
    const scene = canvas.current?.parentElement;
    if (!scene) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSceneSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(scene);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    function restore() {
      engine.current?.cancel();
      const id = roomFromHash();
      current.current = id;
      setRoomId(id);
      setExploreId(nextRoom(id));
      requestedPreview.current = null;
      setPreviewId(null);
      setReady(false);
      setFailedImage(false);
      setTraveling(false);
      setLoading(null);
      setAnnouncement(sandboxRoom(id).title);
      if (document.activeElement !== document.body) {
        requestAnimationFrame(() =>
          document.getElementById(`room-title-${id}`)?.focus({ preventScroll: true }),
        );
      }
      setRevision((value) => value + 1);
    }
    if (window.location.hash.startsWith('#room-')) restore();
    window.addEventListener('popstate', restore);
    return () => {
      window.removeEventListener('popstate', restore);
    };
  }, []);

  useEffect(() => {
    const target = canvas.current;
    const section = root.current;
    if (!target || !section) return;
    const media = window.matchMedia(
      '(min-width: 901px) and (min-aspect-ratio: 6/5) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    let cancelled = false;
    let instance: WorldRenderer | null = null;
    function stop() {
      operation.current++;
      requestedPreview.current = null;
      instance?.cancel();
      setPreviewId(null);
      setLoading(null);
    }
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        stop();
        restoringFocus.current = true;
        requestAnimationFrame(() => {
          trigger.current?.focus({ preventScroll: true });
          restoringFocus.current = false;
        });
      }
    }
    function visibility() {
      if (document.hidden) stop();
    }
    function preference() {
      stop();
      setReady(false);
      setRevision((value) => value + 1);
    }
    function lost() {
      stop();
      setReady(false);
      engine.current = null;
    }
    if (media.matches && !paused) {
      void import('./sandbox-world-renderer')
        .then(({ createWorldRenderer }) => {
          if (cancelled) return null;
          return createWorldRenderer(
            target,
            SANDBOX_ROOMS,
            current.current,
            portalProjects(projects),
            (id) => {
              current.current = id;
              setRoomId(id);
              setExploreId(nextRoom(id));
              requestedPreview.current = null;
              setFailedImage(false);
              setPreviewId(null);
              announceArrival(id);
              window.history.pushState({ room: id }, '', `#room-${id}`);
            },
            (active) => {
              if (!cancelled) setTraveling(active);
            },
          );
        })
        .then((created) => {
          if (!created) return;
          if (cancelled) {
            created.dispose();
            return;
          }
          instance = created;
          engine.current = created;
          setTraveling(false);
          setReady(true);
        })
        .catch(() => {
          if (!cancelled) setReady(false);
        });
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) stop();
    });
    observer.observe(section);
    media.addEventListener('change', preference);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', visibility);
    target.addEventListener('webglcontextlost', lost);
    return () => {
      cancelled = true;
      engine.current = null;
      instance?.dispose();
      observer.disconnect();
      media.removeEventListener('change', preference);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', stop);
      document.removeEventListener('visibilitychange', visibility);
      target.removeEventListener('webglcontextlost', lost);
    };
  }, [paused, projects, revision]);

  function preview(id: SandboxRoomId) {
    if (id === current.current || traveling || !engine.current) return;
    setExploreId(id);
    if (requestedPreview.current === id) return;
    requestedPreview.current = id;
    const request = ++operation.current;
    setLoading(id);
    void engine.current
      .preview(id, pointerAnchor.current)
      .then(() => {
        if (request !== operation.current) return;
        setPreviewId(id);
        setLoading(null);
      })
      .catch(() => {
        if (request === operation.current) {
          requestedPreview.current = null;
          setLoading(null);
        }
      });
  }
  function leave() {
    if (traveling) return;
    operation.current++;
    requestedPreview.current = null;
    engine.current?.leave();
    setPreviewId(null);
    setLoading(null);
  }
  function enter(id: SandboxRoomId) {
    if (traveling || id === current.current) return;
    if ((root.current?.getBoundingClientRect().top ?? 0) < -100) {
      root.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    focusAfterTravel.current = trigger.current?.matches(':focus-visible') ?? false;
    if (engine.current) {
      setLoading(id);
      void engine.current
        .enter(id, pointerAnchor.current)
        .then(() => {
          setLoading(null);
        })
        .catch(() => {
          setLoading(null);
          window.location.assign(localizedHref(sandboxRoom(id).href, locale));
        });
    } else {
      current.current = id;
      setRoomId(id);
      setExploreId(nextRoom(id));
      requestedPreview.current = null;
      setFailedImage(false);
      window.history.pushState({ room: id }, '', `#room-${id}`);
      setReady(false);
      setRevision((value) => value + 1);
      announceArrival(id);
    }
  }
  function chooseDirection(direction: number) {
    const choices = SANDBOX_ROOMS.filter((item) => item.id !== current.current);
    const index = choices.findIndex((item) => item.id === exploreId);
    const next = choices[(index + direction + choices.length) % choices.length];
    if (!next) return;
    setExploreId(next.id);
    preview(next.id);
  }
  function reveal(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'mouse' || traveling) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerAnchor.current = worldAnchorFromScreen(
      {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
      },
      bounds.width,
      bounds.height,
    );
    engine.current?.aim(pointerAnchor.current);
    preview(exploreId);
  }

  return (
    <section
      ref={root}
      className={styles['world']}
      aria-label={t('Explorer le studio')}
      data-sandbox-room={roomId}
      data-world-ready={ready && !paused}
      data-world-traveling={traveling}
      data-world-preview={previewId ?? ''}
      id="studio-lights"
    >
      <div
        className={styles['scene']}
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse') return;
          const bounds = event.currentTarget.getBoundingClientRect();
          engine.current?.look(
            ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
            ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
          );
        }}
        onPointerLeave={leave}
      >
        {!failedImage ? (
          <Image
            key={room.id}
            src={room.image}
            alt=""
            fill
            sizes="max(100vw, 178vh)"
            quality={75}
            loading={roomId === 'studio' ? 'eager' : undefined}
            fetchPriority={roomId === 'studio' ? 'high' : undefined}
            onError={() => {
              setFailedImage(true);
            }}
            className={styles['photo']}
          />
        ) : null}
        <canvas
          key={`${revision}-${paused}`}
          ref={canvas}
          className={styles['canvas']}
          aria-hidden="true"
        />
        <div className={styles['shade']} />
        <button
          type="button"
          data-world-surface
          className={styles['surface']}
          aria-label={`${t('Entrer')} : ${t(sandboxRoom(exploreId).title)}`}
          inert={traveling}
          onPointerEnter={reveal}
          onPointerMove={reveal}
          onPointerLeave={(event) => {
            if (
              event.relatedTarget instanceof Element &&
              event.relatedTarget.closest('[data-world-controls]')
            )
              return;
            leave();
          }}
          onFocus={() => {
            if (!restoringFocus.current) preview(exploreId);
          }}
          onBlur={leave}
          onClick={() => {
            enter(exploreId);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault();
              chooseDirection(event.key === 'ArrowRight' ? 1 : -1);
            }
          }}
        />
        <div
          className={styles['content']}
          inert={traveling}
          style={
            {
              '--room-wall-x': `${wall.x * 100}%`,
              '--room-wall-y': `${wall.y * 100}%`,
              '--room-photo-width': `${1672 * photoScale}px`,
              '--room-photo-height': `${941 * photoScale}px`,
              '--room-view-width': `${sceneSize.width}px`,
              '--room-view-height': `${sceneSize.height}px`,
              '--room-scale': photoScale,
            } as CSSProperties
          }
        >
          <SandboxRoomContent
            historyData={historyData}
            roomId={roomId}
            episodes={episodes}
            projects={projects}
            newsAvailable={newsAvailable}
            onRoomChange={enter}
            heroCopy={heroCopy}
            minimalStudio
          />
        </div>
        <div className={styles['status']} role="status">
          {loading ? <Text>Chargement de la pièce…</Text> : null}
        </div>
        <div
          className={styles['controls']}
          data-world-controls
          hidden={(!previewId && !loading) || traveling}
          onPointerLeave={(event) => {
            if (
              event.relatedTarget instanceof Element &&
              event.relatedTarget.closest('[data-world-surface]')
            )
              return;
            leave();
          }}
        >
          <button
            type="button"
            aria-label={t('Précédent')}
            onClick={() => {
              chooseDirection(-1);
            }}
          >
            ←
          </button>
          <button
            type="button"
            className={styles['destination']}
            onClick={() => {
              enter(exploreId);
            }}
          >
            <Text>{sandboxRoom(exploreId).title}</Text>
            <span>
              <Text>Entrer</Text> ↗
            </span>
          </button>
          <button
            type="button"
            aria-label={t('Suivant')}
            onClick={() => {
              chooseDirection(1);
            }}
          >
            →
          </button>
        </div>
        <span className={styles['announcement']} role="status">
          {announcement}
        </span>
      </div>
      <div className={styles['footer']}>
        <details
          className={styles['explorer']}
          data-world-explorer
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }
          }}
        >
          <summary>
            <span className={styles['explorerTitle']}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M3 3h4v4H3zm8 0h4v4h-4zM3 11h4v4H3zm8 0h4v4h-4z" stroke="currentColor" />
              </svg>
              <Text>Explorer les pièces</Text>
            </span>
            <span className={styles['currentRoom']} aria-hidden="true">
              <Text>{room.title}</Text>
            </span>
            <span className={styles['explorerCaret']} aria-hidden="true">
              ⌄
            </span>
          </summary>
          <div className={styles['explorerPanel']}>
            <label className={styles['roomSelect']}>
              <span>
                <Text>Les pièces</Text>
              </span>
              <select
                aria-label={t('Les pièces')}
                value={roomId}
                disabled={traveling}
                onChange={(event) => {
                  const next = SANDBOX_ROOMS.find((item) => item.id === event.target.value);
                  if (next) {
                    pointerAnchor.current = { x: 0.5, y: 0.4 };
                    enter(next.id);
                    const disclosure = event.currentTarget.closest('details');
                    if (disclosure) {
                      disclosure.open = false;
                      trigger.current = disclosure.querySelector('summary');
                    }
                  }
                }}
              >
                {SANDBOX_ROOMS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {t(item.title)}
                  </option>
                ))}
              </select>
            </label>
            {toggleMotion ? (
              <button
                className={styles['motionToggle']}
                type="button"
                aria-pressed={paused}
                onClick={() => {
                  engine.current?.cancel();
                  setReady(false);
                  toggleMotion();
                }}
              >
                <span className={styles['motionIndicator']} aria-hidden="true" />
                <Text>{paused ? 'Activer les mouvements' : 'Réduire les mouvements'}</Text>
              </button>
            ) : null}
          </div>
        </details>
      </div>
      <noscript>
        <nav aria-label={t('Les pièces')} className={styles['fallbackLinks']}>
          {SANDBOX_ROOMS.map((item) => (
            <a key={item.id} href={localizedHref(item.href, locale)}>
              <Text>{item.title}</Text>
            </a>
          ))}
        </nav>
      </noscript>
    </section>
  );
}
