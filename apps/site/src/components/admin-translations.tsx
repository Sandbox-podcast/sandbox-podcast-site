'use client';

import { useState, type ChangeEvent } from 'react';
import { z } from 'zod';
import { EUROPEAN_LOCALE_TARGETS, DEFAULT_SITE_LOCALE } from '@/i18n/locales';
import { translatedBundleSchema } from '@/domain/content-translation-schema';

// Les schémas client sont séparés des fonctions de hash Node utilisées par le harnais.
const importResultSchema = z.object({ locale: z.string(), imported: z.number().int() });
export function AdminTranslations({
  canImport,
  revision,
}: {
  canImport: boolean;
  revision: string;
}) {
  const [locale, setLocale] = useState('en');
  const [file, setFile] = useState<File>();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function importFile() {
    if (!file) return;
    setPending(true);
    setMessage('');
    try {
      if (file.size > 1_600_000) throw new Error('Fichier trop volumineux (limite : 1,5 Mo).');
      const bundle = translatedBundleSchema.parse(JSON.parse(await file.text()) as unknown);
      const response = await fetch('/api/admin/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle),
      });
      const value: unknown = await response.json();
      if (!response.ok) {
        const error = z.object({ error: z.string() }).safeParse(value);
        throw new Error(error.success ? error.data.error : 'Import impossible.');
      }
      const result = importResultSchema.parse(value);
      setMessage(
        `${String(result.imported)} traductions importées en ${result.locale}. Elles sont disponibles sur le site.`,
      );
      setFile(undefined);
    } catch (error) {
      setMessage(
        error instanceof z.ZodError
          ? 'Le fichier de traduction est incomplet ou invalide.'
          : error instanceof Error
            ? error.message
            : 'Import impossible.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="admin-translations" key={revision}>
      <summary>Traductions · génération dans le harnais</summary>
      <div className="admin-translations-body">
        <p>
          Exportez les textes publiés, traduisez les entrées manquantes dans le harnais, puis
          importez le JSON obtenu. Les brouillons d’épisodes restent hors de l’export.
        </p>
        <div className="admin-translations-actions">
          <label className="admin-field">
            <span>Langue à préparer</span>
            <select
              value={locale}
              onChange={(event) => {
                setLocale(event.target.value);
              }}
            >
              {EUROPEAN_LOCALE_TARGETS.filter((item) => item.locale !== DEFAULT_SITE_LOCALE).map(
                (item) => (
                  <option key={item.locale} value={item.locale}>
                    {item.name} · {item.locale}
                  </option>
                ),
              )}
            </select>
          </label>
          <a
            className="btn"
            href={`/api/admin/translations?locale=${encodeURIComponent(locale)}`}
            download="sandbox-translation-sources.json"
          >
            Télécharger les textes
          </a>
          <button
            className="btn"
            type="button"
            onClick={() => {
              void navigator.clipboard
                .writeText(
                  `Applique le workflow docs/site/prompt-traductions-harnais.md pour traduire les textes SANDBOX en ${locale}. Utilise l’export JSON joint comme source publiée, complète les entrées manquantes dans les fichiers locaux et produis le JSON à importer dans l’admin. Vérifie les sources, liens, nombres et paramètres ; conserve les médias et les données de classement.`,
                )
                .then(() => {
                  setMessage('Prompt copié. Joignez l’export JSON dans le harnais.');
                })
                .catch(() => {
                  setMessage(
                    'Copie indisponible. Le prompt est dans docs/site/prompt-traductions-harnais.md.',
                  );
                });
            }}
          >
            Copier le prompt
          </button>
        </div>
        {canImport ? (
          <div className="admin-translations-actions">
            <label className="admin-field">
              <span>Fichier traduit (.json)</span>
              <input
                type="file"
                accept="application/json,.json"
                disabled={pending}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setFile(event.target.files?.[0]);
                  setMessage('');
                }}
              />
            </label>
            <button
              className="btn btn-solid"
              type="button"
              disabled={!file || pending}
              onClick={() => {
                void importFile();
              }}
            >
              {pending ? 'Vérification…' : 'Importer les traductions'}
            </button>
          </div>
        ) : (
          <p className="admin-help">L’import est réservé aux administrateurs.</p>
        )}
        <p className="admin-help">
          Les textes source, les liens et les nombres sont vérifiés avant l’import. Les traductions
          restent hors de l’indexation jusqu’à leur revue éditoriale.
        </p>
        {message ? (
          <p role="status" className="admin-note">
            {message}
          </p>
        ) : null}
      </div>
    </details>
  );
}
