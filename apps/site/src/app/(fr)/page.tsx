import Link from 'next/link';
import Image from 'next/image';
import { EpisodeCard, EpisodeCover } from '@/components/cards';
import { EpisodeRail } from '@/components/episode-rail';
import { ChartsMini } from '@/components/charts-mini';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { JsonLd } from '@/components/json-ld';
import { isMock, siteConfig } from '@/config/site';
import { episodeArtwork } from '@/domain/episode-artwork';
import { formatDateShort, formatDuration } from '@/domain/format';
import { shortWeek } from '@/domain/weeks';
import { allEpisodes, allTopics, getHost, getTopic } from '@/lib/repository';
import { absoluteUrl, pageMetadata } from '@/lib/seo';
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';

const LATEST_EPISODES_LIMIT = 12;
const TOPIC_EPISODES_LIMIT = 8;

export async function generateMetadata() {
  await preparePublishedEditorialContent();
  return pageMetadata({
    title: `${siteConfig.name} — Podcasts vidéo, sources et classements tech`,
    description: siteConfig.description,
    path: '/',
    ownImage: true,
  });
}

export default async function HomePage() {
  const episodes = allEpisodes().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const featured = episodes.find((episode) => episode.featured) ?? episodes[0];
  const featuredArtwork = featured ? episodeArtwork(featured) : undefined;
  const topicRails = allTopics()
    .map((topic) => ({
      topic,
      episodes: episodes
        .filter((episode) => episode.topics.includes(topic.slug))
        .slice(0, TOPIC_EPISODES_LIMIT),
    }))
    .filter(({ episodes: items }) => items.length > 1);
  const charts = await sandboxChartsData();
  const week = charts.week;

  return (
    <div className="wrap media-home">
      {featured ? (
        <section className="featured-episode" aria-labelledby="featured-title">
          <div className="featured-episode-backdrop" aria-hidden="true">
            {featuredArtwork ? (
              <Image
                src={featuredArtwork}
                alt=""
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 80rem) 100vw, 90rem"
                className="featured-episode-image"
              />
            ) : (
              <EpisodeCover episode={featured} showTitle={false} />
            )}
          </div>
          <div className="featured-episode-shade" aria-hidden="true" />
          <div className="featured-episode-copy">
            <p className="label featured-kicker">
              <span className="tag tag-hl">À la une</span>
              <span>Sandbox · le podcast</span>
            </p>
            <h1 id="featured-title" className="display featured-title">
              {featured.title}
            </h1>
            <p className="label featured-meta">
              <span>Épisode {featured.number}</span>
              <span>{formatDateShort(featured.publishedAt)}</span>
              <span>{formatDuration(featured.durationSec)}</span>
            </p>
            <p className="featured-dek">{featured.dek}</p>
            {!isMock ? (
              <p className="featured-hosts">
                Avec {featured.hosts.map((slug) => getHost(slug).name).join(', ')}
              </p>
            ) : null}
            <div className="featured-actions">
              <Link href={`/episodes/${String(featured.number)}`} className="btn btn-solid">
                <span aria-hidden="true">▶</span> Découvrir l’épisode
              </Link>
              <Link href="/episodes" className="btn">
                Tous les podcasts
              </Link>
            </div>
            <p className="featured-topics label">
              {featured.topics.slice(0, 3).map((slug) => (
                <Link href={`/topics/${slug}`} key={slug}>
                  {getTopic(slug).label}
                </Link>
              ))}
            </p>
          </div>
        </section>
      ) : (
        <section className="empty-library" aria-labelledby="empty-library-title">
          <p className="eyebrow">Sandbox · Podcasts</p>
          <h1 id="empty-library-title" className="display">
            Les prochains épisodes arrivent ici.
          </h1>
        </section>
      )}

      <section className="media-shelf" aria-labelledby="new-episodes-title">
        <div className="media-shelf-heading">
          <div>
            <p className="label text-ink-3">La bibliothèque</p>
            <h2 id="new-episodes-title" className="section-title">
              Derniers épisodes
            </h2>
          </div>
          <Link href="/episodes" className="shelf-link">
            Tout voir <span aria-hidden="true">→</span>
          </Link>
        </div>
        {episodes.length > 0 ? (
          <EpisodeRail id="latest-episode-rail" label="les derniers épisodes">
            {episodes.slice(0, LATEST_EPISODES_LIMIT).map((episode) => (
              <EpisodeCard key={episode.number} episode={episode} />
            ))}
          </EpisodeRail>
        ) : (
          <p className="empty-note">Aucun épisode publié pour le moment.</p>
        )}
      </section>

      {topicRails.map(({ topic, episodes: topicEpisodes }) => (
        <section className="media-shelf" aria-labelledby={`topic-${topic.slug}`} key={topic.slug}>
          <div className="media-shelf-heading">
            <div>
              <p className="label text-ink-3">Explorer par thème</p>
              <h2 id={`topic-${topic.slug}`} className="section-title">
                {topic.label}
              </h2>
            </div>
            <Link href={`/topics/${topic.slug}`} className="shelf-link">
              Voir la sélection <span aria-hidden="true">→</span>
            </Link>
          </div>
          <EpisodeRail id={`episode-rail-${topic.slug}`} label={topic.label}>
            {topicEpisodes.map((episode) => (
              <EpisodeCard key={episode.number} episode={episode} />
            ))}
          </EpisodeRail>
        </section>
      ))}

      <section className="ranking-shelf" aria-labelledby="ranking-shelf-title">
        <div className="media-shelf-heading">
          <div>
            <p className="label text-ink-3">Semaine {shortWeek(week).slice(1)}</p>
            <h2 id="ranking-shelf-title" className="section-title">
              Les classements
            </h2>
          </div>
          <Link href="/charts" className="shelf-link">
            Voir tous les tops <span aria-hidden="true">→</span>
          </Link>
        </div>
        {charts.mode === 'fixtures' ? (
          <p className="label py-2 text-ink-2">APERÇU LOCAL · FIXTURES DE DÉVELOPPEMENT</p>
        ) : null}
        <div className="ranking-mini-grid">
          {(['github', 'skills', 'models', 'rising'] as const).map((id) => (
            <ChartsMini key={id} data={charts} id={id} />
          ))}
        </div>
      </section>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'PodcastSeries',
            name: siteConfig.name,
            description: siteConfig.description,
            url: absoluteUrl('/'),
            image: absoluteUrl('/opengraph-image'),
            inLanguage: siteConfig.language,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Derniers épisodes Sandbox',
            itemListElement: episodes.slice(0, LATEST_EPISODES_LIMIT).map((episode, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: episode.title,
              url: absoluteUrl(`/episodes/${String(episode.number)}`),
            })),
          },
        ]}
      />
    </div>
  );
}
