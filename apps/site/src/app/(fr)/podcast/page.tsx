import { Text, LocalizedLink as Link } from '@/components/localization';
import { PodcastReplays } from '@/components/podcast-replays';
import { siteConfig } from '@/config/site';
import { indexableEpisode } from '@/domain/episode-seo';
import { allEpisodes } from '@/lib/repository';
import { preparePublicEditorialContent } from '@/lib/admin-persistence';
import { pageMetadata } from '@/lib/seo';
import './podcast.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  await preparePublicEditorialContent();
  return pageMetadata({
    title: 'Podcast IA : engineering, produit et équipes tech | SANDBOX',
    description:
      "Regarde SANDBOX : deux développeurs et un Product Manager confrontent leurs essais et leurs points de vue sur l'IA dans les produits et les équipes tech.",
    path: '/podcast',
    noindex: !allEpisodes().some(indexableEpisode),
  });
}

export default async function PodcastPage() {
  await preparePublicEditorialContent();
  return (
    <div className="wrap podcast-page">
      <header className="podcast-heading">
        <div>
          <h1 className="display">
            <Text>L'IA dans notre travail, en discussion.</Text>
          </h1>
          <p>
            <Text>
              Dans SANDBOX, nous discutons de l'IA dans les produits et les équipes tech. Lou,
              Nicolas et Loïc y confrontent leurs expériences, leurs essais et leurs désaccords.
              Regarde les replays et retrouve les ressources citées pour poursuivre tes propres
              recherches.
            </Text>
          </p>
          <p className="label mt-3">
            <Text>Vidéos en français.</Text>
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
              <Text>Les annonces et leurs conséquences pour notre travail.</Text>
            </dd>
          </div>
          <div>
            <dt>Le Build</dt>
            <dd>
              <Text>Nos projets, nos essais et ce que nous en apprenons.</Text>
            </dd>
          </div>
          <div>
            <dt>Le Clash</dt>
            <dd>
              <Text>Les points sur lesquels nos expériences et nos convictions divergent.</Text>
            </dd>
          </div>
          <div>
            <dt>La Bêta</dt>
            <dd>
              <Text>Les technologies et les usages que nous voulons explorer.</Text>
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
