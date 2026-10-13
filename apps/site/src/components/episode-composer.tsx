'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { z } from 'zod';
import { episodeSchema, type Episode, type Host, type Topic } from '@/domain/schema';
import { episodeArtwork } from '@/domain/episode-artwork';
import { MENTION_KINDS } from '@/domain/kinds';
import { parseYouTubeVideoId } from '@/domain/youtube';
import { mergeDescriptionResources } from '@/domain/episode-resources';
import { episodeChapters } from '@/domain/episode-presentation';
import { createEpisodeFromYouTube } from '@/domain/episode-import';
import { parseYouTubeDescription } from '@/domain/youtube';
import { formatDuration, formatDurationExact } from '@/domain/format';
import { EpisodeDescription } from './episode-description';
import { YouTubeDurationProbe } from './youtube-duration-probe';

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
const uploadedThumbnailSchema = z.object({
  path: z.string().regex(/^\/api\/episode-thumbnails\/[a-f0-9]{64}\.webp$/),
  width: z.number().int().min(1280),
  height: z.number().int().min(720),
});

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
  const autoDescription = useRef<string | undefined>(undefined);
  const [metadata, setMetadata] = useState<YouTubeMetadata>();
  const [metadataPending, setMetadataPending] = useState(false);
  const [metadataError, setMetadataError] = useState('');
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
  const [chapters, setChapters] = useState<Episode['chapters']>(
    episode ? episodeChapters(episode) : [],
  );
  const [resources, setResources] = useState<Episode['mentions']>(() =>
    mergeDescriptionResources(
      [
        ...(episode?.mentions ?? []),
        ...(episode?.sources ?? []).map((source) => ({
          kind: source.kind,
          label: source.label,
          url: source.url,
          note: source.publisher,
        })),
      ],
      episode?.description ?? '',
      episode?.platforms.youtubeId,
    ),
  );
  const [spotifyUrl, setSpotifyUrl] = useState(episode?.platforms.spotifyUrl ?? '');
  const [appleUrl, setAppleUrl] = useState(episode?.platforms.appleUrl ?? '');
  const [uploadedArtworkPath, setUploadedArtworkPath] = useState(
    episode?.cover.uploadedArtworkPath,
  );
  const [thumbnailPending, setThumbnailPending] = useState(false);
  const [thumbnailError, setThumbnailError] = useState('');
  const [thumbnailMessage, setThumbnailMessage] = useState('');
  const [error, setError] = useState('');
  const currentVideoId = parseYouTubeVideoId(youtubeUrl);
  const needsDurationProbe =
    currentVideoId &&
    ((metadata?.source === 'oembed' && metadata.videoId === currentVideoId) ||
      (episode?.platforms.youtubeId === currentVideoId &&
        (metadata?.videoId !== currentVideoId || metadata.source === 'oembed')));
  const previewArtwork = episodeArtwork({
    cover: {
      ...(episode?.cover ?? { tone: 1, kicker: `Épisode ${String(initialNumber)}` }),
      uploadedArtworkPath,
    },
    platforms: {
      youtubeId: currentVideoId,
      thumbnailUrl:
        currentVideoId && metadata?.videoId === currentVideoId
          ? metadata.thumbnailUrl
          : currentVideoId && episode?.platforms.youtubeId === currentVideoId
            ? episode.platforms.thumbnailUrl
            : undefined,
    },
  });
  const duplicateEpisode = otherEpisodes.find(
    (candidate) =>
      candidate.number !== episode?.number &&
      candidate.platforms.youtubeId &&
      candidate.platforms.youtubeId === parseYouTubeVideoId(youtubeUrl),
  );
  const requiresHostSelection = !hosts.some(
    (host) => host.slug === defaultHostSlug && !host.placeholder,
  );
  const missingFields = [
    !title.trim() && 'titre',
    !dek.trim() && 'résumé',
    !description.trim() && 'description',
    !publishedAt && 'date',
    (!durationSec || Number(durationSec) < 60) && 'durée',
    [...chapters, ...parseYouTubeDescription(description).chapters].some(
      (chapter) => chapter.at >= Number(durationSec),
    ) && 'durée YouTube incohérente avec les chapitres',
    selectedHosts.length === 0 && 'animateur',
  ].filter((value): value is string => typeof value === 'string');

  function changeYouTubeUrl(value: string): void {
    setYoutubeUrl(value);
    const videoId = parseYouTubeVideoId(value);
    if (videoId !== latestVideoId.current) {
      setUploadedArtworkPath(undefined);
      setThumbnailMessage('');
    }
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
      if (newVideo) {
        setUploadedArtworkPath(undefined);
        setThumbnailMessage('');
      }
      lastImportedVideoId.current = result.videoId;
      setMetadata(result);
      setTitle(result.title);
      setYoutubeUrl(result.url);
      if (newVideo || result.summary) setDek(result.summary ?? '');
      if (episode) {
        if (newVideo || result.description) setDescription(result.description ?? '');
      } else {
        setDescription((current) => {
          if (current.trim() && current !== autoDescription.current) return current;
          autoDescription.current = result.description ?? '';
          return result.description ?? '';
        });
      }
      if (newVideo || result.publishedAt)
        setPublishedAt(result.publishedAt ? localDateTime(result.publishedAt) : '');
      if (newVideo || result.durationSec)
        setDurationSec(
          result.durationSec && result.durationSec >= 60 ? String(result.durationSec) : '',
        );
      if (newVideo || result.chapters?.length) setChapters(result.chapters ?? []);
      const importedResources = result.resources?.map((resource) => ({
        ...resource,
        origin: 'description' as const,
      }));
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

  async function uploadThumbnail(file: File): Promise<void> {
    setThumbnailError('');
    setThumbnailMessage('');
    if (file.size > 5_000_000) {
      setThumbnailError('La miniature doit faire au plus 5 Mo.');
      return;
    }
    setThumbnailPending(true);
    try {
      const response = await fetch('/api/admin/episode-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const result = uploadedThumbnailSchema.parse(await response.json());
      setUploadedArtworkPath(result.path);
      setThumbnailMessage(
        `Miniature ${String(result.width)} × ${String(result.height)} prête. Enregistrez le brouillon ou publiez l’épisode.`,
      );
    } catch (reason) {
      setThumbnailError(
        reason instanceof Error ? reason.message : 'Import de la miniature impossible.',
      );
    } finally {
      setThumbnailPending(false);
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
    if (
      [...chapters, ...parseYouTubeDescription(description).chapters].some(
        (chapter) => chapter.at >= Number(durationSec),
      )
    ) {
      setError(
        'La durée enregistrée est plus courte que les chapitres. Actualisez la vidéo YouTube.',
      );
      return;
    }
    if (!episode) {
      if (!metadata || metadata.videoId !== videoId) {
        setError('Importez la vidéo YouTube avant d’enregistrer.');
        return;
      }
      try {
        const created = createEpisodeFromYouTube({
          number: initialNumber,
          metadata,
          description,
          hosts: selectedHosts,
          status: action === 'publish' ? 'published' : 'draft',
        });
        await onSave(created, action);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Vérifiez la vidéo et sa description.');
      }
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
    const sameVideo = episode.platforms.youtubeId === videoId;
    const platforms: Episode['platforms'] = {
      ...episode.platforms,
      youtubeId: videoId,
      youtubeUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
      youtubeChannel:
        imported?.channel ?? (sameVideo ? episode.platforms.youtubeChannel : undefined),
      thumbnailUrl:
        imported?.thumbnailUrl ?? (sameVideo ? episode.platforms.thumbnailUrl : undefined),
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
      guests: episode.guests,
      topics: selectedTopics,
      chapters,
      mentions: mergeDescriptionResources(resources, description, videoId),
      sources: [],
      platforms,
      featured,
      status: action === 'publish' ? 'published' : episode.status,
      charts: episode.charts,
      cover: {
        ...episode.cover,
        uploadedArtworkPath,
      },
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
              ? `Vidéo importée · ${metadata.channel}. La date et la durée viennent de YouTube.`
              : `Vidéo importée · ${metadata.channel}. La durée est lue automatiquement dans le lecteur ; la date de publication reste celle enregistrée.`}
          </p>
        ) : null}
        {needsDurationProbe && currentVideoId ? (
          <YouTubeDurationProbe
            videoId={currentVideoId}
            onDuration={(value) => {
              setDurationSec(String(value));
              setMetadata((current) =>
                current?.videoId === currentVideoId ? { ...current, durationSec: value } : current,
              );
            }}
          />
        ) : null}
      </form>

      {!episode ? (
        <div className="episode-composer-form">
          <label className="admin-field admin-span-2">
            <span>Description · Markdown</span>
            <textarea
              rows={10}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              placeholder={
                'Présentez l’épisode, puis collez les liens des sources et les chapitres horodatés.\n\n00:00 Introduction\nSource : https://…'
              }
              required
            />
            <small>
              Si YouTube fournit une description, elle est recopiée ici. Vous pouvez la compléter
              avant de publier ; les liens et les horodatages seront extraits automatiquement.
            </small>
          </label>
          <div className="episode-markdown-preview admin-span-2">
            <h3>Aperçu de la description</h3>
            {description.trim() ? (
              <EpisodeDescription markdown={description} />
            ) : (
              <p className="admin-help">
                L’aperçu apparaît dès que vous saisissez une description.
              </p>
            )}
          </div>
          {requiresHostSelection ? (
            <fieldset className="admin-field admin-span-2">
              <legend>Animateur de l’épisode</legend>
              <div className="admin-check-list">
                {hosts
                  .filter((host) => !host.placeholder)
                  .map((host) => (
                    <label className="admin-check" key={host.slug}>
                      <input
                        type="checkbox"
                        checked={selectedHosts.includes(host.slug)}
                        onChange={() => {
                          toggle(selectedHosts, setSelectedHosts, host.slug);
                        }}
                      />
                      <span>{host.name}</span>
                    </label>
                  ))}
              </div>
            </fieldset>
          ) : null}
          <div className="episode-readiness admin-span-2" role="status">
            <strong>Épisode {String(initialNumber)}</strong>
            <span>
              {metadata?.source === 'youtube-data-api' &&
              metadata.durationSec &&
              metadata.publishedAt
                ? `${metadata.title} · ${formatDuration(metadata.durationSec)} · ${new Date(metadata.publishedAt).toLocaleDateString('fr-FR')}`
                : 'Collez l’URL pour récupérer le titre, la date et la durée depuis YouTube.'}
            </span>
          </div>
          {error ? (
            <p className="admin-error admin-span-2" role="alert">
              {error}
            </p>
          ) : null}
          <p className="admin-help admin-span-2">
            Le résumé, les chapitres et les ressources proviennent de cette description. Le
            brouillon reste invisible sur le site jusqu’à sa publication.
          </p>
          <div className="admin-save-row admin-span-2">
            <button
              className="btn"
              type="button"
              onClick={() => void save('draft')}
              disabled={pending || metadataPending}
            >
              Enregistrer le brouillon
            </button>
            <button
              className="btn btn-solid"
              type="button"
              onClick={() => void save('publish')}
              disabled={pending || metadataPending}
            >
              Publier l’épisode
            </button>
          </div>
        </div>
      ) : (
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
            <div className="admin-thumbnail admin-span-2">
              <div>
                <h3>Miniature de l’épisode</h3>
                <p className="admin-help">
                  Le site utilise la meilleure image YouTube disponible. Vous pouvez la remplacer
                  par votre fichier 16:9, au moins 1280 × 720 px, JPEG, PNG ou WebP, 5 Mo maximum.
                </p>
                <label className="admin-field">
                  <span>Importer une miniature haute définition</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={thumbnailPending || pending}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = '';
                      if (file) void uploadThumbnail(file);
                    }}
                  />
                </label>
                {uploadedArtworkPath ? (
                  <button
                    className="btn"
                    type="button"
                    disabled={thumbnailPending || pending}
                    onClick={() => {
                      setUploadedArtworkPath(undefined);
                      setThumbnailMessage(
                        'Miniature personnalisée retirée. Enregistrez pour utiliser YouTube.',
                      );
                    }}
                  >
                    Revenir à la miniature YouTube
                  </button>
                ) : null}
                {thumbnailPending ? <p role="status">Import de la miniature en cours…</p> : null}
                {thumbnailMessage ? <p role="status">{thumbnailMessage}</p> : null}
                {thumbnailError ? (
                  <p className="admin-error" role="alert">
                    {thumbnailError}
                  </p>
                ) : null}
              </div>
              {previewArtwork ? (
                <Image
                  src={previewArtwork}
                  alt="Aperçu de la miniature de l’épisode"
                  width={480}
                  height={270}
                  sizes="(max-width: 48rem) 100vw, 20rem"
                  className="admin-thumbnail-preview"
                />
              ) : (
                <p className="admin-thumbnail-empty">La miniature apparaîtra ici après l’import.</p>
              )}
            </div>
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
              <span>Description · Markdown</span>
              <textarea
                rows={8}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
                onBlur={(event) => {
                  const markdown = event.currentTarget.value;
                  setResources((current) =>
                    mergeDescriptionResources(current, markdown, currentVideoId),
                  );
                }}
                required
              />
              <small>
                Les liens HTTPS du Markdown sont ajoutés automatiquement aux ressources quand vous
                quittez ce champ ou enregistrez. Les ressources saisies à la main sont conservées.
              </small>
            </label>
            <div className="episode-markdown-preview admin-span-2">
              <h3>Aperçu de la description</h3>
              {description.trim() ? (
                <EpisodeDescription markdown={description} />
              ) : (
                <p className="admin-help">
                  L’aperçu apparaît dès que vous saisissez une description.
                </p>
              )}
            </div>
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
            <div className="admin-field">
              <span>Durée YouTube</span>
              <span className="admin-help">
                {Number(durationSec) >= 60
                  ? formatDurationExact(Number(durationSec))
                  : 'Actualisez la vidéo depuis YouTube pour récupérer sa durée.'}
              </span>
            </div>
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
                      Les liens de la description sont déjà ajoutés ici. Vous pouvez corriger leur
                      nom ou leur type et ajouter d’autres ressources à la main. Retirez un lien du
                      Markdown pour le supprimer de cette liste.
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
                      <span className="label">
                        Ressource {String(index + 1)}
                        {mention.origin === 'description' ? ' · Markdown' : ''}
                      </span>
                      {mention.origin !== 'description' ? (
                        <button
                          type="button"
                          className="admin-repeater-remove"
                          onClick={() => {
                            setResources((current) => current.filter((_, i) => i !== index));
                          }}
                        >
                          Retirer
                        </button>
                      ) : null}
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
                        <span>
                          {mention.origin === 'description'
                            ? 'Lien · modifier dans la description'
                            : 'Lien · facultatif'}
                        </span>
                        <input
                          type="url"
                          inputMode="url"
                          value={mention.url ?? ''}
                          readOnly={mention.origin === 'description'}
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
              Le brouillon ne modifie pas le site public avant publication.
            </p>
            <div className="admin-save-row admin-span-2">
              <button
                className="btn"
                type="button"
                onClick={() => void save('draft')}
                disabled={pending || thumbnailPending}
              >
                Enregistrer le brouillon
              </button>
              <button
                className="btn btn-solid"
                type="button"
                onClick={() => void save('publish')}
                disabled={pending || thumbnailPending}
              >
                Publier l’épisode
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
