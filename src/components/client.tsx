'use client';

import { useEffect, useState } from 'react';
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

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const explicit = document.documentElement.getAttribute('data-theme');
    setDark(
      explicit ? explicit === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches,
    );
  }, []);
  const toggle = (): void => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour cette page seulement.
    }
  };
  return (
    <button
      type="button"
      className="btn px-2.5 py-1.5"
      onClick={toggle}
      aria-pressed={dark}
      aria-label="Thème sombre"
    >
      <span aria-hidden="true">{dark ? '●' : '○'}</span>
      <span className="hidden sm:inline">{dark ? 'Sombre' : 'Clair'}</span>
    </button>
  );
}

export function CopyButton({ text, label = 'Copier le lien' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = (): void => {
    const absolute = text.startsWith('/') ? `${window.location.origin}${text}` : text;
    void navigator.clipboard.writeText(absolute).then(
      () => {
        setDone(true);
        window.setTimeout(() => {
          setDone(false);
        }, 2000);
      },
      () => {
        setDone(false);
      },
    );
  };
  return (
    <button type="button" className="btn" onClick={copy}>
      {done ? 'Lien copié ✓' : label}
      <span className="sr-only" role="status">
        {done ? 'Lien copié dans le presse-papiers' : ''}
      </span>
    </button>
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
}: {
  id: string;
  title: string;
  startAt?: number;
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
      className="group relative grid aspect-video w-full place-items-center border-2 border-ink bg-ink text-paper"
      aria-label={`Lire la vidéo : ${title}`}
    >
      <span
        className="grid size-20 place-items-center bg-hl text-on-hl transition-transform group-hover:scale-105"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="label absolute bottom-3 left-4">Lire sur YouTube · chargé au clic</span>
    </button>
  );
}
