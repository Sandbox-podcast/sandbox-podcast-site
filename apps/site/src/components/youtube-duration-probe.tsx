'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDurationExact } from '@/domain/format';

interface PlayerHandle {
  getDuration(): number;
  cueVideoById(videoId: string): void;
  destroy(): void;
}

interface PlayerEvent {
  target: PlayerHandle;
}

interface YouTubeIframeApi {
  Player: new (
    element: HTMLElement,
    options: {
      width: number;
      height: number;
      videoId: string;
      playerVars: { playsinline: number; origin: string };
      events: {
        onReady: (event: PlayerEvent) => void;
        onStateChange: (event: PlayerEvent) => void;
        onError: () => void;
      };
    },
  ) => PlayerHandle;
}

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let iframeApiPromise: Promise<YouTubeIframeApi> | undefined;

function loadIframeApi(): Promise<YouTubeIframeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  iframeApiPromise ??= new Promise<YouTubeIframeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement('script');
    const restoreCallback = () => {
      if (previous) window.onYouTubeIframeAPIReady = previous;
      else delete window.onYouTubeIframeAPIReady;
    };
    const timeout = window.setTimeout(() => {
      restoreCallback();
      reject(new Error('Le lecteur YouTube ne répond pas.'));
    }, 15_000);
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('Le lecteur YouTube est incomplet.'));
    };
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      restoreCallback();
      reject(new Error('Le lecteur YouTube ne peut pas être chargé.'));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    iframeApiPromise = undefined;
    throw error;
  });
  return iframeApiPromise;
}

/** Lecture de la durée directement dans le lecteur, quand la Data API n'est pas configurée. */
export function YouTubeDurationProbe({
  videoId,
  onDuration,
}: {
  videoId: string;
  onDuration: (durationSec: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const onDurationRef = useRef(onDuration);
  const [status, setStatus] = useState('Lecture de la durée depuis le lecteur YouTube…');
  onDurationRef.current = onDuration;

  useEffect(() => {
    let cancelled = false;
    let player: PlayerHandle | undefined;
    let interval: number | undefined;
    let timeout: number | undefined;
    let completed = false;

    const checkDuration = (target: PlayerHandle): boolean => {
      const duration = Math.round(target.getDuration());
      if (!Number.isSafeInteger(duration) || duration < 60 || completed || cancelled) return false;
      completed = true;
      if (interval !== undefined) window.clearInterval(interval);
      if (timeout !== undefined) window.clearTimeout(timeout);
      setStatus(`Durée YouTube détectée : ${formatDurationExact(duration)}.`);
      onDurationRef.current(duration);
      return true;
    };

    void loadIframeApi()
      .then((api) => {
        if (cancelled || !container.current) return;
        player = new api.Player(container.current, {
          width: 360,
          height: 240,
          videoId,
          playerVars: { playsinline: 1, origin: window.location.origin },
          events: {
            onReady: (event) => {
              if (!checkDuration(event.target)) event.target.cueVideoById(videoId);
            },
            onStateChange: (event) => {
              checkDuration(event.target);
            },
            onError: () => {
              if (!cancelled && !completed) setStatus('Durée YouTube indisponible.');
            },
          },
        });
        interval = window.setInterval(() => {
          if (player) checkDuration(player);
        }, 500);
        timeout = window.setTimeout(() => {
          if (!cancelled && !completed) setStatus('Durée YouTube indisponible.');
          if (interval !== undefined) window.clearInterval(interval);
        }, 12_000);
      })
      .catch(() => {
        if (!cancelled) setStatus('Le lecteur YouTube ne peut pas être chargé.');
      });

    return () => {
      cancelled = true;
      if (interval !== undefined) window.clearInterval(interval);
      if (timeout !== undefined) window.clearTimeout(timeout);
      player?.destroy();
    };
  }, [videoId]);

  return (
    <div className="admin-youtube-duration">
      <div ref={container} aria-label="Lecteur YouTube de vérification de la durée" />
      <p className="admin-help" role="status">
        {status}
      </p>
    </div>
  );
}
