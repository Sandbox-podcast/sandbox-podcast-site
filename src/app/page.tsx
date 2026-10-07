import Link from 'next/link';
import { EpisodeCard, EpisodeCover, MiniChart } from '@/components/cards';
import { siteConfig } from '@/config/site';
import { formatDateShort, formatDuration } from '@/domain/format';
import { shortWeek } from '@/domain/weeks';
import { allCharts, allEpisodes, allTopics, getHost, latestWeek } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';

export async function generateMetadata() {
  await preparePublishedEditorialContent();
  return pageMetadata({
    title: `${siteConfig.name} : ${siteConfig.tagline}`,
    description: siteConfig.description,
    path: '/',
    ownImage: true,
  });
}

export default function HomePage() {
  const episodes = allEpisodes().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const featured = episodes.find((episode) => episode.featured) ?? episodes[0];
  const otherEpisodes = episodes.filter((episode) => episode.number !== featured?.number);
  const charts = allCharts();
  const week = latestWeek();

  return (
    <div className="wrap media-home">
      {featured ? (
        <section className="featured-episode" aria-labelledby="featured-title">
          <div className="featured-episode-copy">
            <p className="label featured-kicker">
              <span className="tag tag-hl">À la une</span>
              <span>Épisode {featured.number}</span>
              <span>{formatDateShort(featured.publishedAt)}</span>
            </p>
            <h1 id="featured-title" className="display featured-title">
              {featured.title}
            </h1>
            <p className="featured-dek">{featured.dek}</p>
            <p className="label featured-meta">
              {formatDuration(featured.durationSec)} ·{' '}
              {featured.hosts.map((slug) => getHost(slug).name).join(' · ')}
            </p>
            <div className="featured-actions">
              <Link href={`/episodes/${String(featured.number)}`} className="btn btn-solid">
                <span aria-hidden="true">▶</span> Voir l’épisode
              </Link>
              <Link href="/episodes" className="btn">
                Tous les podcasts
              </Link>
            </div>
          </div>
          <Link
            href={`/episodes/${String(featured.number)}`}
            className="featured-episode-art"
            aria-label={`Voir l’épisode ${String(featured.number)} : ${featured.title}`}
          >
            <EpisodeCover episode={featured} showTitle={false} />
            <span className="featured-play" aria-hidden="true">
              ▶
            </span>
          </Link>
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
          <div className="episode-rail">
            {episodes.map((episode) => (
              <EpisodeCard key={episode.number} episode={episode} />
            ))}
          </div>
        ) : (
          <p className="empty-note">Aucun épisode publié pour le moment.</p>
        )}
      </section>

      {allTopics().map((topic) => {
        const topicEpisodes = otherEpisodes.filter((episode) =>
          episode.topics.includes(topic.slug),
        );
        if (topicEpisodes.length === 0) return null;
        return (
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
            <div className="episode-rail">
              {topicEpisodes.map((episode) => (
                <EpisodeCard key={episode.number} episode={episode} />
              ))}
            </div>
          </section>
        );
      })}

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
        <div className="ranking-mini-grid">
          {charts.map((chart) => (
            <MiniChart key={chart.slug} chart={chart.slug} week={week} top={3} />
          ))}
        </div>
      </section>
    </div>
  );
}
