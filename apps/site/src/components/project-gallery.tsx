'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import type { PersonalProject, ProjectImage } from '@/domain/personal-projects';
import { useLocalization } from './localization';
import styles from './project-store.module.css';

function ProjectVideo({ video }: { video: PersonalProject['videos'][number] }) {
  const { t } = useLocalization();
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <figure className={`${styles['galleryCard']} ${styles['videoCard']}`}>
      <figcaption>
        <span>{t(video.kind === 'demo' ? 'Démonstration' : 'Présentation du projet')}</span>
        <strong>{t(video.title)}</strong>
      </figcaption>
      <div className={styles['videoFrame']}>
        {active ? (
          <video
            controls
            autoPlay
            playsInline
            preload="none"
            poster={video.poster}
            onError={() => {
              setFailed(true);
            }}
            aria-label={t(video.title)}
          >
            <source
              src={video.src}
              type="video/mp4"
              onError={() => {
                setFailed(true);
              }}
            />
            {t('Votre navigateur ne peut pas lire cette vidéo.')}
          </video>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActive(true);
            }}
            aria-label={`${t('Lire la vidéo')} : ${t(video.title)}`}
          >
            <Image src={video.poster} alt="" fill sizes="(max-width: 700px) 85vw, 560px" />
            <span className={styles['play']}>
              <svg
                width="27"
                height="27"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="m8 4 13 8-13 8z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <a
        href={video.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles['mediaSource']}
      >
        {t(
          failed
            ? 'Vidéo indisponible. Voir la publication originale'
            : 'Voir la publication originale',
        )}
      </a>
    </figure>
  );
}

export function ProjectGallery({
  name,
  images,
  videos,
}: {
  name: string;
  images: readonly ProjectImage[];
  videos: PersonalProject['videos'];
}) {
  const { t } = useLocalization();
  const dialog = useRef<HTMLDialogElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const current = images[selected];
  if (!images.length && !videos.length) return null;
  const move = (delta: number) => {
    setSelected((index) => (index + delta + images.length) % images.length);
  };
  return (
    <section className={styles['gallery']} aria-label={`${t('Aperçus')} : ${name}`}>
      <div className={styles['sectionHeading']}>
        <h2>{t('Aperçus')}</h2>
        <div className={styles['galleryControls']}>
          <button
            type="button"
            aria-label={t('Aperçus précédents')}
            onClick={() => {
              rail.current?.scrollBy({
                left: -500,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'instant'
                  : 'smooth',
              });
            }}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            aria-label={t('Aperçus suivants')}
            onClick={() => {
              rail.current?.scrollBy({
                left: 500,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'instant'
                  : 'smooth',
              });
            }}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
      <div
        className={styles['galleryRail']}
        ref={rail}
        tabIndex={0}
        aria-label={t('Galerie défilante')}
      >
        {videos.map((video) => (
          <ProjectVideo key={video.src} video={video} />
        ))}
        {images.map((image, index) => (
          <figure className={styles['galleryCard']} key={image.src}>
            <figcaption>
              <span>
                {t(
                  image.kind === 'screenshot'
                    ? "Capture de l'application"
                    : 'Visuel de présentation',
                )}
              </span>
              <strong>{t(image.alt)}</strong>
            </figcaption>
            <button
              type="button"
              className={styles['screenshotButton']}
              aria-label={`${t('Agrandir')} : ${t(image.alt)}`}
              onClick={() => {
                setSelected(index);
                dialog.current?.showModal();
              }}
            >
              <Image
                src={image.src}
                alt={t(image.alt)}
                width={960}
                height={640}
                sizes="(max-width: 700px) 85vw, 440px"
              />
            </button>
          </figure>
        ))}
      </div>
      {current ? (
        <dialog
          ref={dialog}
          className={styles['lightbox']}
          aria-label={t('Aperçu agrandi')}
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') move(1);
            if (event.key === 'ArrowLeft') move(-1);
          }}
        >
          <div className={styles['lightboxTop']}>
            <p>{t(current.alt)}</p>
            <button
              type="button"
              autoFocus
              aria-label={t("Fermer l'aperçu")}
              onClick={() => {
                dialog.current?.close();
              }}
            >
              ×
            </button>
          </div>
          <Image src={current.src} alt={t(current.alt)} width={1800} height={1200} sizes="95vw" />
          <div className={styles['lightboxBottom']}>
            <button
              type="button"
              disabled={images.length < 2}
              onClick={() => {
                move(-1);
              }}
            >
              {t('Précédent')}
            </button>
            <span>
              {selected + 1} / {images.length}
            </span>
            <button
              type="button"
              disabled={images.length < 2}
              onClick={() => {
                move(1);
              }}
            >
              {t('Suivant')}
            </button>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}
