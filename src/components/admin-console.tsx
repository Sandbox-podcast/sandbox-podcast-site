'use client';

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import type { EditableContent } from '@/domain/admin-content';
import { storySchema, type Episode, type Host, type Story, type StoryType } from '@/domain/schema';
import { EpisodeComposer } from './episode-composer';

type CollectionKey = Exclude<keyof EditableContent, 'site'>;
type SectionKey = keyof EditableContent;
type CollectionItem = Record<string, unknown>;
type HostSocialKey = keyof Host['socials'];
interface AdminStatus {
  authenticated: boolean;
  authConfigured: boolean;
  storageMode: 'local' | 'postgres' | 'unavailable';
}
interface ContentResponse {
  content: EditableContent;
  draftEtag: string | null;
  hasDraft: boolean;
  storageMode: 'local' | 'postgres' | 'unavailable';
}

const collections: { key: CollectionKey; label: string; title: string }[] = [
  { key: 'episodes', label: 'Épisodes', title: 'Épisodes' },
  { key: 'charts', label: 'Classements', title: 'Classements' },
  { key: 'entities', label: 'Projets et modèles', title: 'Projets, modèles et outils' },
  { key: 'takes', label: 'Avis', title: 'Avis de l’équipe' },
  { key: 'hosts', label: 'Équipe', title: 'Équipe' },
  { key: 'topics', label: 'Thèmes', title: 'Thèmes' },
  { key: 'sources', label: 'Sources', title: 'Sources' },
  { key: 'scoring', label: 'Méthodes', title: 'Profils de scoring' },
];

const storyTypes: { value: StoryType; label: string }[] = [
  { value: 'news', label: 'News' },
  { value: 'analysis', label: 'Analyse' },
  { value: 'experiment', label: 'Expérience' },
  { value: 'benchmark', label: 'Benchmark' },
  { value: 'guide', label: 'Guide' },
  { value: 'opinion', label: 'Opinion' },
  { value: 'recap', label: 'Récapitulatif' },
];

const hostSocialFields: { key: HostSocialKey; label: string; placeholder: string }[] = [
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://www.linkedin.com/in/…' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/…' },
  { key: 'x', label: 'X', placeholder: 'https://x.com/…' },
];

const starterBody = JSON.stringify(
  [
    { type: 'p', text: 'Écrivez votre introduction ici.' },
    { type: 'h2', text: 'Ce qu’il faut retenir' },
    { type: 'p', text: 'Ajoutez votre premier paragraphe.' },
  ],
  null,
  2,
);

function itemIdentity(key: CollectionKey, item: CollectionItem): string {
  const field =
    key === 'sources' || key === 'scoring'
      ? 'id'
      : key === 'episodes'
        ? 'number'
        : key === 'takes'
          ? 'id'
          : 'slug';
  const value = item[field];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  return '';
}

function itemTitle(key: CollectionKey, item: CollectionItem): string {
  const field =
    key === 'sources' ? 'label' : key === 'scoring' ? 'id' : key === 'takes' ? 'entity' : 'title';
  const value = item[field];
  if (typeof value === 'string' && value.length > 0) return value;
  if (key === 'entities' && typeof item['name'] === 'string') return item['name'];
  if (key === 'topics' && typeof item['label'] === 'string') return item['label'];
  if (key === 'hosts' && typeof item['name'] === 'string') return item['name'];
  const episodeNumber = item['number'];
  if (key === 'episodes' && typeof episodeNumber === 'number') {
    return `Épisode ${episodeNumber.toString()}`;
  }
  return itemIdentity(key, item) || 'Élément sans titre';
}

function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function errorMessage(value: unknown, fallback: string): string {
  return value instanceof Error ? value.message : fallback;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
  });
  const value: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof value === 'object' &&
      value !== null &&
      'error' in value &&
      typeof value.error === 'string'
        ? value.error
        : `La requête a échoué (${response.status.toString()}).`;
    throw new Error(message);
  }
  return value as T;
}

export function AdminConsole() {
  const [status, setStatus] = useState<AdminStatus>();
  const [contentResponse, setContentResponse] = useState<ContentResponse>();
  const [activeCollection, setActiveCollection] = useState<SectionKey>('episodes');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [rawValue, setRawValue] = useState('[]');
  const [rawError, setRawError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState('');
  const [storyForm, setStoryForm] = useState<Story | undefined>();
  const [storyOriginalSlug, setStoryOriginalSlug] = useState<string | undefined>();
  const [bodyText, setBodyText] = useState(starterBody);
  const [relatedText, setRelatedText] = useState('[]');
  const [sourcesText, setSourcesText] = useState('[]');
  const [articleError, setArticleError] = useState('');

  const collectionDefinition =
    activeCollection === 'site'
      ? undefined
      : collections.find((item) => item.key === activeCollection);
  const activeItems =
    activeCollection === 'site'
      ? []
      : ((contentResponse?.content[activeCollection] ?? []) as CollectionItem[]);

  const load = useCallback(async () => {
    const nextStatus = await apiJson<AdminStatus>('/api/admin/session');
    setStatus(nextStatus);
    if (nextStatus.authenticated) {
      const nextContent = await apiJson<ContentResponse>('/api/admin/content');
      setContentResponse(nextContent);
    }
  }, []);

  useEffect(() => {
    void load().catch((error: unknown) => {
      setMessage(errorMessage(error, 'Connexion au backoffice impossible.'));
    });
  }, [load]);

  useEffect(() => {
    if (!contentResponse) return;
    if (activeCollection === 'stories') {
      const selected = contentResponse.content.stories.find((story) => story.slug === selectedItem);
      if (selected) {
        setStoryForm(selected);
        setStoryOriginalSlug(selected.slug);
        setBodyText(JSON.stringify(selected.body, null, 2));
        setRelatedText(JSON.stringify(selected.related, null, 2));
        setSourcesText(JSON.stringify(selected.sources, null, 2));
      } else {
        setStoryForm(undefined);
        setStoryOriginalSlug(undefined);
      }
      return;
    }
    setRawValue(JSON.stringify(contentResponse.content[activeCollection], null, 2));
    setRawError('');
  }, [activeCollection, contentResponse, selectedItem]);

  const counts = useMemo(() => {
    if (!contentResponse) return {};
    return Object.fromEntries(
      collections.map(({ key }) => [key, contentResponse.content[key].length]),
    );
  }, [contentResponse]);

  async function refresh(): Promise<void> {
    await load();
    setMessage('Contenu rechargé depuis la dernière version du brouillon.');
  }

  async function submitLogin(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setMessage('');
    try {
      await apiJson('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword('');
      await load();
      setMessage('Session ouverte.');
    } catch (error) {
      setMessage(errorMessage(error, 'Connexion impossible.'));
    } finally {
      setPending(false);
    }
  }

  async function save(action: 'draft' | 'publish', nextContent: EditableContent): Promise<boolean> {
    if (!contentResponse) return false;
    setPending(true);
    setMessage('');
    try {
      const result = await apiJson<{ draftEtag: string | null; published: boolean }>(
        '/api/admin/content',
        {
          method: 'POST',
          body: JSON.stringify({
            action,
            content: nextContent,
            expectedDraftEtag: contentResponse.draftEtag,
          }),
        },
      );
      setContentResponse({
        ...contentResponse,
        content: nextContent,
        draftEtag: result.draftEtag,
        hasDraft: !result.published,
      });
      setMessage(
        result.published ? 'Modifications publiées sur le site.' : 'Brouillon enregistré.',
      );
      return true;
    } catch (error) {
      setMessage(errorMessage(error, 'Enregistrement impossible.'));
      if (error instanceof Error && error.message.includes('a changé')) {
        await load().catch(() => undefined);
      }
      return false;
    } finally {
      setPending(false);
    }
  }

  async function saveRawCollection(action: 'draft' | 'publish'): Promise<void> {
    if (!contentResponse) return;
    try {
      const parsed: unknown = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) throw new Error('La collection doit être un tableau JSON.');
      const nextContent = {
        ...contentResponse.content,
        [activeCollection]: parsed,
      };
      await save(action, nextContent);
    } catch (error) {
      setRawError(errorMessage(error, 'JSON invalide.'));
    }
  }

  function updateHostSocial(hostSlug: string, platform: HostSocialKey, value: string): void {
    setRawError('');
    setContentResponse((current) => {
      if (!current) return current;
      return {
        ...current,
        content: {
          ...current.content,
          hosts: current.content.hosts.map((host) => {
            if (host.slug !== hostSlug) return host;
            const socials = { ...host.socials };
            const url = value.trim();
            socials[platform] = url || undefined;
            return { ...host, socials };
          }),
        },
      };
    });
  }

  async function saveHostLinks(action: 'draft' | 'publish'): Promise<void> {
    if (!contentResponse) return;
    setRawError('');
    await save(action, contentResponse.content);
  }

  async function saveEpisode(episode: Episode, action: 'draft' | 'publish'): Promise<void> {
    if (!contentResponse) return;
    const remaining = contentResponse.content.episodes
      .filter((item) => item.number !== episode.number)
      .map((item) => (episode.featured ? { ...item, featured: false } : item));
    const episodes = [episode, ...remaining].sort((a, b) => b.number - a.number);
    await save(action, { ...contentResponse.content, episodes });
  }

  async function saveArticle(action: 'draft' | 'publish'): Promise<void> {
    if (!contentResponse || !storyForm) return;
    setArticleError('');
    try {
      const candidate = storySchema.parse({
        ...storyForm,
        id: storyForm.id ?? storyOriginalSlug ?? storyForm.slug,
        body: JSON.parse(bodyText) as unknown,
        related: JSON.parse(relatedText) as unknown,
        sources: JSON.parse(sourcesText) as unknown,
      });
      const remaining = contentResponse.content.stories.filter(
        (story) => story.slug !== storyOriginalSlug,
      );
      const stories = [candidate, ...remaining].sort((a, b) =>
        b.publishedAt.localeCompare(a.publishedAt),
      );
      const nextContent = { ...contentResponse.content, stories };
      const saved = await save(action, nextContent);
      if (!saved) return;
      setSelectedItem(candidate.slug);
      setStoryOriginalSlug(candidate.slug);
      setStoryForm(candidate);
    } catch (error) {
      setArticleError(errorMessage(error, 'Vérifiez le contenu de l’article.'));
    }
  }

  function beginNewArticle(): void {
    if (!contentResponse) return;
    const now = new Date().toISOString();
    const firstHost = contentResponse.content.hosts[0]?.slug ?? '';
    const article: Story = {
      slug: `nouvel-article-${new Date().toISOString().slice(0, 10)}`,
      type: 'analysis',
      title: '',
      dek: '',
      publishedAt: now,
      author: firstHost,
      topics: [],
      featured: false,
      related: [],
      body: [{ type: 'p', text: 'Écrivez votre introduction ici.' }],
      sources: [],
    };
    setSelectedItem('');
    setStoryOriginalSlug(undefined);
    setStoryForm(article);
    setBodyText(starterBody);
    setRelatedText('[]');
    setSourcesText('[]');
    setArticleError('');
  }

  async function logout(): Promise<void> {
    setPending(true);
    try {
      await apiJson('/api/admin/logout', { method: 'POST', body: '{}' });
      setContentResponse(undefined);
      await load();
      setMessage('Session fermée.');
    } catch (error) {
      setMessage(errorMessage(error, 'Déconnexion impossible.'));
    } finally {
      setPending(false);
    }
  }

  if (!status) {
    return (
      <div className="admin-shell">
        <p role="status" className="admin-note">
          Connexion au backoffice…
        </p>
      </div>
    );
  }

  if (!status.authenticated) {
    return (
      <div className="admin-shell">
        <section className="admin-login panel" aria-labelledby="admin-login-title">
          <span className="eyebrow">Espace privé · Sandbox</span>
          <h1 id="admin-login-title" className="admin-title">
            Backoffice podcasts
          </h1>
          <p className="admin-copy">
            Gérez les épisodes, leurs ressources et les classements du site.
          </p>
          {!status.authConfigured ? (
            <div className="admin-alert" role="status">
              La connexion sera disponible après configuration de <code>SITE_ADMIN_PASSWORD</code>{' '}
              et <code>SITE_ADMIN_SECRET</code> dans l’environnement du site.
            </div>
          ) : (
            <form className="admin-form" onSubmit={(event) => void submitLogin(event)}>
              <label className="admin-field">
                <span>Mot de passe</span>
                <input
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                  required
                />
              </label>
              <button className="btn btn-solid" type="submit" disabled={pending}>
                Ouvrir une session
              </button>
            </form>
          )}
          {message ? (
            <p className="admin-message" role="status">
              {message}
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  if (!contentResponse) {
    return (
      <div className="admin-shell">
        <p role="status" className="admin-note">
          Chargement du contenu…
        </p>
        {message ? <p role="alert">{message}</p> : null}
      </div>
    );
  }

  const storyItems = contentResponse.content.stories;
  const selectedHost = contentResponse.content.hosts.find((host) => host.slug === selectedItem);

  return (
    <div className="admin-shell">
      <header className="admin-heading">
        <div>
          <span className="eyebrow">Sandbox · Administration</span>
          <h1 className="admin-title">Le studio podcast</h1>
          <p className="admin-copy">Épisodes, ressources et classements au même endroit.</p>
        </div>
        <div className="admin-heading-actions">
          <span className={`admin-status${contentResponse.hasDraft ? ' is-draft' : ''}`}>
            {contentResponse.hasDraft ? 'Brouillon chargé' : 'Version publiée'}
          </span>
          <button className="btn" type="button" onClick={() => void refresh()} disabled={pending}>
            Recharger
          </button>
          <button className="btn" type="button" onClick={() => void logout()} disabled={pending}>
            Déconnexion
          </button>
        </div>
      </header>

      {contentResponse.storageMode === 'unavailable' ? (
        <div className="admin-alert" role="status">
          Vercel Blob n’est pas relié. En local, les brouillons sont conservés dans un fichier
          ignoré par Git.
        </div>
      ) : null}

      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="Sections du contenu">
          <button
            className={`admin-tab${activeCollection === 'site' ? ' is-active' : ''}`}
            type="button"
            onClick={() => {
              setActiveCollection('site');
              setSelectedItem('site');
            }}
          >
            Identité du site <span>1</span>
          </button>
          {collections.map(({ key, label }) => (
            <button
              key={key}
              className={`admin-tab${activeCollection === key ? ' is-active' : ''}`}
              type="button"
              onClick={() => {
                setActiveCollection(key);
                setSelectedItem('');
                setStoryForm(undefined);
              }}
            >
              {label} <span>{String(counts[key] ?? 0)}</span>
            </button>
          ))}
          <p className="admin-sidebar-note">
            Les snapshots hebdomadaires restent en lecture seule.
          </p>
        </aside>

        <section className="admin-workspace" aria-labelledby="admin-section-title">
          {activeCollection === 'stories' ? (
            <>
              <div className="admin-section-heading">
                <div>
                  <span className="eyebrow">Contenu éditorial</span>
                  <h2 id="admin-section-title">Articles et guides</h2>
                </div>
                <button className="btn btn-solid" type="button" onClick={beginNewArticle}>
                  Nouvel article <span aria-hidden="true">＋</span>
                </button>
              </div>
              <div className="admin-editor-grid">
                <nav className="admin-record-list" aria-label="Articles existants">
                  {storyItems.map((story) => (
                    <button
                      key={story.slug}
                      type="button"
                      className={`admin-record${selectedItem === story.slug ? ' is-active' : ''}`}
                      onClick={() => {
                        setSelectedItem(story.slug);
                        setArticleError('');
                      }}
                    >
                      <span className="admin-record-title">{story.title}</span>
                      <span className="admin-record-meta">
                        {story.type} · {story.slug}
                      </span>
                    </button>
                  ))}
                </nav>
                {storyForm ? (
                  <div className="admin-editor">
                    <div className="admin-form-grid">
                      <label className="admin-field admin-span-2">
                        <span>Titre</span>
                        <input
                          value={storyForm.title}
                          onChange={(event) => {
                            const title = event.target.value;
                            setStoryForm({
                              ...storyForm,
                              title,
                              slug: storyOriginalSlug ? storyForm.slug : toSlug(title),
                            });
                          }}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Identifiant d’URL</span>
                        <input
                          value={storyForm.slug}
                          onChange={(event) => {
                            setStoryForm({ ...storyForm, slug: toSlug(event.target.value) });
                          }}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Format</span>
                        <select
                          value={storyForm.type}
                          onChange={(event) => {
                            setStoryForm({ ...storyForm, type: event.target.value as StoryType });
                          }}
                        >
                          {storyTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-field admin-span-2">
                        <span>Chapeau</span>
                        <textarea
                          rows={3}
                          value={storyForm.dek}
                          onChange={(event) => {
                            setStoryForm({ ...storyForm, dek: event.target.value });
                          }}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Auteur</span>
                        <select
                          value={storyForm.author}
                          onChange={(event) => {
                            setStoryForm({ ...storyForm, author: event.target.value });
                          }}
                        >
                          {contentResponse.content.hosts.map((host) => (
                            <option key={host.slug} value={host.slug}>
                              {host.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-field">
                        <span>Date de publication</span>
                        <input
                          type="datetime-local"
                          value={storyForm.publishedAt.slice(0, 16)}
                          onChange={(event) => {
                            setStoryForm({
                              ...storyForm,
                              publishedAt: new Date(event.target.value).toISOString(),
                            });
                          }}
                        />
                      </label>
                      <label className="admin-field admin-span-2">
                        <span>Thèmes (identifiants séparés par des virgules)</span>
                        <input
                          value={storyForm.topics.join(', ')}
                          onChange={(event) => {
                            setStoryForm({
                              ...storyForm,
                              topics: event.target.value
                                .split(',')
                                .map((topic) => topic.trim())
                                .filter(Boolean),
                            });
                          }}
                        />
                      </label>
                      <label className="admin-check admin-span-2">
                        <input
                          type="checkbox"
                          checked={storyForm.featured}
                          onChange={(event) => {
                            setStoryForm({ ...storyForm, featured: event.target.checked });
                          }}
                        />
                        <span>Mettre en avant sur la page d’accueil</span>
                      </label>
                      <label className="admin-field admin-span-2">
                        <span>Corps de l’article · blocs JSON</span>
                        <textarea
                          className="admin-json"
                          rows={13}
                          value={bodyText}
                          onChange={(event) => {
                            setBodyText(event.target.value);
                          }}
                          spellCheck={false}
                        />
                        <small>
                          Blocs acceptés : p, h2, h3, quote, list, callout, stat, code, chart et
                          entity. Le HTML libre est refusé.
                        </small>
                      </label>
                      <label className="admin-field">
                        <span>Liens associés · JSON</span>
                        <textarea
                          className="admin-json"
                          rows={7}
                          value={relatedText}
                          onChange={(event) => {
                            setRelatedText(event.target.value);
                          }}
                          spellCheck={false}
                        />
                      </label>
                      <label className="admin-field">
                        <span>Sources citées · JSON</span>
                        <textarea
                          className="admin-json"
                          rows={7}
                          value={sourcesText}
                          onChange={(event) => {
                            setSourcesText(event.target.value);
                          }}
                          spellCheck={false}
                        />
                      </label>
                    </div>
                    {articleError ? (
                      <p className="admin-error" role="alert">
                        {articleError}
                      </p>
                    ) : null}
                    <div className="admin-save-row">
                      {storyOriginalSlug ? (
                        <a
                          className="admin-preview-link"
                          href={`/stories/${storyOriginalSlug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ouvrir l’article ↗
                        </a>
                      ) : (
                        <span className="admin-preview-link">Nouvel article</span>
                      )}
                      <button
                        className="btn"
                        type="button"
                        onClick={() => void saveArticle('draft')}
                        disabled={pending}
                      >
                        Enregistrer le brouillon
                      </button>
                      <button
                        className="btn btn-solid"
                        type="button"
                        onClick={() => void saveArticle('publish')}
                        disabled={pending}
                      >
                        Publier
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-empty">
                    <h3>Choisissez un article</h3>
                    <p>
                      Ou créez un article structuré avec ses thèmes, ses sources et ses liens vers
                      les classements.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : activeCollection === 'site' ? (
            <>
              <div className="admin-section-heading">
                <div>
                  <span className="eyebrow">Identité et accueil</span>
                  <h2 id="admin-section-title">Réglages du site</h2>
                </div>
              </div>
              <div className="admin-editor admin-editor-single">
                <label className="admin-field">
                  <span>Contenu de marque · JSON</span>
                  <textarea
                    className="admin-json"
                    rows={22}
                    value={rawValue}
                    onChange={(event) => {
                      setRawValue(event.target.value);
                    }}
                    spellCheck={false}
                  />
                </label>
                <p className="admin-help">
                  Nom, accroche, texte d’accueil et liens vers les plateformes. Le fichier du logo
                  reste un asset du site.
                </p>
                {rawError ? (
                  <p className="admin-error" role="alert">
                    {rawError}
                  </p>
                ) : null}
                <div className="admin-save-row">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setRawValue(JSON.stringify(contentResponse.content.site, null, 2));
                    }}
                  >
                    Annuler les changements
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      try {
                        const site = JSON.parse(rawValue) as unknown;
                        const next = { ...contentResponse.content, site } as EditableContent;
                        void save('draft', next);
                        setRawError('');
                      } catch {
                        setRawError('JSON invalide.');
                      }
                    }}
                  >
                    Enregistrer le brouillon
                  </button>
                  <button
                    className="btn btn-solid"
                    type="button"
                    onClick={() => {
                      try {
                        const site = JSON.parse(rawValue) as unknown;
                        const next = { ...contentResponse.content, site } as EditableContent;
                        void save('publish', next);
                        setRawError('');
                      } catch {
                        setRawError('JSON invalide.');
                      }
                    }}
                  >
                    Publier
                  </button>
                </div>
              </div>
            </>
          ) : activeCollection === 'hosts' ? (
            <>
              <div className="admin-section-heading">
                <div>
                  <span className="eyebrow">Contenu éditorial</span>
                  <h2 id="admin-section-title">Profils des animateurs</h2>
                </div>
                <span className="admin-count">{String(activeItems.length)} profils</span>
              </div>
              <div className="admin-editor-grid">
                <nav className="admin-record-list" aria-label="Animateurs">
                  {contentResponse.content.hosts.map((host) => (
                    <button
                      key={host.slug}
                      type="button"
                      className={`admin-record${selectedItem === host.slug ? ' is-active' : ''}`}
                      onClick={() => {
                        setSelectedItem(host.slug);
                        setRawError('');
                      }}
                    >
                      <span className="admin-record-title">{host.name}</span>
                      <span className="admin-record-meta">{host.handle}</span>
                    </button>
                  ))}
                </nav>
                {selectedHost ? (
                  <div className="admin-editor">
                    <div className="admin-form-grid">
                      <div className="admin-span-2">
                        <h3 className="admin-record-title">{selectedHost.name}</h3>
                        <p className="admin-help">
                          Les liens renseignés apparaîtront sur la page À propos. Laissez un champ
                          vide si le profil n’existe pas.
                        </p>
                      </div>
                      {hostSocialFields.map(({ key, label, placeholder }) => (
                        <label className="admin-field admin-span-2" key={key}>
                          <span>{label}</span>
                          <input
                            type="url"
                            inputMode="url"
                            autoComplete="url"
                            placeholder={placeholder}
                            value={selectedHost.socials[key] ?? ''}
                            onChange={(event) => {
                              updateHostSocial(selectedHost.slug, key, event.target.value);
                            }}
                          />
                        </label>
                      ))}
                      <p className="admin-help admin-span-2">
                        Utilisez une adresse complète commençant par https://.
                      </p>
                    </div>
                    {rawError ? (
                      <p className="admin-error" role="alert">
                        {rawError}
                      </p>
                    ) : null}
                    <div className="admin-save-row">
                      <button
                        className="btn"
                        type="button"
                        onClick={() => void saveHostLinks('draft')}
                        disabled={pending}
                      >
                        Enregistrer le brouillon
                      </button>
                      <button
                        className="btn btn-solid"
                        type="button"
                        onClick={() => void saveHostLinks('publish')}
                        disabled={pending}
                      >
                        Publier
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-empty">
                    <h3>Sélectionnez un profil</h3>
                    <p>Ajoutez les liens publics de chaque animateur.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {activeCollection === 'episodes' ? (
                <EpisodeComposer
                  initialNumber={
                    Math.max(
                      0,
                      ...contentResponse.content.episodes.map((episode) => episode.number),
                    ) + 1
                  }
                  hosts={contentResponse.content.hosts}
                  topics={contentResponse.content.topics}
                  pending={pending}
                  onSave={saveEpisode}
                />
              ) : null}
              <div className="admin-section-heading">
                <div>
                  <span className="eyebrow">Contenu éditorial</span>
                  <h2 id="admin-section-title">{collectionDefinition?.title}</h2>
                </div>
                <span className="admin-count">{String(activeItems.length)} entrées</span>
              </div>
              <div className="admin-editor-grid">
                <nav
                  className="admin-record-list"
                  aria-label={`${collectionDefinition?.title ?? 'Contenus'} existants`}
                >
                  {activeItems.map((item) => {
                    const identity = itemIdentity(activeCollection, item);
                    return (
                      <button
                        key={identity}
                        type="button"
                        className={`admin-record${selectedItem === identity ? ' is-active' : ''}`}
                        onClick={() => {
                          setSelectedItem(identity);
                          setRawError('');
                        }}
                      >
                        <span className="admin-record-title">
                          {itemTitle(activeCollection, item)}
                        </span>
                        <span className="admin-record-meta">{identity}</span>
                      </button>
                    );
                  })}
                </nav>
                {selectedItem ? (
                  <div className="admin-editor">
                    <label className="admin-field">
                      <span>Collection complète · JSON</span>
                      <textarea
                        className="admin-json"
                        rows={24}
                        value={rawValue}
                        onChange={(event) => {
                          setRawValue(event.target.value);
                        }}
                        spellCheck={false}
                      />
                    </label>
                    <p className="admin-help">
                      Modifiez les objets sans retirer les entrées existantes. Les schémas et les
                      références seront vérifiés avant l’enregistrement.
                    </p>
                    {rawError ? (
                      <p className="admin-error" role="alert">
                        {rawError}
                      </p>
                    ) : null}
                    <div className="admin-save-row">
                      <button
                        className="btn"
                        type="button"
                        onClick={() => {
                          setRawValue(
                            JSON.stringify(contentResponse.content[activeCollection], null, 2),
                          );
                        }}
                      >
                        Annuler les changements
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => void saveRawCollection('draft')}
                        disabled={pending}
                      >
                        Enregistrer le brouillon
                      </button>
                      <button
                        className="btn btn-solid"
                        type="button"
                        onClick={() => void saveRawCollection('publish')}
                        disabled={pending}
                      >
                        Publier
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-empty">
                    <h3>Sélectionnez une entrée</h3>
                    <p>
                      Les données structurées sont modifiables ici avec validation avant
                      publication.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {message ? (
        <p className="admin-toast" role="status">
          {message}
        </p>
      ) : null}
      <div className="admin-footnote">
        <span>Les données de classement restent immuables depuis le backoffice.</span>
        <span>
          {contentResponse.storageMode === 'postgres'
            ? 'Base Postgres (Neon) connectée'
            : contentResponse.storageMode === 'local'
              ? 'Fichier local de développement'
              : 'Stockage non configuré'}
        </span>
      </div>
    </div>
  );
}
