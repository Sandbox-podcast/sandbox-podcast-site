import { Text } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { Breadcrumbs } from '@/components/ui';
import { allEpisodes, allTopics } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata({
  title: 'Explorer les podcasts par thème',
  description:
    'Parcourez les épisodes Sandbox par sujet : IA, développement, modèles ouverts et outils.',
  path: '/topics',
});
export default function TopicsPage() {
  const episodes = allEpisodes();
  const topics = allTopics().map((topic) => ({
    topic,
    count: episodes.filter((episode) => episode.topics.includes(topic.slug)).length,
  }));
  return (
    <div className="wrap library-page">
      <Breadcrumbs items={[{ label: 'Podcasts', href: '/episodes' }, { label: 'Thèmes' }]} />
      <header className="library-heading">
        <div>
          <p className="label text-ink-3">
            <Text>{'Explorer la biblioth\u00E8que'}</Text>
          </p>
          <h1 className="display">
            <Text>{'Par th\u00E8me'}</Text>
          </h1>
        </div>
        <p className="library-description">
          <Text>
            {'Retrouvez les \u00E9pisodes qui parlent des sujets qui vous int\u00E9ressent.'}
          </Text>
        </p>
      </header>
      <ul className="topic-catalog">
        <Text>
          {topics.map(({ topic, count }) => (
            <li key={topic.slug}>
              <Link href={`/topics/${topic.slug}`} className="topic-catalog-link">
                <span className="topic-catalog-copy">
                  <span className="topic-catalog-label">
                    <Text>{topic.label}</Text>
                  </span>
                  <span className="topic-catalog-description">
                    <Text>{topic.description}</Text>
                  </span>
                </span>
                <span className="topic-catalog-count">
                  <Text>
                    {count === 0
                      ? 'Épisodes à venir'
                      : `${String(count)} épisode${count === 1 ? '' : 's'}`}
                  </Text>
                  <Text> </Text>
                  <span aria-hidden="true">
                    <Text>{'\u2192'}</Text>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </Text>
      </ul>
    </div>
  );
}
