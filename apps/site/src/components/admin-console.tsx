'use client';

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { z } from 'zod';
import { editableContentSchema, type EditableContent } from '@/domain/admin-content';
import { applyChartMarkdown, serializeChartMarkdown } from '@/domain/chart-markdown';
import { type Episode, type Host, type Source, type Topic } from '@/domain/schema';
import { AdminChartEditor } from './admin-chart-editor';
import { SourceEditor, TopicEditor } from './admin-simple-content';
import { EpisodeComposer } from './episode-composer';
import { SiteSettingsEditor } from './site-settings-editor';

type CollectionKey = 'episodes' | 'charts' | 'hosts' | 'topics' | 'sources';
type SectionKey = CollectionKey | 'site';
type HostSocialKey = keyof Host['socials'];
const storageModeSchema = z.enum(['local', 'vercel-blob', 'unavailable']);
const adminStatusSchema = z.object({
  authenticated: z.boolean(),
  username: z.string().optional(),
  authConfigured: z.boolean(),
  storageMode: storageModeSchema,
});
const contentResponseSchema = z.object({
  content: editableContentSchema,
  draftEtag: z.string().nullable(),
  hasDraft: z.boolean(),
  storageMode: storageModeSchema,
  chartEntries: z.record(
    z.string(),
    z.object({ week: z.string().nullable(), entities: z.array(z.string()) }),
  ),
});
const writeResponseSchema = z.object({ draftEtag: z.string().nullable(), published: z.boolean() });
const okResponseSchema = z.object({ ok: z.literal(true) });
type AdminStatus = z.infer<typeof adminStatusSchema>;
type ContentResponse = z.infer<typeof contentResponseSchema>;

const collections: { key: CollectionKey; label: string }[] = [
  { key: 'episodes', label: 'Épisodes' },
  { key: 'charts', label: 'Classements' },
  { key: 'hosts', label: 'Animateurs' },
  { key: 'topics', label: 'Thèmes' },
  { key: 'sources', label: 'Sources des classements' },
];

const hostSocialFields: { key: HostSocialKey; label: string; placeholder: string }[] = [
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://www.linkedin.com/in/…' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/…' },
  { key: 'x', label: 'X', placeholder: 'https://x.com/…' },
];

function errorMessage(value: unknown, fallback: string): string {
  return value instanceof Error ? value.message : fallback;
}

async function apiJson<T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
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
  return schema.parse(value);
}

export function AdminConsole() {
  const [status, setStatus] = useState<AdminStatus>();
  const [contentResponse, setContentResponse] = useState<ContentResponse>();
  const [activeCollection, setActiveCollection] = useState<SectionKey>('episodes');
  const [selectedItem, setSelectedItem] = useState<string>('new');
  const [chartMarkdown, setChartMarkdown] = useState('');
  const [rawError, setRawError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const load = useCallback(async () => {
    const nextStatus = await apiJson('/api/admin/session', adminStatusSchema);
    setStatus(nextStatus);
    if (nextStatus.authenticated) {
      const nextContent = await apiJson('/api/admin/content', contentResponseSchema);
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
    if (activeCollection !== 'charts' || !selectedItem) return;
    setChartMarkdown(
      serializeChartMarkdown(
        contentResponse.content,
        selectedItem,
        contentResponse.chartEntries[selectedItem]?.entities ?? [],
      ),
    );
    setRawError('');
  }, [activeCollection, contentResponse, selectedItem]);

  const counts = useMemo(() => {
    if (!contentResponse) return {};
    return Object.fromEntries(
      collections.map(({ key }) => [
        key,
        key === 'hosts'
          ? contentResponse.content.hosts.filter((host) => !host.placeholder).length
          : contentResponse.content[key].length,
      ]),
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
      await apiJson('/api/admin/login', okResponseSchema, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
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
      const result = await apiJson('/api/admin/content', writeResponseSchema, {
        method: 'POST',
        body: JSON.stringify({
          action,
          content: nextContent,
          expectedDraftEtag: contentResponse.draftEtag,
        }),
      });
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

  async function saveTopic(item: Topic, action: 'draft' | 'publish'): Promise<boolean> {
    if (!contentResponse) return false;
    const topics =
      selectedItem === 'new'
        ? [...contentResponse.content.topics, item]
        : contentResponse.content.topics.map((current) =>
            current.slug === selectedItem ? item : current,
          );
    const saved = await save(action, { ...contentResponse.content, topics });
    if (saved) setSelectedItem(item.slug);
    return saved;
  }

  async function saveSource(item: Source, action: 'draft' | 'publish'): Promise<boolean> {
    if (!contentResponse) return false;
    const sources =
      selectedItem === 'new'
        ? [...contentResponse.content.sources, item]
        : contentResponse.content.sources.map((current) =>
            current.id === selectedItem ? item : current,
          );
    const saved = await save(action, { ...contentResponse.content, sources });
    if (saved) setSelectedItem(item.id);
    return saved;
  }

  async function saveChartDocument(
    action: 'draft' | 'publish',
    document = chartMarkdown,
  ): Promise<boolean> {
    if (!contentResponse || activeCollection !== 'charts' || !selectedItem) return false;
    setRawError('');
    try {
      const nextContent = applyChartMarkdown(
        document,
        contentResponse.content,
        selectedItem,
        contentResponse.chartEntries[selectedItem]?.entities ?? [],
        new Date().toISOString(),
      );
      return await save(action, nextContent);
    } catch (error) {
      setRawError(errorMessage(error, 'Vérifiez le document Markdown.'));
      return false;
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
    const saved = await save(action, { ...contentResponse.content, episodes });
    if (saved) setSelectedItem(String(episode.number));
  }

  async function logout(): Promise<void> {
    setPending(true);
    try {
      await apiJson('/api/admin/logout', okResponseSchema, { method: 'POST', body: '{}' });
      setContentResponse(undefined);
      await load();
      setMessage('Session fermée.');
    } catch (error) {
      setMessage(errorMessage(error, 'Déconnexion impossible.'));
    } finally {
      setPending(false);
    }
  }

  function selectCollection(key: CollectionKey): void {
    setActiveCollection(key);
    setSelectedItem(
      key === 'episodes'
        ? 'new'
        : key === 'hosts'
          ? (contentResponse?.content.hosts.find((host) => !host.placeholder)?.slug ?? '')
          : key === 'charts'
            ? (contentResponse?.content.charts[0]?.slug ?? '')
            : key === 'topics'
              ? (contentResponse?.content.topics[0]?.slug ?? '')
              : (contentResponse?.content.sources[0]?.id ?? ''),
    );
    setRawError('');
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
              La connexion sera disponible après configuration de <code>SITE_ADMIN_USERS</code> et{' '}
              <code>SITE_ADMIN_SECRET</code> dans l’environnement du site.
            </div>
          ) : (
            <form className="admin-form" onSubmit={(event) => void submitLogin(event)}>
              <label className="admin-field">
                <span>Identifiant</span>
                <input
                  autoComplete="username"
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                  }}
                  required
                />
              </label>
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

  const selectedHost = contentResponse.content.hosts.find((host) => host.slug === selectedItem);
  const selectedEpisode = contentResponse.content.episodes.find(
    (episode) => String(episode.number) === selectedItem,
  );
  const nextEpisodeNumber =
    Math.max(0, ...contentResponse.content.episodes.map((episode) => episode.number)) + 1;

  return (
    <div className="admin-shell">
      <header className="admin-heading">
        <div>
          <span className="eyebrow">Sandbox · Administration</span>
          <h1 className="admin-title">Studio éditorial</h1>
          <p className="admin-copy">
            Ajoutez une vidéo, écrivez un avis et publiez depuis un seul endroit.
          </p>
        </div>
        <div className="admin-heading-actions">
          <span className="admin-status">{status.username}</span>
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
            className="btn btn-solid admin-sidebar-create"
            type="button"
            onClick={() => {
              setActiveCollection('episodes');
              setSelectedItem('new');
            }}
          >
            ＋ Nouvel épisode
          </button>
          <p className="admin-sidebar-label">Publier du contenu</p>
          {collections.slice(0, 2).map(({ key, label }) => (
            <button
              key={key}
              className={`admin-tab is-primary${activeCollection === key ? ' is-active' : ''}`}
              type="button"
              onClick={() => {
                selectCollection(key);
              }}
            >
              {label} <span>{String(counts[key] ?? 0)}</span>
            </button>
          ))}
          <p className="admin-sidebar-label admin-sidebar-divider">Réglages</p>
          <button
            className={`admin-tab${activeCollection === 'site' ? ' is-active' : ''}`}
            type="button"
            onClick={() => {
              setActiveCollection('site');
              setSelectedItem('site');
            }}
          >
            Identité du site
          </button>
          {collections.slice(2).map(({ key, label }) => (
            <button
              key={key}
              className={`admin-tab${activeCollection === key ? ' is-active' : ''}`}
              type="button"
              onClick={() => {
                selectCollection(key);
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
          {activeCollection === 'site' ? (
            <>
              <div className="admin-section-heading">
                <div>
                  <span className="eyebrow">Identité et accueil</span>
                  <h2 id="admin-section-title">Réglages du site</h2>
                </div>
              </div>
              <SiteSettingsEditor
                initial={contentResponse.content.site}
                pending={pending}
                onSave={async (site, action) => {
                  await save(action, { ...contentResponse.content, site });
                }}
              />
            </>
          ) : activeCollection === 'episodes' ? (
            <>
              <div className="admin-section-heading">
                <div>
                  <span className="eyebrow">Bibliothèque vidéo</span>
                  <h2 id="admin-section-title">Épisodes</h2>
                </div>
                <span className="admin-count">
                  {String(contentResponse.content.episodes.length)} épisodes
                </span>
              </div>
              <div className="admin-editor-grid admin-episode-grid">
                <nav className="admin-record-list" aria-label="Épisodes existants">
                  {contentResponse.content.episodes.map((episode) => (
                    <button
                      type="button"
                      key={episode.number}
                      className={`admin-record${selectedItem === String(episode.number) ? ' is-active' : ''}`}
                      onClick={() => {
                        setSelectedItem(String(episode.number));
                      }}
                    >
                      <span className="admin-record-title">{episode.title}</span>
                      <span className="admin-record-meta">
                        Épisode {String(episode.number)} ·{' '}
                        {episode.status === 'draft' ? 'brouillon' : 'publié'}
                      </span>
                    </button>
                  ))}
                </nav>
                {selectedItem ? (
                  <EpisodeComposer
                    key={selectedItem}
                    initialNumber={selectedEpisode?.number ?? nextEpisodeNumber}
                    episode={selectedEpisode}
                    hosts={contentResponse.content.hosts}
                    topics={contentResponse.content.topics}
                    defaultHostSlug={status.username}
                    otherEpisodes={contentResponse.content.episodes}
                    onSelectEpisode={(number) => {
                      setSelectedItem(String(number));
                    }}
                    pending={pending}
                    onSave={saveEpisode}
                  />
                ) : (
                  <div className="admin-empty">
                    <h3>Choisissez un épisode</h3>
                    <p>Modifiez la vidéo, ses chapitres, ses sources ou créez un nouvel épisode.</p>
                  </div>
                )}
              </div>
            </>
          ) : activeCollection === 'hosts' ? (
            <>
              <div className="admin-section-heading">
                <div>
                  <span className="eyebrow">Contenu éditorial</span>
                  <h2 id="admin-section-title">Profils des animateurs</h2>
                </div>
                <span className="admin-count">
                  {String(contentResponse.content.hosts.filter((host) => !host.placeholder).length)}
                  {' animateurs'}
                </span>
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
                      <span className="admin-record-meta">
                        {host.placeholder ? 'Signature des contenus simulés' : host.handle}
                      </span>
                    </button>
                  ))}
                </nav>
                {selectedHost ? (
                  <div className="admin-editor">
                    <div className="admin-form-grid">
                      <div className="admin-span-2">
                        <h3 className="admin-record-title">{selectedHost.name}</h3>
                        <p className="admin-help">
                          {selectedHost.placeholder
                            ? 'Cette signature conserve les anciens épisodes et avis simulés sans les attribuer à Lou, Nicolas ou Loïc.'
                            : 'Ce profil est lié aux épisodes et aux avis. Sa carte publique se modifie dans « Identité du site ».'}
                        </p>
                      </div>
                      {!selectedHost.placeholder &&
                        hostSocialFields.map(({ key, label, placeholder }) => (
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
                      {!selectedHost.placeholder && (
                        <p className="admin-help admin-span-2">
                          Utilisez une adresse complète commençant par https://.
                        </p>
                      )}
                    </div>
                    {rawError ? (
                      <p className="admin-error" role="alert">
                        {rawError}
                      </p>
                    ) : null}
                    {!selectedHost.placeholder && (
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
                    )}
                  </div>
                ) : (
                  <div className="admin-empty">
                    <h3>Sélectionnez un profil</h3>
                    <p>Ajoutez les liens publics de chaque animateur.</p>
                  </div>
                )}
              </div>
            </>
          ) : activeCollection === 'charts' ? (
            <>
              <div className="admin-section-heading">
                <div>
                  <span className="eyebrow">Édition Markdown</span>
                  <h2 id="admin-section-title">Classements</h2>
                </div>
                <span className="admin-count">
                  {String(contentResponse.content.charts.length)} classements
                </span>
              </div>
              <div className="admin-editor-grid admin-chart-grid">
                <nav className="admin-record-list" aria-label="Classements existants">
                  {contentResponse.content.charts.map((chart) => (
                    <button
                      key={chart.slug}
                      type="button"
                      className={`admin-record${selectedItem === chart.slug ? ' is-active' : ''}`}
                      onClick={() => {
                        setSelectedItem(chart.slug);
                        setRawError('');
                      }}
                    >
                      <span className="admin-record-title">{chart.title}</span>
                      <span className="admin-record-meta">{chart.slug}</span>
                    </button>
                  ))}
                </nav>
                {selectedItem ? (
                  <AdminChartEditor
                    key={selectedItem}
                    markdown={chartMarkdown}
                    onChange={setChartMarkdown}
                    onSave={saveChartDocument}
                    onReset={() => {
                      setChartMarkdown(
                        serializeChartMarkdown(
                          contentResponse.content,
                          selectedItem,
                          contentResponse.chartEntries[selectedItem]?.entities ?? [],
                        ),
                      );
                      setRawError('');
                    }}
                    pending={pending}
                    error={rawError}
                    week={contentResponse.chartEntries[selectedItem]?.week ?? null}
                    entities={contentResponse.content.entities}
                    rankedSlugs={contentResponse.chartEntries[selectedItem]?.entities ?? []}
                    hosts={contentResponse.content.hosts}
                    currentUsername={status.username}
                  />
                ) : (
                  <div className="admin-empty">
                    <h3>Choisissez un classement</h3>
                    <p>Son contenu éditorial s’ouvre dans un seul document Markdown.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="admin-section-heading">
                <div>
                  <span className="eyebrow">Organisation du contenu</span>
                  <h2 id="admin-section-title">
                    {activeCollection === 'topics' ? 'Thèmes' : 'Sources des classements'}
                  </h2>
                </div>
                <button
                  className="btn btn-solid"
                  type="button"
                  onClick={() => {
                    setSelectedItem('new');
                  }}
                >
                  {activeCollection === 'topics' ? 'Nouveau thème' : 'Nouvelle source'} ＋
                </button>
              </div>
              <div className="admin-editor-grid">
                <nav
                  className="admin-record-list"
                  aria-label={
                    activeCollection === 'topics' ? 'Thèmes existants' : 'Sources existantes'
                  }
                >
                  {activeCollection === 'topics'
                    ? contentResponse.content.topics.map((topic) => (
                        <button
                          key={topic.slug}
                          type="button"
                          className={`admin-record${selectedItem === topic.slug ? ' is-active' : ''}`}
                          onClick={() => {
                            setSelectedItem(topic.slug);
                          }}
                        >
                          <span className="admin-record-title">{topic.label}</span>
                          <span className="admin-record-meta">{topic.slug}</span>
                        </button>
                      ))
                    : contentResponse.content.sources.map((source) => (
                        <button
                          key={source.id}
                          type="button"
                          className={`admin-record${selectedItem === source.id ? ' is-active' : ''}`}
                          onClick={() => {
                            setSelectedItem(source.id);
                          }}
                        >
                          <span className="admin-record-title">{source.label}</span>
                          <span className="admin-record-meta">
                            {source.status === 'connected' ? 'Connectée' : 'Référence'} ·{' '}
                            {source.id}
                          </span>
                        </button>
                      ))}
                </nav>
                {selectedItem ? (
                  activeCollection === 'topics' ? (
                    <TopicEditor
                      key={selectedItem}
                      item={contentResponse.content.topics.find(
                        (topic) => topic.slug === selectedItem,
                      )}
                      existingIds={contentResponse.content.topics.map((topic) => topic.slug)}
                      pending={pending}
                      onSave={saveTopic}
                    />
                  ) : (
                    <SourceEditor
                      key={selectedItem}
                      item={contentResponse.content.sources.find(
                        (source) => source.id === selectedItem,
                      )}
                      existingIds={contentResponse.content.sources.map((source) => source.id)}
                      pending={pending}
                      onSave={saveSource}
                    />
                  )
                ) : (
                  <div className="admin-empty">
                    <h3>Choisissez une entrée</h3>
                    <p>Ou créez un nouveau contenu en un clic.</p>
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
          {contentResponse.storageMode === 'vercel-blob'
            ? 'Stockage privé Vercel Blob connecté'
            : contentResponse.storageMode === 'local'
              ? 'Fichier local de développement'
              : 'Stockage non configuré'}
        </span>
      </div>
    </div>
  );
}
