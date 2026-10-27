'use client';

import { useEffect, useRef, useState } from 'react';
import { chartBadgesSchema, type ChartBadge } from '@/domain/chart-badges';
import { BadgeGenerator } from './badge-generator';
import { LocalizedElement, Text, useLocalization } from './localization';
import styles from './badges.module.css';

export function ChartBadgeDialog({
  project,
  onClose,
}: {
  project: { slug: string; name: string };
  onClose: () => void;
}) {
  const { t } = useLocalization();
  const dialog = useRef<HTMLDialogElement>(null);
  const [badges, setBadges] = useState<ChartBadge[] | null>(null);
  const [selected, setSelected] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/charts/badges/${encodeURIComponent(project.slug)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Badges unavailable');
        const result = chartBadgesSchema.parse(await response.json());
        if (controller.signal.aborted) return;
        setBadges(result.badges);
        setSelected(result.badges[0]?.id ?? '');
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }
    void load();
    return () => {
      controller.abort();
    };
  }, [project.slug, attempt]);
  const badge = badges?.find((item) => item.id === selected);
  return (
    <dialog
      ref={dialog}
      className={styles['dialog']}
      aria-labelledby="chart-badge-title"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], select, textarea, input, [tabindex="0"]',
          ),
        ].filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className={styles['heading']}>
        <div>
          <p className="sc-label">
            <Text>{'Obtenir mon badge'}</Text>
          </p>
          <h2 id="chart-badge-title">{project.name}</h2>
        </div>
        <LocalizedElement
          as="button"
          className={styles['close']}
          type="button"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </LocalizedElement>
      </div>
      {failed ? (
        <div role="alert">
          <p>
            <Text>{'Les badges sont temporairement indisponibles.'}</Text>
          </p>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setFailed(false);
              setBadges(null);
              setAttempt((value) => value + 1);
            }}
          >
            <Text>{'Réessayer'}</Text>
          </button>
        </div>
      ) : badges === null ? (
        <p role="status">
          <Text>{'Chargement du badge.'}</Text>
        </p>
      ) : !badges.length ? (
        <p role="status">
          <Text>{'Aucun badge disponible pour ce projet.'}</Text>
        </p>
      ) : (
        <>
          {badges.length > 1 ? (
            <label className={styles['choice']}>
              <Text>{'Badge'}</Text>
              <select
                aria-label={t('Badge')}
                value={selected}
                onChange={(event) => {
                  setSelected(event.target.value);
                }}
              >
                {badges.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {badge ? (
            <BadgeGenerator
              key={badge.id}
              source={badge.source}
              snippets={badge.snippets}
              campaign={badge.campaign}
              expanded
            />
          ) : null}
        </>
      )}
    </dialog>
  );
}
