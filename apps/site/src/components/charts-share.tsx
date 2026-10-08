'use client';

import { useRef, useState } from 'react';
import {
  SHARE_FORMATS,
  chartShareSvg,
  type ChartShareContent,
  type ShareFormat,
} from '@/domain/chart-share';

export function ChartsShare({
  content,
  url,
  onClose,
}: {
  content: ChartShareContent;
  url: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement | null>(null);
  const [format, setFormat] = useState<ShareFormat>('linkedin');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const svg = chartShareSvg(content, format);
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  async function download(): Promise<void> {
    setPending(true);
    setMessage('');
    try {
      await document.fonts.ready;
      const img = new Image();
      img.src = source;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = SHARE_FORMATS[format].width;
      canvas.height = SHARE_FORMATS[format].height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Export indisponible dans ce navigateur.');
      context.drawImage(img, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('Export PNG indisponible.'));
        }, 'image/png');
      });
      const localUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = localUrl;
      link.download = `sandbox-charts-${content.week}-${content.rank}-${format}.png`;
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(localUrl);
      }, 1000);
      setMessage('Visuel téléchargé.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export indisponible.');
    } finally {
      setPending(false);
    }
  }
  return (
    <dialog
      className="sc-share-dialog"
      ref={(element) => {
        dialog.current = element;
        if (element && !element.open) element.showModal();
      }}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      aria-labelledby="sc-share-title"
    >
      <div className="sc-share-heading">
        <div>
          <p className="sc-label">SHARE RANKING</p>
          <h2 id="sc-share-title">Le chart, prêt à partager.</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer l'export">
          ×
        </button>
      </div>
      <div className="sc-share-formats" role="group" aria-label="Format du visuel">
        {(Object.keys(SHARE_FORMATS) as ShareFormat[]).map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={format === item}
            onClick={() => {
              setFormat(item);
            }}
          >
            {SHARE_FORMATS[item].label}
          </button>
        ))}
      </div>
      <div className="sc-share-preview">
        {/* SVG généré localement, texte échappé, sans HTML utilisateur. */}
        <img
          src={source}
          width={SHARE_FORMATS[format].width}
          height={SHARE_FORMATS[format].height}
          alt={`${content.name}, rang ${content.rank}, semaine ${content.week}`}
        />
      </div>
      <div className="sc-share-actions">
        <button
          className="btn btn-solid"
          type="button"
          disabled={pending}
          onClick={() => void download()}
        >
          {pending ? 'Export en cours' : 'Télécharger le PNG'}
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            void navigator.clipboard
              .writeText(new URL(url, window.location.origin).href)
              .then(() => {
                setMessage('Lien copié.');
              })
              .catch(() => {
                setMessage('Copie indisponible. Le lien reste affiché ci-dessous.');
              });
          }}
        >
          Copier le lien
        </button>
      </div>
      <p className="sc-label">
        {SHARE_FORMATS[format].width} × {SHARE_FORMATS[format].height} px
      </p>
      <a className="sc-share-url" href={url}>
        {url}
      </a>
      <p role="status">{message}</p>
    </dialog>
  );
}
