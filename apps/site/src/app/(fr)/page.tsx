import { Text } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import Image from 'next/image';
import { EpisodeCard, EpisodeCover } from '@/components/cards';
import { EpisodeRail } from '@/components/episode-rail';
import { ChartsMini } from '@/components/charts-mini';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { JsonLd } from '@/components/json-ld';
import { isMock, siteConfig } from '@/config/site';
import { episodeArtwork } from '@/domain/episode-artwork';
import { formatDateShort, formatDuration } from '@/domain/format';
import { editionMark } from '@/domain/weeks';
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
      <Text>
        {featured ? (
          <section className="featured-episode" aria-labelledby="featured-title">
            <div className="featured-episode-backdrop" aria-hidden="true">
              <Text>
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
              </Text>
            </div>
            <div className="featured-episode-shade" aria-hidden="true" />
            <div className="featured-episode-copy">
              <p className="label featured-kicker">
                <span className="tag tag-hl">
                  <Text>{'\u00C0 la une'}</Text>
                </span>
                <span>
                  <Text>{'Sandbox \u00B7 le podcast'}</Text>
                </span>
              </p>
              <h1 id="featured-title" className="display featured-title">
                <Text>{featured.title}</Text>
              </h1>
              <p className="label featured-meta">
                <span>
                  <Text>{'\u00C9pisode '}</Text>
                  <Text>{featured.number}</Text>
                </span>
                <span>
                  <Text>{formatDateShort(featured.publishedAt)}</Text>
                </span>
                <span>
                  <Text>{formatDuration(featured.durationSec)}</Text>
                </span>
              </p>
              <p className="featured-dek">
                <Text>{featured.dek}</Text>
              </p>
              <Text>
                {!isMock ? (
                  <p className="featured-hosts">
                    <Text>{'Avec '}</Text>
                    <Text>{featured.hosts.map((slug) => getHost(slug).name).join(', ')}</Text>
                  </p>
                ) : null}
              </Text>
              <div className="featured-actions">
                <Link href={`/episodes/${String(featured.number)}`} className="btn btn-solid">
                  <span aria-hidden="true">
                    <Text>{'\u25B6'}</Text>
                  </span>
                  <Text>{' D\u00E9couvrir l\u2019\u00E9pisode'}</Text>
                </Link>
                <Link href="/episodes" className="btn">
                  <Text>{'Tous les podcasts'}</Text>
                </Link>
              </div>
              <p className="featured-topics label">
                <Text>
                  {featured.topics.slice(0, 3).map((slug) => (
                    <Link href={`/topics/${slug}`} key={slug}>
                      <Text>{getTopic(slug).label}</Text>
                    </Link>
                  ))}
                </Text>
              </p>
            </div>
          </section>
        ) : (
          <section className="empty-library" aria-labelledby="empty-library-title">
            <p className="eyebrow">
              <Text>{'Sandbox \u00B7 Podcasts'}</Text>
            </p>
            <h1 id="empty-library-title" className="display">
              <Text>{'Les prochains \u00E9pisodes arrivent ici.'}</Text>
            </h1>
          </section>
        )}
      </Text>

      <section className="media-shelf" aria-labelledby="new-episodes-title">
        <div className="media-shelf-heading">
          <div>
            <p className="label text-ink-3">
              <Text>{'La biblioth\u00E8que'}</Text>
            </p>
            <h2 id="new-episodes-title" className="section-title">
              <Text>{'Derniers \u00E9pisodes'}</Text>
            </h2>
          </div>
          <Link href="/episodes" className="shelf-link">
            <Text>{'Tout voir '}</Text>
            <span aria-hidden="true">
              <Text>{'\u2192'}</Text>
            </span>
          </Link>
        </div>
        <Text>
          {episodes.length > 0 ? (
            <EpisodeRail id="latest-episode-rail" label="les derniers épisodes">
              <Text>
                {episodes.slice(0, LATEST_EPISODES_LIMIT).map((episode) => (
                  <EpisodeCard key={episode.number} episode={episode} />
                ))}
              </Text>
            </EpisodeRail>
          ) : (
            <p className="empty-note">
              <Text>{'Aucun \u00E9pisode publi\u00E9 pour le moment.'}</Text>
            </p>
          )}
        </Text>
      </section>

      <Text>
        {topicRails.map(({ topic, episodes: topicEpisodes }) => (
          <section className="media-shelf" aria-labelledby={`topic-${topic.slug}`} key={topic.slug}>
            <div className="media-shelf-heading">
              <div>
                <p className="label text-ink-3">
                  <Text>{'Explorer par th\u00E8me'}</Text>
                </p>
                <h2 id={`topic-${topic.slug}`} className="section-title">
                  <Text>{topic.label}</Text>
                </h2>
              </div>
              <Link href={`/topics/${topic.slug}`} className="shelf-link">
                <Text>{'Voir la s\u00E9lection '}</Text>
                <span aria-hidden="true">
                  <Text>{'\u2192'}</Text>
                </span>
              </Link>
            </div>
            <EpisodeRail id={`episode-rail-${topic.slug}`} label={topic.label}>
              <Text>
                {topicEpisodes.map((episode) => (
                  <EpisodeCard key={episode.number} episode={episode} />
                ))}
              </Text>
            </EpisodeRail>
          </section>
        ))}
      </Text>

      <section className="ranking-shelf" aria-labelledby="ranking-shelf-title">
        <div className="media-shelf-heading">
          <div>
            <p className="label text-ink-3">
              <Text>{'Semaine '}</Text>
              <Text>{editionMark(week)}</Text>
            </p>
            <h2 id="ranking-shelf-title" className="section-title">
              <Text>{'Les classements'}</Text>
            </h2>
          </div>
          <Link href="/charts" className="shelf-link">
            <Text>{'Voir tous les tops '}</Text>
            <span aria-hidden="true">
              <Text>{'\u2192'}</Text>
            </span>
          </Link>
        </div>
        <Text>
          {charts.mode === 'fixtures' ? (
            <p className="label py-2 text-ink-2">
              <Text>{'APER\u00C7U LOCAL \u00B7 FIXTURES DE D\u00C9VELOPPEMENT'}</Text>
            </p>
          ) : null}
        </Text>
        <div className="ranking-mini-grid">
          <Text>
            {(['github', 'skills', 'models', 'rising'] as const).map((id) => (
              <ChartsMini key={id} data={charts} id={id} />
            ))}
          </Text>
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
