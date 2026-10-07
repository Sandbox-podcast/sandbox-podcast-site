'use client';

import { useState } from 'react';
import { ZodError } from 'zod';
import { slugFromLabel, sourceFromFields, topicFromFields } from '@/domain/admin-fast-entry';
import type { Source, Topic } from '@/domain/schema';

type Action = 'draft' | 'publish';

function validationMessage(error: unknown): string {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const field = issue?.path[0];
    if (field === 'url') return 'Saisissez une adresse complète commençant par https://.';
    if (field === 'slug' || field === 'id')
      return 'Le nom doit contenir au moins une lettre ou un chiffre.';
    if (field === 'label' || field === 'description' || field === 'provides')
      return 'Renseignez tous les champs visibles.';
    return 'Vérifiez les champs du formulaire.';
  }
  return error instanceof Error ? error.message : 'Vérifiez les champs.';
}

interface TopicProps {
  item?: Topic | undefined;
  existingIds: string[];
  pending: boolean;
  onSave: (item: Topic, action: Action) => Promise<boolean>;
}

export function TopicEditor({ item, existingIds, pending, onSave }: TopicProps) {
  const [label, setLabel] = useState(item?.label ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [error, setError] = useState('');
  const id = item?.slug ?? slugFromLabel(label);

  async function submit(action: Action) {
    setError('');
    try {
      const candidate = topicFromFields({ label, description }, item);
      if (!item && existingIds.includes(candidate.slug)) {
        throw new Error('Un thème porte déjà ce nom. Choisissez un nom différent.');
      }
      await onSave(candidate, action);
    } catch (reason) {
      setError(validationMessage(reason));
    }
  }

  return (
    <form
      className="admin-editor admin-simple-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit('draft');
      }}
    >
      <div>
        <span className="eyebrow">Thème éditorial</span>
        <h3>{item ? 'Modifier le thème' : 'Nouveau thème'}</h3>
        <p className="admin-help">Il pourra ensuite être choisi dans les épisodes.</p>
      </div>
      <label className="admin-field">
        <span>Nom du thème</span>
        <input
          value={label}
          onChange={(event) => {
            setLabel(event.target.value);
          }}
          required
          autoFocus={!item}
        />
      </label>
      <label className="admin-field">
        <span>Description</span>
        <textarea
          rows={3}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
          required
        />
      </label>
      <p className="admin-generated-id">
        Identifiant créé automatiquement : <code>{id || '…'}</code>
      </p>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="admin-save-row">
        <button className="btn" type="submit" disabled={pending}>
          Enregistrer le brouillon
        </button>
        <button
          className="btn btn-solid"
          type="button"
          onClick={() => void submit('publish')}
          disabled={pending}
        >
          Publier
        </button>
      </div>
    </form>
  );
}

interface SourceProps {
  item?: Source | undefined;
  existingIds: string[];
  pending: boolean;
  onSave: (item: Source, action: Action) => Promise<boolean>;
}

const sourceKinds: { value: Source['kind']; label: string }[] = [
  { value: 'editorial', label: 'Source éditoriale' },
  { value: 'api', label: 'API' },
  { value: 'leaderboard', label: 'Classement externe' },
  { value: 'vendor', label: 'Éditeur' },
  { value: 'derived', label: 'Calcul interne' },
];

const sourceStatuses: { value: Source['status']; label: string }[] = [
  { value: 'manual', label: 'Saisie manuelle' },
  { value: 'planned', label: 'Connexion prévue' },
  { value: 'connected', label: 'Connectée' },
];

export function SourceEditor({ item, existingIds, pending, onSave }: SourceProps) {
  const [label, setLabel] = useState(item?.label ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [provides, setProvides] = useState(item?.provides ?? '');
  const [kind, setKind] = useState<Source['kind']>(item?.kind ?? 'editorial');
  const [status, setStatus] = useState<Source['status']>(item?.status ?? 'manual');
  const [error, setError] = useState('');
  const id = item?.id ?? slugFromLabel(label);

  async function submit(action: Action) {
    setError('');
    try {
      const candidate = sourceFromFields({ label, url, provides, kind, status }, item);
      if (!item && existingIds.includes(candidate.id)) {
        throw new Error('Une source porte déjà ce nom. Choisissez un nom différent.');
      }
      await onSave(candidate, action);
    } catch (reason) {
      setError(validationMessage(reason));
    }
  }

  return (
    <form
      className="admin-editor admin-simple-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit('draft');
      }}
    >
      <div>
        <span className="eyebrow">Source d’un classement</span>
        <h3>{item ? 'Modifier la source' : 'Nouvelle source'}</h3>
        <p className="admin-help">Décrivez l’origine des données utilisées dans les classements.</p>
      </div>
      <label className="admin-field">
        <span>Nom de la source</span>
        <input
          value={label}
          onChange={(event) => {
            setLabel(event.target.value);
          }}
          required
          autoFocus={!item}
        />
      </label>
      <label className="admin-field">
        <span>Adresse du site ou de la documentation</span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
          }}
          required
        />
      </label>
      <label className="admin-field">
        <span>Ce que fournit cette source</span>
        <textarea
          rows={3}
          value={provides}
          onChange={(event) => {
            setProvides(event.target.value);
          }}
          required
        />
      </label>
      <details className="admin-disclosure">
        <summary>
          Type et connexion{' '}
          <span>
            {sourceKinds.find((entry) => entry.value === kind)?.label} ·{' '}
            {sourceStatuses.find((entry) => entry.value === status)?.label}
          </span>
        </summary>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Type</span>
            <select
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as Source['kind']);
              }}
            >
              {sourceKinds.map(({ value, label: optionLabel }) => (
                <option value={value} key={value}>
                  {optionLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>État de connexion</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as Source['status']);
              }}
            >
              {sourceStatuses.map(({ value, label: optionLabel }) => (
                <option value={value} key={value}>
                  {optionLabel}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
      <p className="admin-generated-id">
        Identifiant créé automatiquement : <code>{id || '…'}</code>
      </p>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="admin-save-row">
        <button className="btn" type="submit" disabled={pending}>
          Enregistrer le brouillon
        </button>
        <button
          className="btn btn-solid"
          type="button"
          onClick={() => void submit('publish')}
          disabled={pending}
        >
          Publier
        </button>
      </div>
    </form>
  );
}
