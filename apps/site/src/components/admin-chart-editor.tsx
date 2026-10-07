'use client';

import { useState } from 'react';
import {
  appendChartEntity,
  insertChartTake,
  nameFromProjectUrl,
  slugFromLabel,
} from '@/domain/admin-fast-entry';
import type { Entity, Host } from '@/domain/schema';

type QuickAction = 'take' | 'entity' | null;

interface Props {
  markdown: string;
  onChange: (value: string) => void;
  onSave: (action: 'draft' | 'publish', markdown: string) => Promise<boolean>;
  onReset: () => void;
  pending: boolean;
  error: string;
  week: string | null;
  entities: Entity[];
  rankedSlugs: string[];
  hosts: Host[];
  currentUsername?: string | undefined;
}

export function AdminChartEditor({
  markdown,
  onChange,
  onSave,
  onReset,
  pending,
  error,
  week,
  entities,
  rankedSlugs,
  hosts,
  currentUsername,
}: Props) {
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [quickError, setQuickError] = useState('');
  const [entitySlug, setEntitySlug] = useState(rankedSlugs[0] ?? '');
  const [hostSlug, setHostSlug] = useState(
    hosts.find((host) => host.slug === currentUsername && !host.placeholder)?.slug ??
      hosts.find((host) => !host.placeholder)?.slug ??
      '',
  );
  const [takeText, setTakeText] = useState('');
  const [entityName, setEntityName] = useState('');
  const [entityUrl, setEntityUrl] = useState('');
  const [entityCategory, setEntityCategory] = useState('');
  const [entityTagline, setEntityTagline] = useState('');
  const ranked = rankedSlugs
    .map((slug) => entities.find((entity) => entity.slug === slug))
    .filter((entity): entity is Entity => Boolean(entity));
  const availableHosts = hosts.filter((host) => !host.placeholder);

  async function addTake() {
    setQuickError('');
    try {
      if (!week) throw new Error('Aucune semaine publiée pour ce classement.');
      const updated = insertChartTake(markdown, {
        entity: entitySlug,
        week,
        host: hostSlug,
        text: takeText,
      });
      onChange(updated);
      const saved = await onSave('draft', updated);
      if (!saved) return;
      setTakeText('');
      setQuickAction(null);
    } catch (reason) {
      setQuickError(reason instanceof Error ? reason.message : 'Impossible d’ajouter cet avis.');
    }
  }

  async function addEntity() {
    setQuickError('');
    try {
      const slug = slugFromLabel(entityName);
      if (entities.some((entity) => entity.slug === slug)) {
        throw new Error('Cette fiche existe déjà dans le site. Ajoutez plutôt un avis.');
      }
      const created = appendChartEntity(markdown, {
        name: entityName,
        category: entityCategory,
        tagline: entityTagline,
        url: entityUrl,
      });
      onChange(created.markdown);
      const saved = await onSave('draft', created.markdown);
      if (!saved) return;
      setQuickAction(null);
      setEntityName('');
      setEntityUrl('');
      setEntityCategory('');
      setEntityTagline('');
    } catch (reason) {
      setQuickError(reason instanceof Error ? reason.message : 'Impossible d’ajouter cette fiche.');
    }
  }

  return (
    <div className="admin-editor admin-chart-editor">
      <div className="admin-chart-intro">
        <div>
          <h3>Que voulez-vous ajouter ?</h3>
          <p className="admin-help">
            Les actions rapides écrivent dans le Markdown et enregistrent un brouillon.
          </p>
        </div>
        <div className="admin-quick-actions">
          <button
            className={`btn${quickAction === 'take' ? ' btn-solid' : ''}`}
            type="button"
            onClick={() => {
              setQuickAction(quickAction === 'take' ? null : 'take');
              setQuickError('');
            }}
          >
            ＋ Un avis
          </button>
          <button
            className={`btn${quickAction === 'entity' ? ' btn-solid' : ''}`}
            type="button"
            onClick={() => {
              setQuickAction(quickAction === 'entity' ? null : 'entity');
              setQuickError('');
            }}
          >
            ＋ Une fiche
          </button>
        </div>
      </div>

      {quickAction === 'take' ? (
        <form
          className="admin-quick-form"
          onSubmit={(event) => {
            event.preventDefault();
            void addTake();
          }}
        >
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Projet ou modèle</span>
              <select
                value={entitySlug}
                onChange={(event) => {
                  setEntitySlug(event.target.value);
                }}
                required
              >
                {ranked.map((entity) => (
                  <option value={entity.slug} key={entity.slug}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Signé par</span>
              <select
                value={hostSlug}
                onChange={(event) => {
                  setHostSlug(event.target.value);
                }}
                required
              >
                {availableHosts.map((host) => (
                  <option value={host.slug} key={host.slug}>
                    {host.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field admin-span-2">
              <span>Votre avis sur la semaine {week ?? '—'}</span>
              <textarea
                rows={3}
                maxLength={320}
                value={takeText}
                onChange={(event) => {
                  setTakeText(event.target.value);
                }}
                required
                autoFocus
              />
              <small>{takeText.length}/320 caractères</small>
            </label>
          </div>
          <button
            className="btn btn-solid"
            type="submit"
            disabled={pending || !week || ranked.length === 0 || availableHosts.length === 0}
          >
            Ajouter au brouillon
          </button>
        </form>
      ) : null}

      {quickAction === 'entity' ? (
        <form
          className="admin-quick-form"
          onSubmit={(event) => {
            event.preventDefault();
            void addEntity();
          }}
        >
          <div className="admin-form-grid">
            <label className="admin-field admin-span-2">
              <span>Lien officiel du projet ou du modèle</span>
              <input
                type="url"
                inputMode="url"
                placeholder="https://github.com/…"
                value={entityUrl}
                onChange={(event) => {
                  setEntityUrl(event.target.value);
                }}
                onBlur={() => {
                  if (!entityName.trim()) setEntityName(nameFromProjectUrl(entityUrl) ?? '');
                }}
                required
                autoFocus
              />
            </label>
            <label className="admin-field">
              <span>Nom</span>
              <input
                value={entityName}
                onChange={(event) => {
                  setEntityName(event.target.value);
                }}
                required
              />
            </label>
            <label className="admin-field">
              <span>Catégorie</span>
              <input
                value={entityCategory}
                onChange={(event) => {
                  setEntityCategory(event.target.value);
                }}
                placeholder="Agent de code, modèle ouvert…"
                required
              />
            </label>
            <label className="admin-field admin-span-2">
              <span>En une phrase</span>
              <input
                maxLength={110}
                value={entityTagline}
                onChange={(event) => {
                  setEntityTagline(event.target.value);
                }}
                required
              />
              <small>
                L’identifiant, le lien et l’organisation sont créés automatiquement. Vous pourrez
                détailler la fiche dans le Markdown.
              </small>
            </label>
          </div>
          <button className="btn btn-solid" type="submit" disabled={pending}>
            Ajouter au brouillon
          </button>
          <p className="admin-help">
            La fiche apparaît sur le site une fois incluse dans un relevé hebdomadaire.
          </p>
        </form>
      ) : null}

      {quickError ? (
        <p className="admin-error" role="alert">
          {quickError}
        </p>
      ) : null}
      <details className="admin-disclosure admin-markdown-disclosure">
        <summary>
          Modifier le document Markdown complet <span>Présentation, méthode, fiches et avis</span>
        </summary>
        <label className="admin-field">
          <span>Markdown du classement</span>
          <textarea
            className="admin-json admin-chart-document"
            rows={30}
            value={markdown}
            onChange={(event) => {
              onChange(event.target.value);
            }}
            spellCheck
          />
        </label>
      </details>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="admin-save-row">
        <button className="btn" type="button" onClick={onReset} disabled={pending}>
          Annuler les changements
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => void onSave('draft', markdown)}
          disabled={pending}
        >
          Enregistrer le brouillon
        </button>
        <button
          className="btn btn-solid"
          type="button"
          onClick={() => void onSave('publish', markdown)}
          disabled={pending}
        >
          Publier
        </button>
      </div>
    </div>
  );
}
