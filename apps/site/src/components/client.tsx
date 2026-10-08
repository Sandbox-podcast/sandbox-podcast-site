'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { formatDate, formatRelative, formatTimeUtc } from '@/domain/format';

/**
 * Date de mise à jour : le serveur affiche la date absolue (stable, indexable), le navigateur y ajoute
 * « il y a 2 h » une fois monté. On n'écrit jamais de durée relative dans du HTML statique : elle serait fausse.
 */
export function TimeAgo({ iso }: { iso: string }) {
  const [relative, setRelative] = useState<string | null>(null);
  useEffect(() => {
    setRelative(formatRelative(new Date(iso), new Date()));
  }, [iso]);
  return (
    <time dateTime={iso}>
      {formatDate(iso)} · {formatTimeUtc(iso)}
      {relative ? ` · ${relative}` : ''}
    </time>
  );
}

export function ScrollState() {
  useEffect(() => {
    const update = (): void => {
      document.documentElement.setAttribute(
        'data-scrolled',
        window.scrollY > 24 ? 'true' : 'false',
      );
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
    };
  }, []);
  return null;
}

export function CopyButton({ text, label = 'Copier le lien' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [manualLink, setManualLink] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = async (): Promise<void> => {
    const absolute = text.startsWith('/') ? `${window.location.origin}${text}` : text;
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(absolute);
      setDone(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setDone(false);
      }, 2500);
    } catch {
      setDone(false);
      setCopyError(true);
      setManualLink(absolute);
    }
  };
  return (
    <span className="copy-feedback">
      <button type="button" className="btn" onClick={() => void copy()}>
        {done ? 'Lien copié' : label}
      </button>
      <span role="status" className={copyError ? undefined : 'sr-only'}>
        {done
          ? 'Lien copié dans le presse-papiers'
          : copyError
            ? 'Copie indisponible. Sélectionnez ce lien :'
            : ''}
      </span>
      {copyError ? (
        <input
          aria-label="Lien à copier"
          readOnly
          value={manualLink}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
        />
      ) : null}
    </span>
  );
}

/**
 * Lecteur YouTube « façade » : aucune requête vers YouTube avant le clic (vie privée, performances),
 * puis l'iframe est chargée depuis le domaine sans cookies.
 */
export function YouTubeFacade({
  id,
  title,
  startAt,
  thumbnailUrl,
}: {
  id: string;
  title: string;
  startAt?: number;
  thumbnailUrl?: string | undefined;
}) {
  const [active, setActive] = useState(false);
  if (active) {
    const start = startAt ? `&start=${String(startAt)}` : '';
    return (
      <iframe
        className="aspect-video w-full border-2 border-ink"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0${start}`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setActive(true);
      }}
      className="youtube-facade group relative grid aspect-video w-full place-items-center overflow-hidden border-2 border-ink bg-ink text-paper"
      aria-label={`Lire la vidéo : ${title}`}
    >
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt=""
          fill
          sizes="(max-width: 56rem) 100vw, 65vw"
          className="youtube-facade-image"
        />
      ) : null}
      <span
        className="youtube-facade-play grid size-20 place-items-center bg-hl text-on-hl transition-transform group-hover:scale-105"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="youtube-facade-label label absolute bottom-3 left-4">
        Charger la vidéo YouTube
      </span>
    </button>
  );
}
