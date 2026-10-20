import { EpisodeArtwork } from './episode-artwork';
import { Text, LocalizedLink as Link } from '@/components/localization';
import { JsonLd } from '@/components/json-ld';
import { episodeArtwork } from '@/domain/episode-artwork';
import { verifiedEpisodeDuration } from '@/domain/episode-presentation';
import { formatDateShort, formatDuration } from '@/domain/format';
import type { Episode } from '@/domain/schema';
import { absoluteUrl, siteShareImage } from '@/lib/seo';
import { siteConfig } from '@/config/site';

function ReplayArtwork({ episode, latest = false }: { episode: Episode; latest?: boolean }) {
  const artwork = episodeArtwork(episode);
  return (
    <div className="replay-artwork" data-tone={episode.cover.tone}>
      {artwork ? (
        <EpisodeArtwork
          artwork={artwork}
          videoId={episode.platforms.youtubeId}
          number={episode.number}
          title={episode.title}
          sizes={latest ? '(max-width: 48rem) 100vw, 55vw' : '(max-width: 40rem) 30vw, 12rem'}
          loading={latest ? 'eager' : 'lazy'}
          className="replay-image"
        />
      ) : (
        <span className="display" aria-hidden="true">
          {episode.number}
        </span>
      )}
    </div>
  );
}

function ReplayMeta({ episode }: { episode: Episode }) {
  const duration = verifiedEpisodeDuration(episode);
  return (
    <p className="label replay-meta">
      <span>
        <Text>Épisode {episode.number}</Text>
      </span>
      <time dateTime={episode.publishedAt}>
        <Text>{formatDateShort(episode.publishedAt)}</Text>
      </time>
      {duration !== undefined ? (
        <span>
          <Text>{formatDuration(duration)}</Text>
        </span>
      ) : null}
    </p>
  );
}

export function PodcastReplays({ episodes }: { episodes: readonly Episode[] }) {
  const sorted = episodes.toSorted(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.number - a.number,
  );
  const [latest, ...previous] = sorted;
  if (!latest)
    return (
      <section className="empty-state">
        <h2>
          <Text>Aucun replay pour le moment.</Text>
        </h2>
        <p>
          <Text>Le premier épisode sera disponible ici.</Text>
        </p>
      </section>
    );
  return (
    <>
      <section className="latest-replay" aria-labelledby="latest-replay-title">
        <Link
          href={`/episodes/${String(latest.number)}`}
          className="latest-replay-artwork"
          aria-label={latest.title}
        >
          <ReplayArtwork episode={latest} latest />
        </Link>
        <div className="latest-replay-copy">
          <p className="eyebrow">
            <Text>Dernier replay</Text>
          </p>
          <ReplayMeta episode={latest} />
          <h2 id="latest-replay-title">
            <Link href={`/episodes/${String(latest.number)}`}>
              <Text>{latest.title}</Text>
            </Link>
          </h2>
          <p className="replay-dek">
            <Text>{latest.dek}</Text>
          </p>
          <Link href={`/episodes/${String(latest.number)}`} className="btn btn-solid">
            <Text>Voir le replay</Text>
          </Link>
        </div>
      </section>
      {previous.length > 0 ? (
        <section className="replay-history" aria-labelledby="replay-history-title">
          <h2 id="replay-history-title" className="section-title">
            <Text>Épisodes précédents</Text>
          </h2>
          <ol className="replay-list">
            {previous.map((episode) => (
              <li key={episode.number}>
                <Link href={`/episodes/${String(episode.number)}`} className="replay-row">
                  <ReplayArtwork episode={episode} />
                  <div>
                    <ReplayMeta episode={episode} />
                    <h3>
                      <Text>{episode.title}</Text>
                    </h3>
                    <span className="replay-row-action">
                      <Text>Voir le replay</Text>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'PodcastSeries',
            name: siteConfig.name,
            description: siteConfig.description,
            url: absoluteUrl('/podcast'),
            image: siteShareImage().url,
            inLanguage: siteConfig.language,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Replays Sandbox',
            itemListElement: sorted.map((episode, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: episode.title,
              url: absoluteUrl(`/episodes/${String(episode.number)}`),
            })),
          },
        ]}
      />
    </>
  );
}
