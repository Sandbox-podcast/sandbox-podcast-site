'use client';

import { useEffect, useRef, useState } from 'react';
import { Text, LocalizedLink as Link, useLocalization } from './localization';
import { recordBadgeEvent, type BadgeCampaign } from '@/lib/badge-analytics';
import type { awardShareContent, badgeSnippets } from '@/domain/badges';
import styles from './badges.module.css';

type EmbedFormat = 'markdown' | 'html' | 'image';
export function BadgeGenerator({
  snippets,
  source,
  week,
  share,
  campaign,
  period,
}: {
  snippets: ReturnType<typeof badgeSnippets>;
  source: string;
  week?: string;
  share?: ReturnType<typeof awardShareContent>;
  campaign?: BadgeCampaign;
  period?: string;
}) {
  const { t } = useLocalization();
  const [format, setFormat] = useState<EmbedFormat>('markdown');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [message, setMessage] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const code = useRef<HTMLTextAreaElement>(null);
  const shareText = useRef<HTMLTextAreaElement>(null);
  const shareLink = useRef<HTMLTextAreaElement>(null);
  const previewImage = useRef<HTMLImageElement>(null);
  const badgeType = campaign ?? (week ? 'rising_star' : 'github_top_100');
  useEffect(() => {
    // Une image servie du cache peut avoir terminé avant l'hydratation de React.
    const image = previewImage.current;
    if (image?.complete) {
      setPreviewLoading(false);
      setPreviewError(image.naturalWidth === 0);
    }
  }, [source, previewAttempt]);
  async function copy(value: string, shareFormat?: 'text' | 'url') {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(
        shareFormat === 'text'
          ? 'Texte de partage copié.'
          : shareFormat === 'url'
            ? 'Lien de la récompense copié.'
            : format === 'markdown'
              ? 'Code Markdown copié.'
              : format === 'html'
                ? 'Code HTML copié.'
                : 'URL du badge copiée.',
      );
      recordBadgeEvent(
        shareFormat ? 'badge_share' : 'badge_copy',
        badgeType,
        shareFormat ?? (format === 'image' ? 'url' : format),
      );
    } catch {
      const fallback =
        shareFormat === 'text'
          ? shareText.current
          : shareFormat === 'url'
            ? shareLink.current
            : code.current;
      fallback?.focus();
      fallback?.select();
      setMessage('Copie indisponible. Sélectionnez le code pour le copier.');
    }
  }
  return (
    <details
      className={styles['generator']}
      onToggle={(event) => {
        if (event.target === event.currentTarget && event.currentTarget.open) {
          recordBadgeEvent('badge_generator_open', badgeType);
          recordBadgeEvent('badge_preview', badgeType);
        }
      }}
    >
      <summary>
        <Text>{'Obtenir mon badge'}</Text>
        <span aria-hidden="true">+</span>
      </summary>
      <div className={styles['generatorBody']}>
        <div className={styles['previewControls']}>
          <span>
            <Text>{'Aperçu'}</Text>
          </span>
          <div role="group" aria-label={t("Fond de l'aperçu")}>
            {(['dark', 'light'] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={theme === item}
                onClick={() => {
                  setTheme(item);
                }}
              >
                <Text>{item === 'dark' ? 'Sombre' : 'Clair'}</Text>
              </button>
            ))}
          </div>
        </div>
        <div className={styles['preview']} data-theme={theme} aria-busy={previewLoading}>
          {/* Le même endpoint SVG public sert les README et cet aperçu. */}
          <img
            ref={previewImage}
            key={previewAttempt}
            src={source}
            alt={snippets.alt}
            loading="lazy"
            onLoad={() => {
              setPreviewLoading(false);
              setPreviewError(false);
            }}
            onError={() => {
              setPreviewLoading(false);
              setPreviewError(true);
            }}
          />
        </div>
        {previewLoading ? (
          <p role="status">
            <Text>{"Chargement de l'aperçu."}</Text>
          </p>
        ) : null}
        {previewError ? (
          <div role="alert">
            <p>
              <Text>{"L'aperçu est indisponible. Réessayez dans quelques instants."}</Text>
            </p>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setPreviewError(false);
                setPreviewLoading(true);
                setPreviewAttempt((attempt) => attempt + 1);
              }}
            >
              <Text>{"Réessayer l'aperçu"}</Text>
            </button>
          </div>
        ) : null}
        <div
          className={styles['formatControls']}
          role="group"
          aria-label={t("Format d'intégration")}
        >
          {(['markdown', 'html', 'image'] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={format === item}
              onClick={() => {
                setFormat(item);
                setMessage('');
              }}
            >
              {item === 'markdown' ? (
                'Markdown'
              ) : item === 'html' ? (
                'HTML'
              ) : (
                <Text>{'URL SVG'}</Text>
              )}
            </button>
          ))}
        </div>
        <label className={styles['codeLabel']}>
          <Text>
            {format === 'markdown'
              ? 'Code pour le README GitHub'
              : format === 'html'
                ? 'Code pour votre site'
                : 'Adresse du badge SVG'}
          </Text>
          <textarea
            ref={code}
            aria-label={t(
              format === 'markdown'
                ? 'Code pour le README GitHub'
                : format === 'html'
                  ? 'Code pour votre site'
                  : 'Adresse du badge SVG',
            )}
            readOnly
            spellCheck={false}
            rows={4}
            value={snippets[format]}
          />
        </label>
        <div className={styles['actions']}>
          <button
            className="btn btn-solid"
            type="button"
            onClick={() => void copy(snippets[format])}
          >
            <Text>
              {format === 'markdown'
                ? 'Copier le Markdown'
                : format === 'html'
                  ? 'Copier le HTML'
                  : "Copier l'URL"}
            </Text>
          </button>
          <a
            className="btn"
            href={source}
            download={`sandbox-${badgeType}-${period ?? week ?? 'rank'}.svg`}
          >
            <Text>{'Télécharger le SVG'}</Text>
          </a>
          <Link href="/charts/awards#installation">
            <Text>{"Guide d'installation"}</Text>
          </Link>
        </div>
        {share ? (
          <details className={styles['sharePanel']}>
            <summary>
              <Text>{'Partager la récompense'}</Text>
            </summary>
            <label className={styles['codeLabel']}>
              <Text>{'Texte de partage'}</Text>
              <textarea
                ref={shareText}
                aria-label={t('Texte de partage')}
                readOnly
                rows={3}
                value={share.text}
              />
            </label>
            <label className={styles['codeLabel']}>
              <Text>{'Lien de la récompense'}</Text>
              <textarea
                ref={shareLink}
                aria-label={t('Lien de la récompense')}
                readOnly
                rows={2}
                value={share.url}
              />
            </label>
            <div className={styles['actions']}>
              <button className="btn" type="button" onClick={() => void copy(share.text, 'text')}>
                <Text>{'Copier un texte de partage'}</Text>
              </button>
              <button className="btn" type="button" onClick={() => void copy(share.url, 'url')}>
                <Text>{'Copier le lien de la récompense'}</Text>
              </button>
              <Link href={new URL(share.url).pathname}>
                <Text>{'Voir la récompense'}</Text>
              </Link>
            </div>
            <img
              className={styles['shareImage']}
              src={share.image}
              alt={snippets.alt}
              width={1200}
              height={630}
              loading="lazy"
            />
            <a href={share.image} download={`sandbox-${badgeType}-${period ?? week ?? ''}.png`}>
              <Text>{"Télécharger l'image de partage"}</Text>
            </a>
          </details>
        ) : null}
        <p className={styles['copyStatus']} role="status" aria-live="polite">
          <Text>{message}</Text>
        </p>
      </div>
    </details>
  );
}
