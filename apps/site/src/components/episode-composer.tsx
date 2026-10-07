'use client';

import { useRef, useState } from 'react';
import { z } from 'zod';
import { episodeSchema, type Episode, type Host, type Topic } from '@/domain/schema';
import { MENTION_KINDS } from '@/domain/kinds';
import { parseYouTubeVideoId } from '@/domain/youtube';

const youtubeMetadataSchema = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  url: z.url(),
  title: z.string().min(1),
  channel: z.string().min(1),
  thumbnailUrl: z.url(),
  description: z.string().optional(),
  summary: z.string().optional(),
  publishedAt: z.iso.datetime().optional(),
  durationSec: z.number().int().positive().optional(),
  chapters: episodeSchema.shape.chapters.optional(),
  resources: episodeSchema.shape.mentions.optional(),
  spotifyUrl: z.url().optional(),
  appleUrl: z.url().optional(),
  source: z.enum(['youtube-data-api', 'oembed']),
});
type YouTubeMetadata = z.infer<typeof youtubeMetadataSchema>;

interface Props {
  initialNumber: number;
  episode?: Episode | undefined;
  hosts: Host[];
  topics: Topic[];
  defaultHostSlug?: string | undefined;
  otherEpisodes: Episode[];
  onSelectEpisode: (number: number) => void;
  pending: boolean;
  onSave: (episode: Episode, action: 'draft' | 'publish') => Promise<void>;
}

function localDateTime(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      return body.error;
    }
  } catch {
    return `La requête a échoué (${response.status.toString()}).`;
  }
  return `La requête a échoué (${response.status.toString()}).`;
}

export function EpisodeComposer({
  initialNumber,
  episode,
  hosts,
  topics,
  defaultHostSlug,
  otherEpisodes,
  onSelectEpisode,
  pending,
  onSave,
}: Props) {
  const initialYoutubeUrl =
    episode?.platforms.youtubeUrl ??
    (episode?.platforms.youtubeId
      ? `https://www.youtube.com/watch?v=${episode.platforms.youtubeId}`
      : '');
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl);
  const latestVideoId = useRef(parseYouTubeVideoId(initialYoutubeUrl));
  const lastImportedVideoId = useRef(
    episode?.platforms.youtubeId ?? parseYouTubeVideoId(initialYoutubeUrl),
  );
  const inFlightVideoId = useRef<string | undefined>(undefined);
  const requestSerial = useRef(0);
  const [metadata, setMetadata] = useState<YouTubeMetadata>();
  const [metadataPending, setMetadataPending] = useState(false);
  const [metadataError, setMetadataError] = useState('');
  const [manualEntry, setManualEntry] = useState(Boolean(episode));
  const [title, setTitle] = useState(episode?.title ?? '');
  const [dek, setDek] = useState(episode?.dek ?? '');
  const [description, setDescription] = useState(episode?.description ?? '');
  const [publishedAt, setPublishedAt] = useState(() =>
    episode?.publishedAt ? localDateTime(episode.publishedAt) : '',
  );
  const [durationSec, setDurationSec] = useState(
    episode?.durationSec ? String(episode.durationSec) : '',
  );
  const [selectedHosts, setSelectedHosts] = useState<string[]>(
    episode?.hosts ??
      (hosts.some((host) => host.slug === defaultHostSlug && !host.placeholder) && defaultHostSlug
        ? [defaultHostSlug]
        : []),
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>(episode?.topics ?? []);
  const [featured, setFeatured] = useState(episode?.featured ?? false);
  const [chapters, setChapters] = useState<Episode['chapters']>(episode?.chapters ?? []);
  const [resources, setResources] = useState<Episode['mentions']>([
    ...(episode?.mentions ?? []),
    ...(episode?.sources ?? []).map((source) => ({
      kind: source.kind,
      label: source.label,
      url: source.url,
      note: source.publisher,
    })),
  ]);
  const [spotifyUrl, setSpotifyUrl] = useState(episode?.platforms.spotifyUrl ?? '');
  const [appleUrl, setAppleUrl] = useState(episode?.platforms.appleUrl ?? '');
  const [error, setError] = useState('');
  const duplicateEpisode = otherEpisodes.find(
    (candidate) =>
      candidate.number !== episode?.number &&
      candidate.platforms.youtubeId &&
      candidate.platforms.youtubeId === parseYouTubeVideoId(youtubeUrl),
  );
  const showFields = Boolean(episode ?? metadata ?? manualEntry);
  const missingFields = [
    !episode && !parseYouTubeVideoId(youtubeUrl) && 'lien YouTube',
    !title.trim() && 'titre',
    !dek.trim() && 'résumé',
    !description.trim() && 'description',
    !publishedAt && 'date',
    (!durationSec || Number(durationSec) < 60) && 'durée',
    selectedHosts.length === 0 && 'animateur',
  ].filter((value): value is string => typeof value === 'string');

  function changeYouTubeUrl(value: string): void {
    setYoutubeUrl(value);
    const videoId = parseYouTubeVideoId(value);
    latestVideoId.current = videoId;
    if (metadata?.videoId !== videoId) setMetadata(undefined);
    setMetadataError('');
  }

  async function importYouTube(url: string, force = false): Promise<void> {
    const videoId = parseYouTubeVideoId(url);
    if (!videoId) {
      setMetadataError('Collez une adresse de vidéo YouTube valide.');
      return;
    }
    if (!force && (metadata?.videoId === videoId || inFlightVideoId.current === videoId)) return;
    const serial = ++requestSerial.current;
    inFlightVideoId.current = videoId;
    setMetadataError('');
    setMetadataPending(true);
    try {
      const response = await fetch('/api/admin/youtube-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const result = youtubeMetadataSchema.parse(await response.json());
      if (latestVideoId.current !== result.videoId || requestSerial.current !== serial) return;
      const newVideo = lastImportedVideoId.current !== result.videoId;
      lastImportedVideoId.current = result.videoId;
      setMetadata(result);
      setTitle(result.title);
      setYoutubeUrl(result.url);
      setManualEntry(true);
      if (newVideo || result.summary) setDek(result.summary ?? '');
      if (newVideo || result.description) setDescription(result.description ?? '');
      if (newVideo || result.publishedAt)
        setPublishedAt(result.publishedAt ? localDateTime(result.publishedAt) : '');
      if (newVideo || result.durationSec)
        setDurationSec(
          result.durationSec && result.durationSec >= 60 ? String(result.durationSec) : '',
        );
      if (newVideo || result.chapters?.length) setChapters(result.chapters ?? []);
      const importedResources = result.resources;
      if (newVideo) {
        setResources(importedResources ?? []);
      } else if (importedResources?.length) {
        setResources((current) => {
          const urls = new Set(current.map((item) => item.url).filter(Boolean));
          return [
            ...current,
            ...importedResources.filter((item) => !item.url || !urls.has(item.url)),
          ];
        });
      }
      if (newVideo || result.spotifyUrl) setSpotifyUrl(result.spotifyUrl ?? '');
      if (newVideo || result.appleUrl) setAppleUrl(result.appleUrl ?? '');
    } catch (reason) {
      if (latestVideoId.current === videoId && requestSerial.current === serial) {
        setMetadataError(reason instanceof Error ? reason.message : 'Import YouTube impossible.');
      }
    } finally {
      if (inFlightVideoId.current === videoId) inFlightVideoId.current = undefined;
      if (requestSerial.current === serial) setMetadataPending(false);
    }
  }

  async function save(action: 'draft' | 'publish'): Promise<void> {
    setError('');
    if (duplicateEpisode) {
      setError(`Cette vidéo est déjà utilisée par l’épisode ${String(duplicateEpisode.number)}.`);
      return;
    }
    const videoId = parseYouTubeVideoId(youtubeUrl);
    if (youtubeUrl.trim() && !videoId) {
      setError('Saisissez une URL de vidéo YouTube valide.');
      return;
    }
    if (action === 'publish' && !episode && !videoId) {
      setError('Ajoutez le lien YouTube avant de publier ce nouvel épisode.');
      return;
    }
    let date: string;
    try {
      date = new Date(publishedAt).toISOString();
    } catch {
      setError('Saisissez une date de publication valide.');
      return;
    }
    const imported = metadata?.videoId === videoId ? metadata : undefined;
    const sameVideo = episode?.platforms.youtubeId === videoId;
    const platforms: Episode['platforms'] = {
      ...episode?.platforms,
      youtubeId: videoId,
      youtubeUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
      youtubeChannel:
        imported?.channel ?? (sameVideo ? episode?.platforms.youtubeChannel : undefined),
      thumbnailUrl:
        imported?.thumbnailUrl ?? (sameVideo ? episode?.platforms.thumbnailUrl : undefined),
      spotifyUrl: spotifyUrl.trim() || undefined,
      appleUrl: appleUrl.trim() || undefined,
    };

    const parsed = episodeSchema.safeParse({
      number: initialNumber,
      title,
      dek,
      publishedAt: date,
      durationSec: Number(durationSec),
      description,
      hosts: selectedHosts,
      guests: episode?.guests ?? [],
      topics: selectedTopics,
      chapters,
      mentions: resources,
      sources: [],
      platforms,
      featured,
      status: action === 'publish' ? 'published' : (episode?.status ?? 'draft'),
      charts: episode?.charts ?? [],
      cover: episode?.cover ?? { tone: 1, kicker: `Épisode ${String(initialNumber)}` },
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(issue ? `${issue.path.join('.')}: ${issue.message}` : 'Vérifiez les champs requis.');
      return;
    }
    await onSave(parsed.data, action);
  }

  function toggle(items: string[], setItems: (items: string[]) => void, value: string): void {
    setItems(items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  }

  return (
    <section className="episode-composer" aria-labelledby="episode-composer-title">
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow">
            {episode ? 'Modifier le catalogue' : 'Ajouter au catalogue'}
          </span>
          <h2 id="episode-composer-title">{episode ? 'Modifier l’épisode' : 'Créer un épisode'}</h2>
        </div>
        <span className="admin-count">Épisode {String(initialNumber)}</span>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void importYouTube(youtubeUrl, true);
        }}
        className="youtube-import"
      >
        <label className="admin-field">
          <span>1. Collez le lien YouTube</span>
          <input
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={youtubeUrl}
            onChange={(event) => {
              changeYouTubeUrl(event.target.value);
            }}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData('text').trim();
              if (!parseYouTubeVideoId(pasted)) return;
              event.preventDefault();
              changeYouTubeUrl(pasted);
              void importYouTube(pasted);
            }}
            onBlur={() => {
              if (parseYouTubeVideoId(youtubeUrl)) void importYouTube(youtubeUrl);
            }}
            autoFocus={!episode}
            required
          />
          <small>
            Le collage charge automatiquement les informations, chapitres et liens disponibles.
          </small>
        </label>
        <button className="btn" type="submit" disabled={metadataPending}>
          {metadataPending
            ? 'Import en cours…'
            : metadata
              ? 'Actualiser depuis YouTube'
              : 'Importer'}
        </button>
        {duplicateEpisode ? (
          <div className="admin-duplicate-warning" role="status">
            Cette vidéo existe déjà : épisode {String(duplicateEpisode.number)}.
            <button
              type="button"
              onClick={() => {
                onSelectEpisode(duplicateEpisode.number);
              }}
            >
              Ouvrir cet épisode →
            </button>
          </div>
        ) : null}
        {metadataError ? (
          <p className="admin-error" role="alert">
            {metadataError}
          </p>
        ) : null}
        {metadata ? (
          <p className="admin-help" role="status">
            {metadata.source === 'youtube-data-api'
              ? `Vidéo importée · ${metadata.channel} · ${String(metadata.chapters?.length ?? 0)} chapitres et ${String(metadata.resources?.length ?? 0)} liens repérés dans la description. Vérifiez les champs avant publication.`
              : `Titre et miniature importés · ${metadata.channel}. Ajoutez YOUTUBE_API_KEY au serveur pour récupérer aussi la date, la durée, la description, les chapitres et les liens.`}
          </p>
        ) : null}
      </form>

      {showFields ? (
        <>
          <div className="episode-readiness" role="status">
            <strong>2. Vérifiez et publiez</strong>
            <span>
              {missingFields.length === 0
                ? 'Les champs essentiels sont prêts.'
                : `À compléter : ${missingFields.join(', ')}.`}
            </span>
          </div>
          <div className="episode-composer-form">
            <label className="admin-field admin-span-2">
              <span>Titre de l’épisode</span>
              <input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                required
              />
            </label>
            <label className="admin-field admin-span-2">
              <span>Résumé court</span>
              <textarea
                rows={2}
                value={dek}
                onChange={(event) => {
                  setDek(event.target.value);
                }}
                required
              />
            </label>
            <label className="admin-field admin-span-2">
              <span>Description</span>
              <textarea
                rows={4}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
                required
              />
            </label>
            <label className="admin-field">
              <span>Date de publication</span>
              <input
                type="datetime-local"
                value={publishedAt}
                onChange={(event) => {
                  setPublishedAt(event.target.value);
                }}
                required
              />
            </label>
            <label className="admin-field">
              <span>Durée · secondes</span>
              <input
                type="number"
                min={60}
                step={1}
                value={durationSec}
                onChange={(event) => {
                  setDurationSec(event.target.value);
                }}
                required
              />
            </label>
            <fieldset className="admin-field admin-span-2">
              <legend>Animateurs</legend>
              <div className="admin-check-list">
                {hosts
                  .filter((host) => !host.placeholder || selectedHosts.includes(host.slug))
                  .map((host) => (
                    <label className="admin-check" key={host.slug}>
                      <input
                        type="checkbox"
                        checked={selectedHosts.includes(host.slug)}
                        onChange={() => {
                          toggle(selectedHosts, setSelectedHosts, host.slug);
                        }}
                      />
                      <span>
                        {host.name}
                        {host.placeholder ? ' · archive' : ''}
                      </span>
                    </label>
                  ))}
              </div>
            </fieldset>

            <details className="admin-disclosure admin-span-2">
              <summary>
                Thèmes <span>{String(selectedTopics.length)} sélectionné(s)</span>
              </summary>
              <fieldset className="admin-field">
                <legend>Thèmes</legend>
                <div className="admin-check-list">
                  {topics.map((topic) => (
                    <label className="admin-check" key={topic.slug}>
                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(topic.slug)}
                        onChange={() => {
                          toggle(selectedTopics, setSelectedTopics, topic.slug);
                        }}
                      />
                      <span>{topic.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </details>

            <details className="admin-disclosure admin-span-2">
              <summary>
                Liens d’écoute{' '}
                <span>
                  {String(Number(Boolean(spotifyUrl)) + Number(Boolean(appleUrl)))} lien(s)
                </span>
              </summary>
              <div className="admin-form-grid">
                <label className="admin-field">
                  <span>Lien Spotify</span>
                  <input
                    type="url"
                    inputMode="url"
                    value={spotifyUrl}
                    onChange={(event) => {
                      setSpotifyUrl(event.target.value);
                    }}
                  />
                </label>
                <label className="admin-field">
                  <span>Lien Apple Podcasts</span>
                  <input
                    type="url"
                    inputMode="url"
                    value={appleUrl}
                    onChange={(event) => {
                      setAppleUrl(event.target.value);
                    }}
                  />
                </label>
              </div>
            </details>

            <details className="admin-disclosure admin-span-2">
              <summary>
                Chapitres <span>{String(chapters.length)} importé(s)</span>
              </summary>
              <section
                className="admin-repeater admin-span-2"
                aria-labelledby="admin-chapters-title"
              >
                <div className="admin-repeater-heading">
                  <div>
                    <h3 id="admin-chapters-title">Chapitres</h3>
                    <p className="admin-help">
                      Les horodatages de la description YouTube sont importés automatiquement quand
                      ils existent. Le temps reste modifiable en secondes.
                    </p>
                  </div>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setChapters((current) => [...current, { at: 0, title: '' }]);
                    }}
                  >
                    Ajouter ＋
                  </button>
                </div>
                {chapters.map((chapter, index) => (
                  <div className="admin-repeater-row" key={index}>
                    <label className="admin-field">
                      <span>Temps · secondes</span>
                      <input
                        type="number"
                        min={0}
                        value={chapter.at}
                        onChange={(event) => {
                          setChapters((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, at: Number(event.target.value) } : item,
                            ),
                          );
                        }}
                      />
                    </label>
                    <label className="admin-field">
                      <span>Titre</span>
                      <input
                        value={chapter.title}
                        onChange={(event) => {
                          setChapters((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, title: event.target.value } : item,
                            ),
                          );
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="admin-repeater-remove"
                      onClick={() => {
                        setChapters((current) => current.filter((_, i) => i !== index));
                      }}
                    >
                      Retirer
                    </button>
                  </div>
                ))}
                {chapters.length === 0 ? (
                  <p className="admin-help">Aucun chapitre ajouté.</p>
                ) : null}
              </section>
            </details>

            <details className="admin-disclosure admin-span-2">
              <summary>
                Ressources <span>{String(resources.length)} lien(s) ou annexe(s)</span>
              </summary>
              <section
                className="admin-repeater admin-span-2"
                aria-labelledby="admin-mentions-title"
              >
                <div className="admin-repeater-heading">
                  <div>
                    <h3 id="admin-mentions-title">Ressources</h3>
                    <p className="admin-help">
                      Liens cités dans la vidéo ou utilisés pour préparer l’épisode. Ils
                      apparaissent ensemble dans la barre latérale.
                    </p>
                  </div>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setResources((current) => [...current, { kind: 'site', label: '' }]);
                    }}
                  >
                    Ajouter ＋
                  </button>
                </div>
                {resources.map((mention, index) => (
                  <div className="admin-repeater-card" key={index}>
                    <div className="admin-repeater-heading">
                      <span className="label">Ressource {String(index + 1)}</span>
                      <button
                        type="button"
                        className="admin-repeater-remove"
                        onClick={() => {
                          setResources((current) => current.filter((_, i) => i !== index));
                        }}
                      >
                        Retirer
                      </button>
                    </div>
                    <div className="admin-form-grid">
                      <label className="admin-field">
                        <span>Type</span>
                        <select
                          value={mention.kind}
                          onChange={(event) => {
                            setResources((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      kind: event.target
                                        .value as Episode['mentions'][number]['kind'],
                                    }
                                  : item,
                              ),
                            );
                          }}
                        >
                          {MENTION_KINDS.map(({ kind, label }) => (
                            <option value={kind} key={kind}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-field">
                        <span>Temps · secondes</span>
                        <input
                          type="number"
                          min={0}
                          value={mention.at ?? ''}
                          onChange={(event) => {
                            setResources((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      at:
                                        event.target.value === ''
                                          ? undefined
                                          : Number(event.target.value),
                                    }
                                  : item,
                              ),
                            );
                          }}
                        />
                      </label>
                      <label className="admin-field admin-span-2">
                        <span>Nom de la ressource</span>
                        <input
                          value={mention.label}
                          onChange={(event) => {
                            setResources((current) =>
                              current.map((item, i) =>
                                i === index ? { ...item, label: event.target.value } : item,
                              ),
                            );
                          }}
                        />
                      </label>
                      <label className="admin-field admin-span-2">
                        <span>Lien · facultatif</span>
                        <input
                          type="url"
                          inputMode="url"
                          value={mention.url ?? ''}
                          onChange={(event) => {
                            setResources((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? { ...item, url: event.target.value.trim() || undefined }
                                  : item,
                              ),
                            );
                          }}
                        />
                      </label>
                      <label className="admin-field admin-span-2">
                        <span>Note · facultative</span>
                        <input
                          value={mention.note ?? ''}
                          onChange={(event) => {
                            setResources((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? { ...item, note: event.target.value || undefined }
                                  : item,
                              ),
                            );
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ))}
                {resources.length === 0 ? (
                  <p className="admin-help">Aucune ressource ajoutée.</p>
                ) : null}
              </section>
            </details>

            <label className="admin-check admin-span-2">
              <input
                type="checkbox"
                checked={featured}
                onChange={(event) => {
                  setFeatured(event.target.checked);
                }}
              />
              <span>Mettre en avant sur l’accueil</span>
            </label>
            {error ? (
              <p className="admin-error admin-span-2" role="alert">
                {error}
              </p>
            ) : null}
            <p className="admin-help admin-span-2">
              {episode
                ? 'Le brouillon ne modifie pas le site public avant publication.'
                : 'En brouillon, le nouvel épisode reste invisible au public.'}
            </p>
            <div className="admin-save-row admin-span-2">
              <button
                className="btn"
                type="button"
                onClick={() => void save('draft')}
                disabled={pending}
              >
                Enregistrer le brouillon
              </button>
              <button
                className="btn btn-solid"
                type="button"
                onClick={() => void save('publish')}
                disabled={pending}
              >
                Publier l’épisode
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="admin-import-empty">
          <p>
            Commencez par coller une adresse YouTube. L’épisode {String(initialNumber)} et sa fiche
            seront préparés automatiquement.
          </p>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setManualEntry(true);
            }}
          >
            Saisir sans import
          </button>
        </div>
      )}
    </section>
  );
}
