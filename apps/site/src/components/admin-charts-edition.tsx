'use client';

import { useState } from 'react';
import { z } from 'zod';
import {
  chartsAdminResponseSchema,
  chartsAdminWriteSchema,
  type ChartsAdminResponse,
} from '@/domain/charts-admin';
import { chartEditionSchema, type ChartEdition } from '@/domain/schema';
import { formatCompact } from '@/domain/format';

type Edition = NonNullable<ChartsAdminResponse['edition']>;
type Insight = ChartEdition['insights'][number];
const fields: {
  key: 'whatItIs' | 'whyTrending' | 'whyMatters' | 'sandboxTake';
  label: string;
  help: string;
}[] = [
  { key: 'whatItIs', label: 'WHAT IT IS', help: 'Ce que fait le projet, en une ou deux phrases.' },
  {
    key: 'whyTrending',
    label: 'WHY IT’S TRENDING',
    help: 'Le fait observé qui explique le mouvement.',
  },
  { key: 'whyMatters', label: 'WHY IT MATTERS', help: 'Ce que cela change pour les utilisateurs.' },
  {
    key: 'sandboxTake',
    label: 'SANDBOX TAKE',
    help: 'Votre lecture personnelle, publiée avec votre signature.',
  },
];
export function AdminChartsEdition({
  edition,
  repositories,
  author,
  pending,
  permissions,
  onSave,
}: {
  edition: Edition;
  repositories: ChartsAdminResponse['repositories'];
  author: string;
  pending: boolean;
  permissions: { draft: boolean; publish: boolean };
  onSave: (command: z.infer<typeof chartsAdminWriteSchema>) => Promise<boolean>;
}) {
  const [notes, setNotes] = useState(edition.editorial);
  const [entity, setEntity] = useState(edition.entries[0]?.entity ?? '');
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [watchSearch, setWatchSearch] = useState('');
  const [watchLoading, setWatchLoading] = useState(false);
  const [extraRepositories, setExtraRepositories] = useState<ChartsAdminResponse['repositories']>(
    [],
  );
  const selected = edition.entries.find((entry) => entry.entity === entity);
  const insight = notes.insights.find((item) => item.entity === entity) ?? {
    entity,
    whatItIs: '',
    whyTrending: '',
    whyMatters: '',
    sandboxTake: '',
    author,
    bestFor: [],
  };
  const canEdit = permissions.draft && !pending;
  function updateInsight(patch: Partial<Insight>) {
    const next = {
      ...insight,
      ...patch,
      author: patch.sandboxTake !== undefined ? author : insight.author,
    };
    setNotes({
      ...notes,
      insights: [...notes.insights.filter((item) => item.entity !== entity), next],
    });
  }
  async function save(layer: 'draft' | 'published') {
    const parsed = chartEditionSchema.safeParse(notes);
    if (!parsed.success) {
      setError(
        'Vérifiez les textes et la watchlist : cinq projets au maximum, avec une raison pour chacun.',
      );
      return;
    }
    setError('');
    await onSave({
      action: 'editorial',
      editionId: edition.id,
      edition: parsed.data,
      layer,
      expectedEtag: edition.etag,
    });
  }
  const watchOptions = [
    ...new Map(
      [
        ...edition.entries.map((entry) => ({ slug: entry.entity, name: entry.name })),
        ...[...repositories, ...extraRepositories].map((repo) => ({
          slug: repo.slug,
          name: repo.name,
        })),
        ...notes.watchlist.map((item) => ({
          slug: item.entity,
          name: repositories.find((repo) => repo.slug === item.entity)?.name ?? item.entity,
        })),
      ].map((item) => [item.slug, item]),
    ).values(),
  ];
  return (
    <div className="ac-weekly">
      <div className="ac-week-heading">
        <span className="ac-state">
          {edition.published ? 'Édition publiée' : 'Édition figée · brouillon'}
        </span>
        <strong>
          {edition.chart === 'github' ? 'GITHUB TOP 20' : 'RISING 20'} · {edition.week}
        </strong>
        <button
          type="button"
          className="btn"
          aria-pressed={preview}
          onClick={() => {
            setPreview(!preview);
          }}
        >
          {preview ? 'Revenir à l’édition' : 'Aperçu des commentaires'}
        </button>
      </div>
      <p className="admin-help">
        Les positions, scores et relevés de cette édition sont figés. Les commentaires se publient
        séparément.
      </p>
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Accroche de la semaine</span>
          <input
            maxLength={160}
            value={notes.headline}
            disabled={!canEdit}
            onChange={(event) => {
              setNotes({ ...notes, headline: event.target.value });
            }}
            placeholder="Le fait marquant de cette semaine"
          />
        </label>
        <label className="admin-field">
          <span>Accroche de l’édition mensuelle</span>
          <input
            maxLength={160}
            value={notes.monthlyHeadline}
            disabled={!canEdit}
            onChange={(event) => {
              setNotes({ ...notes, monthlyHeadline: event.target.value });
            }}
          />
        </label>
      </div>
      <div className="ac-week-editor">
        <nav className="ac-ranked-list" aria-label="Entrées de l’édition">
          {edition.entries.map((entry) => (
            <button
              type="button"
              key={entry.entity}
              aria-pressed={entity === entry.entity}
              onClick={() => {
                setEntity(entry.entity);
              }}
            >
              <b>{String(entry.rank).padStart(2, '0')}</b>
              <span>
                {entry.name}
                <small>
                  {entry.score.toFixed(1)} / 100 ·{' '}
                  {entry.metrics['stars7d'] === undefined
                    ? 'relevé indisponible'
                    : `${entry.metrics['stars7d'] >= 0 ? '+' : ''}${formatCompact(entry.metrics['stars7d'])} stars`}
                </small>
              </span>
              <em>
                {notes.insights.some((item) => item.entity === entry.entity && item.sandboxTake)
                  ? 'Avis rédigé'
                  : 'À commenter'}
              </em>
            </button>
          ))}
        </nav>
        {selected ? (
          <div className="ac-note-editor">
            <div className="ac-note-title">
              <h3>{selected.name}</h3>
              <span className="ac-state">
                #{selected.rank} · {selected.category}
              </span>
            </div>
            <p className="admin-help">{selected.description}</p>
            {preview ? (
              <div className="ac-preview">
                {fields.map((field) => (
                  <section key={field.key}>
                    <span className="eyebrow">{field.label}</span>
                    <p>{insight[field.key] || 'Aucun commentaire pour ce champ.'}</p>
                  </section>
                ))}
                {insight.bestFor.length ? <p>BEST FOR · {insight.bestFor.join(' · ')}</p> : null}
                {insight.sandboxTake ? (
                  <p className="admin-help">Signé {insight.author || author}</p>
                ) : null}
              </div>
            ) : (
              <>
                {fields.map((field) => (
                  <label className="admin-field" key={field.key}>
                    <span>{field.label}</span>
                    <textarea
                      rows={3}
                      maxLength={320}
                      value={insight[field.key]}
                      disabled={!canEdit}
                      placeholder={field.help}
                      onChange={(event) => {
                        updateInsight({ [field.key]: event.target.value });
                      }}
                    />
                    <small className="admin-help">{insight[field.key].length} / 320</small>
                  </label>
                ))}
                <label className="admin-field">
                  <span>BEST FOR (cinq usages séparés par une virgule)</span>
                  <input
                    value={insight.bestFor.join(', ')}
                    disabled={!canEdit}
                    onChange={(event) => {
                      updateInsight({
                        bestFor: event.target.value
                          .split(',')
                          .map((item) => item.trim())
                          .filter(Boolean),
                      });
                    }}
                  />
                </label>
                <p className="admin-help">
                  Votre SANDBOX TAKE sera signé {insight.author || author}.
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>
      <section className="ac-watch-editor">
        <h3>WATCHLIST · jusqu’à cinq projets</h3>
        <p className="admin-help">
          Choisissez un projet du catalogue et écrivez pourquoi vous le surveillez.
        </p>
        <div className="ac-search">
          <label className="admin-field">
            <span>Rechercher dans tout le catalogue</span>
            <input
              value={watchSearch}
              disabled={!canEdit || watchLoading}
              onChange={(event) => {
                setWatchSearch(event.target.value);
              }}
              placeholder="Nom du dépôt à surveiller"
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={!canEdit || watchLoading || !watchSearch.trim()}
            onClick={() => {
              setWatchLoading(true);
              setError('');
              void fetch(`/api/admin/charts?q=${encodeURIComponent(watchSearch.trim())}`, {
                cache: 'no-store',
              })
                .then(async (response) => {
                  if (!response.ok) throw new Error('Recherche indisponible.');
                  const value: unknown = await response.json();
                  const result = chartsAdminResponseSchema.parse(value);
                  setExtraRepositories(result.repositories);
                  if (!result.repositories.length) setError('Aucun dépôt pour cette recherche.');
                })
                .catch((cause: unknown) => {
                  setError(cause instanceof Error ? cause.message : 'Recherche indisponible.');
                })
                .finally(() => {
                  setWatchLoading(false);
                });
            }}
          >
            {watchLoading ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>
        {notes.watchlist.map((item, index) => (
          <div key={index} className="ac-watch-item">
            <label className="admin-field">
              <span>Projet {index + 1}</span>
              <select
                value={item.entity}
                disabled={!canEdit}
                onChange={(event) => {
                  setNotes({
                    ...notes,
                    watchlist: notes.watchlist.map((entry, at) =>
                      at === index ? { ...entry, entity: event.target.value } : entry,
                    ),
                  });
                }}
              >
                {watchOptions.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Pourquoi le suivre</span>
              <textarea
                maxLength={320}
                rows={2}
                value={item.reason}
                disabled={!canEdit}
                onChange={(event) => {
                  setNotes({
                    ...notes,
                    watchlist: notes.watchlist.map((entry, at) =>
                      at === index ? { ...entry, reason: event.target.value } : entry,
                    ),
                  });
                }}
              />
            </label>
            <button
              type="button"
              className="btn"
              disabled={!canEdit}
              onClick={() => {
                setNotes({ ...notes, watchlist: notes.watchlist.filter((_, at) => at !== index) });
              }}
            >
              Retirer
            </button>
          </div>
        ))}
        <button
          className="btn"
          type="button"
          disabled={
            !canEdit ||
            notes.watchlist.length >= 5 ||
            !watchOptions.some(
              (option) => !notes.watchlist.some((item) => item.entity === option.slug),
            )
          }
          onClick={() => {
            const next = watchOptions.find(
              (option) => !notes.watchlist.some((item) => item.entity === option.slug),
            );
            if (next)
              setNotes({
                ...notes,
                watchlist: [...notes.watchlist, { entity: next.slug, reason: '' }],
              });
          }}
        >
          Ajouter un projet
        </button>
      </section>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="admin-save-row">
        <button
          className="btn"
          type="button"
          disabled={!canEdit}
          onClick={() => void save('draft')}
        >
          Enregistrer le brouillon
        </button>
        <button
          className="btn btn-solid"
          type="button"
          disabled={pending || !permissions.publish}
          onClick={() => void save('published')}
        >
          Publier les commentaires
        </button>
        {!edition.published ? (
          <button
            className="btn"
            type="button"
            disabled={pending || !permissions.publish}
            onClick={() => void onSave({ action: 'publish', week: edition.week })}
          >
            Publier les classements de {edition.week}
          </button>
        ) : (
          <a
            className="btn"
            href={`/charts/${edition.chart}/${edition.week}`}
            target="_blank"
            rel="noreferrer"
          >
            Voir l’édition ↗
          </a>
        )}
      </div>
    </div>
  );
}
