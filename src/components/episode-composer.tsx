'use client';

import { useState, type SyntheticEvent } from 'react';
import { episodeSchema, type Episode, type Host, type Topic } from '@/domain/schema';
import { parseYouTubeVideoId } from '@/domain/youtube';

interface YouTubeMetadata {
  videoId: string;
  url: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
}

interface Props {
  initialNumber: number;
  hosts: Host[];
  topics: Topic[];
  pending: boolean;
  canDraft: boolean;
  canPublish: boolean;
  onSave: (episode: Episode, action: 'draft' | 'publish') => Promise<void>;
}

function localDateTime(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
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
  hosts,
  topics,
  pending,
  canDraft,
  canPublish,
  onSave,
}: Props) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [metadata, setMetadata] = useState<YouTubeMetadata>();
  const [metadataPending, setMetadataPending] = useState(false);
  const [metadataError, setMetadataError] = useState('');
  const [title, setTitle] = useState('');
  const [dek, setDek] = useState('');
  const [description, setDescription] = useState('');
  const [publishedAt, setPublishedAt] = useState(localDateTime);
  const [durationSec, setDurationSec] = useState('2700');
  const [selectedHosts, setSelectedHosts] = useState<string[]>(hosts[0] ? [hosts[0].slug] : []);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [featured, setFeatured] = useState(false);
  const [chaptersText, setChaptersText] = useState('[]');
  const [mentionsText, setMentionsText] = useState('[]');
  const [sourcesText, setSourcesText] = useState('[]');
  const [error, setError] = useState('');

  async function importYouTube(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMetadataError('');
    setMetadataPending(true);
    try {
      const response = await fetch('/api/admin/youtube-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const result = (await response.json()) as YouTubeMetadata;
      setMetadata(result);
      setTitle(result.title);
      setYoutubeUrl(result.url);
    } catch (reason) {
      setMetadataError(reason instanceof Error ? reason.message : 'Import YouTube impossible.');
    } finally {
      setMetadataPending(false);
    }
  }

  async function save(action: 'draft' | 'publish'): Promise<void> {
    setError('');
    const videoId = parseYouTubeVideoId(youtubeUrl);
    let date: string;
    try {
      date = new Date(publishedAt).toISOString();
    } catch {
      setError('Saisissez une date de publication valide.');
      return;
    }
    const imported = metadata?.videoId === videoId ? metadata : undefined;
    const platforms: Episode['platforms'] = videoId
      ? {
          youtubeId: videoId,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          ...(imported
            ? { youtubeChannel: imported.channel, thumbnailUrl: imported.thumbnailUrl }
            : {}),
        }
      : {};
    let chapters: unknown;
    let mentions: unknown;
    let sources: unknown;
    try {
      chapters = JSON.parse(chaptersText) as unknown;
      mentions = JSON.parse(mentionsText) as unknown;
      sources = JSON.parse(sourcesText) as unknown;
    } catch {
      setError('Vérifiez le JSON des chapitres, des ressources citées et des sources.');
      return;
    }

    const parsed = episodeSchema.safeParse({
      number: initialNumber,
      title,
      dek,
      publishedAt: date,
      durationSec: Number(durationSec),
      description,
      hosts: selectedHosts,
      guests: [],
      topics: selectedTopics,
      chapters,
      mentions,
      sources,
      platforms,
      featured,
      status: action === 'publish' ? 'published' : 'draft',
      charts: [],
      cover: { tone: 1, kicker: `Épisode ${String(initialNumber)}` },
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
          <span className="eyebrow">Ajouter au catalogue</span>
          <h2 id="episode-composer-title">Créer un épisode</h2>
        </div>
        <span className="admin-count">Prochain numéro · {initialNumber}</span>
      </div>

      <form onSubmit={(event) => void importYouTube(event)} className="youtube-import">
        <label className="admin-field">
          <span>Lien de la vidéo YouTube</span>
          <input
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={youtubeUrl}
            onChange={(event) => {
              setYoutubeUrl(event.target.value);
              if (metadata?.url !== event.target.value) setMetadata(undefined);
            }}
            required
          />
        </label>
        <button className="btn" type="submit" disabled={metadataPending || !canDraft}>
          {metadataPending ? 'Import en cours…' : 'Importer les infos'}
        </button>
        {metadataError ? (
          <p className="admin-error" role="alert">
            {metadataError}
          </p>
        ) : null}
        {metadata ? (
          <p className="admin-help" role="status">
            Vidéo importée · {metadata.channel}. La durée reste à saisir manuellement.
          </p>
        ) : null}
      </form>

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
            {hosts.map((host) => (
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
        <fieldset className="admin-field admin-span-2">
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

        <label className="admin-field admin-span-2">
          <span>Chapitres · JSON</span>
          <textarea
            className="admin-json"
            rows={5}
            value={chaptersText}
            onChange={(event) => {
              setChaptersText(event.target.value);
            }}
            spellCheck={false}
          />
          <small>
            Exemple : <code>{`[{"at":0,"title":"Introduction"}]`}</code>
          </small>
        </label>
        <label className="admin-field">
          <span>Ressources citées · JSON</span>
          <textarea
            className="admin-json"
            rows={7}
            value={mentionsText}
            onChange={(event) => {
              setMentionsText(event.target.value);
            }}
            spellCheck={false}
          />
          <small>
            Champs : <code>kind</code>, <code>label</code>, <code>url</code>, <code>at</code> en
            secondes et <code>note</code>.
          </small>
        </label>
        <label className="admin-field">
          <span>Sources et annexes · JSON</span>
          <textarea
            className="admin-json"
            rows={7}
            value={sourcesText}
            onChange={(event) => {
              setSourcesText(event.target.value);
            }}
            spellCheck={false}
          />
          <small>
            Champs : <code>kind</code>, <code>label</code>, <code>url</code> et, si besoin,{' '}
            <code>publisher</code>.
          </small>
        </label>

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
        <div className="admin-save-row admin-span-2">
          <span className="admin-help">En brouillon, l’épisode reste invisible au public.</span>
          <button
            className="btn"
            type="button"
            onClick={() => void save('draft')}
            disabled={pending || !canDraft}
          >
            Enregistrer le brouillon
          </button>
          <button
            className="btn btn-solid"
            type="button"
            onClick={() => void save('publish')}
            disabled={pending || !canPublish}
          >
            Publier l’épisode
          </button>
        </div>
      </div>
    </section>
  );
}
