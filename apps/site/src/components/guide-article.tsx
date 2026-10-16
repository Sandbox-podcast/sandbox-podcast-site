import { Text, LocalizedLink as Link, LocalizedDate } from './localization';
import { YouTubeFacade } from './client';
import { Breadcrumbs } from './ui';
import type { Guide } from '@/domain/guides';

/** Gabarit prêt à être monté lorsqu'un premier guide réel aura été validé. */
export function GuideArticle({ guide }: { guide: Guide }) {
  const level = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' }[
    guide.level
  ];
  return (
    <article className="wrap guide-article">
      <Breadcrumbs items={[{ label: 'Guides' }, { label: guide.title }]} />
      <header className="library-heading">
        <div>
          <p className="eyebrow">
            <Text>{guide.audience}</Text> · <Text>{level}</Text> ·{' '}
            <LocalizedDate iso={guide.updatedAt} />
          </p>
          <h1 className="display">
            <Text>{guide.title}</Text>
          </h1>
          <p className="library-description">
            <Text>{guide.outcome}</Text>
          </p>
        </div>
      </header>
      <YouTubeFacade id={guide.youtubeId} title={guide.title} episodeNumber={guide.episodeNumber} />
      <ol className="prose">
        {guide.steps.map((step, index) => (
          <li key={index}>
            <h2>
              <Text>{step.title}</Text>
            </h2>
            <p>
              <Text>{step.text}</Text>
            </p>
          </li>
        ))}
      </ol>
      <section className="prose">
        <h2>
          <Text>Ressources</Text>
        </h2>
        <ul>
          {guide.resources.map((resource) => (
            <li key={resource.url}>
              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                <Text>{resource.label}</Text>
                <span className="sr-only">
                  <Text>(nouvel onglet)</Text>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <Link className="btn btn-solid" href={`/episodes/${guide.episodeNumber}`}>
        <Text>Voir l'épisode complet</Text>
      </Link>
    </article>
  );
}
