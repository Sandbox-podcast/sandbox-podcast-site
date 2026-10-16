import { Text, LocalizedLink as Link } from '@/components/localization';
import { PodcastReplays } from '@/components/podcast-replays';
import { siteConfig } from '@/config/site';
import { indexableEpisode } from '@/domain/episode-seo';
import { allEpisodes } from '@/lib/repository';
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';
import { pageMetadata } from '@/lib/seo';
import './podcast.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  await preparePublishedEditorialContent();
  return pageMetadata({
    title: 'Le Talk Show Sandbox : replays et historique',
    description:
      "Un épisode par semaine sur la tech et l'IA. Retrouvez le dernier replay Sandbox et les épisodes précédents.",
    path: '/podcast',
    noindex: !allEpisodes().some(indexableEpisode),
  });
}

export default async function PodcastPage() {
  await preparePublishedEditorialContent();
  return (
    <div className="wrap podcast-page">
      <header className="podcast-heading">
        <div>
          <h1 className="display">
            <Text>Le Talk Show</Text>
          </h1>
          <p>
            <Text>Lou, Loïc et Nico. Un rendez-vous hebdomadaire pour parler d'IA et de tech.</Text>
          </p>
        </div>
        <a
          className="btn"
          href={siteConfig.platforms.youtube}
          target="_blank"
          rel="noopener noreferrer"
          data-analytics-event="youtube_open"
          data-analytics-placement="podcast"
        >
          <Text>S'abonner sur YouTube</Text>
          <span className="sr-only">
            <Text>(nouvel onglet)</Text>
          </span>
        </a>
      </header>
      <PodcastReplays episodes={allEpisodes()} />
      <section className="podcast-format" aria-labelledby="podcast-format-title">
        <h2 id="podcast-format-title">
          <Text>Dans l'émission</Text>
        </h2>
        <dl>
          <div>
            <dt>Le Radar</dt>
            <dd>
              <Text>L'actualité IA et tech.</Text>
            </dd>
          </div>
          <div>
            <dt>Le Build</dt>
            <dd>
              <Text>Nos projets et retours d'expérience.</Text>
            </dd>
          </div>
          <div>
            <dt>Le Clash</dt>
            <dd>
              <Text>Nos débats et nos désaccords.</Text>
            </dd>
          </div>
          <div>
            <dt>La Bêta</dt>
            <dd>
              <Text>Ce qu'on essaie en ce moment.</Text>
            </dd>
          </div>
        </dl>
        <Link href="/about">
          <Text>Rencontrer l'équipe</Text>
        </Link>
      </section>
    </div>
  );
}
