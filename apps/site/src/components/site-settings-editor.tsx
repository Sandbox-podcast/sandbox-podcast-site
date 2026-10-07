'use client';

import { useEffect, useState } from 'react';
import { siteSettingsSchema, type SiteSettings } from '@/domain/schema';

type SocialKey = keyof SiteSettings['team'][number]['socials'];
type PlatformKey = keyof SiteSettings['platforms'];

const socialFields: { key: SocialKey; label: string; placeholder: string }[] = [
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/…' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/…' },
  { key: 'x', label: 'X', placeholder: 'https://x.com/…' },
];

const platformFields: { key: PlatformKey; label: string }[] = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'spotify', label: 'Spotify' },
  { key: 'apple', label: 'Apple Podcasts' },
];

interface Props {
  initial: SiteSettings;
  pending: boolean;
  onSave: (site: SiteSettings, action: 'draft' | 'publish') => Promise<void>;
}

export function SiteSettingsEditor({ initial, pending, onSave }: Props) {
  const [site, setSite] = useState(initial);
  const [error, setError] = useState('');

  useEffect(() => {
    setSite(initial);
    setError('');
  }, [initial]);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]): void {
    setSite((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function updatePlatform(key: PlatformKey, value: string): void {
    setSite((current) => ({
      ...current,
      platforms: { ...current.platforms, [key]: value },
    }));
    setError('');
  }

  function updateMember(index: number, name: string): void {
    setSite((current) => ({
      ...current,
      team: current.team.map((member, i) => (i === index ? { ...member, name } : member)),
    }));
    setError('');
  }

  function updateSocial(index: number, key: SocialKey, value: string): void {
    setSite((current) => ({
      ...current,
      team: current.team.map((member, i) => {
        if (i !== index) return member;
        const socials = { ...member.socials };
        const trimmed = value.trim();
        socials[key] = trimmed || undefined;
        return { ...member, socials };
      }),
    }));
    setError('');
  }

  async function save(action: 'draft' | 'publish'): Promise<void> {
    const parsed = siteSettingsSchema.safeParse(site);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue ? `${issue.path.join('.')} : ${issue.message}` : 'Vérifiez les champs.');
      return;
    }
    setError('');
    await onSave(parsed.data, action);
  }

  return (
    <div className="admin-editor admin-editor-single site-settings-editor">
      <section className="admin-form-section" aria-labelledby="site-brand-title">
        <h3 id="site-brand-title">Identité</h3>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Nom du site</span>
            <input
              value={site.name}
              onChange={(event) => {
                update('name', event.target.value);
              }}
            />
          </label>
          <label className="admin-field">
            <span>Accroche</span>
            <input
              value={site.tagline}
              onChange={(event) => {
                update('tagline', event.target.value);
              }}
            />
          </label>
          <label className="admin-field">
            <span>Premier mot du logotype</span>
            <input
              value={site.wordmark[0]}
              onChange={(event) => {
                update('wordmark', [event.target.value, site.wordmark[1]]);
              }}
            />
          </label>
          <label className="admin-field">
            <span>Second mot du logotype</span>
            <input
              value={site.wordmark[1]}
              onChange={(event) => {
                update('wordmark', [site.wordmark[0], event.target.value]);
              }}
            />
          </label>
          <label className="admin-field admin-span-2">
            <span>Présentation courte</span>
            <textarea
              rows={2}
              value={site.strapline}
              onChange={(event) => {
                update('strapline', event.target.value);
              }}
            />
          </label>
        </div>
      </section>

      <section className="admin-form-section" aria-labelledby="site-seo-title">
        <h3 id="site-seo-title">Référencement</h3>
        <label className="admin-field">
          <span>Métadescription de l’accueil</span>
          <textarea
            rows={3}
            value={site.description}
            onChange={(event) => {
              update('description', event.target.value);
            }}
          />
          <small>
            {String(site.description.length)} caractères · utilisée aussi dans les partages et le
            flux RSS.
          </small>
        </label>
        <div className="admin-seo-preview" aria-label="Aperçu du résultat de recherche">
          <span>Sandbox · Podcasts</span>
          <strong>{site.name} — Podcasts vidéo et classements tech</strong>
          <p>{site.description}</p>
        </div>
      </section>

      <section className="admin-form-section" aria-labelledby="site-home-title">
        <h3 id="site-home-title">Textes de marque</h3>
        <div className="admin-form-grid">
          <label className="admin-field admin-span-2">
            <span>Sur-titre</span>
            <input
              value={site.heroEyebrow}
              onChange={(event) => {
                update('heroEyebrow', event.target.value);
              }}
            />
          </label>
          <label className="admin-field admin-span-2">
            <span>Titre</span>
            <input
              value={site.heroTitle}
              onChange={(event) => {
                update('heroTitle', event.target.value);
              }}
            />
          </label>
          <label className="admin-field admin-span-2">
            <span>Présentation</span>
            <textarea
              rows={3}
              value={site.heroDek}
              onChange={(event) => {
                update('heroDek', event.target.value);
              }}
            />
          </label>
        </div>
        <p className="admin-help">
          L’épisode à la une utilise son propre titre et son résumé sur l’accueil.
        </p>
      </section>

      <section className="admin-form-section" aria-labelledby="site-platforms-title">
        <h3 id="site-platforms-title">Plateformes du podcast</h3>
        <div className="admin-form-grid">
          {platformFields.map(({ key, label }) => (
            <label className="admin-field admin-span-2" key={key}>
              <span>{label}</span>
              <input
                type="url"
                inputMode="url"
                value={site.platforms[key]}
                onChange={(event) => {
                  updatePlatform(key, event.target.value);
                }}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="admin-form-section" aria-labelledby="site-team-title">
        <div className="admin-section-heading">
          <h3 id="site-team-title">Cartes de l’équipe</h3>
          <button
            type="button"
            className="btn"
            onClick={() => {
              update('team', [...site.team, { name: '', socials: {} }]);
            }}
          >
            Ajouter une personne ＋
          </button>
        </div>
        <p className="admin-help">
          Ces noms et liens apparaissent sur la page À propos. Laissez une URL vide si le profil
          n’existe pas encore.
        </p>
        <div className="admin-team-list">
          {site.team.map((member, index) => (
            <div className="admin-team-card" key={index}>
              <div className="admin-team-card-head">
                <span className="label">Carte {String(index + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  onClick={() => {
                    update(
                      'team',
                      site.team.filter((_, i) => i !== index),
                    );
                  }}
                >
                  Retirer
                </button>
              </div>
              <label className="admin-field">
                <span>Prénom</span>
                <input
                  value={member.name}
                  onChange={(event) => {
                    updateMember(index, event.target.value);
                  }}
                />
              </label>
              {socialFields.map(({ key, label, placeholder }) => (
                <label className="admin-field" key={key}>
                  <span>{label}</span>
                  <input
                    type="url"
                    inputMode="url"
                    placeholder={placeholder}
                    value={member.socials[key] ?? ''}
                    onChange={(event) => {
                      updateSocial(index, key, event.target.value);
                    }}
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
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
          onClick={() => {
            setSite(initial);
          }}
          disabled={pending}
        >
          Annuler les changements
        </button>
        <button className="btn" type="button" onClick={() => void save('draft')} disabled={pending}>
          Enregistrer le brouillon
        </button>
        <button
          className="btn btn-solid"
          type="button"
          onClick={() => void save('publish')}
          disabled={pending}
        >
          Publier
        </button>
      </div>
    </div>
  );
}
