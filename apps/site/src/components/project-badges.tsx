import { badgePath, badgeSnippets, emptyRanking } from '@/domain/badges';
import { siteConfig } from '@/config/site';
import { readRankingBadge } from '@/lib/badges-store';
import { readPublicAwards } from '@/lib/awards-store';
import { AwardCard } from './award-card';
import { BadgeGenerator } from './badge-generator';
import { LocalizedLink as Link, Text } from './localization';
import styles from './badges.module.css';

export async function ProjectBadges({
  project,
}: {
  project: { githubId: number; name: string; slug: string };
}) {
  const [rankingResult, awardsResult] = await Promise.allSettled([
    readRankingBadge(String(project.githubId)),
    readPublicAwards({ githubId: project.githubId, limit: 21 }),
  ]);
  const eligibility =
    rankingResult.status === 'fulfilled'
      ? rankingResult.value.eligibility
      : emptyRanking('unavailable');
  const awards = awardsResult.status === 'fulfilled' ? awardsResult.value.slice(0, 20) : [];
  const rankingMessage =
    eligibility.status === 'ranked'
      ? 'Ce projet figure dans le Top 100 GitHub AI de Sandbox.'
      : eligibility.status === 'stale'
        ? 'Le dernier classement est trop ancien pour afficher un badge actif.'
        : eligibility.status === 'pending'
          ? "Aucune édition GitHub n'est encore publiée."
          : eligibility.status === 'unavailable'
            ? 'Les données de classement sont temporairement indisponibles.'
            : 'Ce projet ne fait pas actuellement partie du Top 100.';
  return (
    <section id="badges" className={styles['section']} aria-labelledby="project-badges-title">
      <div className={styles['heading']}>
        <div>
          <p className="sc-label">SANDBOX BADGES &amp; AWARDS</p>
          <h2 id="project-badges-title">
            <Text>{'Les distinctions du projet'}</Text>
          </h2>
        </div>
        <Link href="/charts/awards">
          <Text>{'Critères et installation'}</Text>
        </Link>
      </div>
      <article className={styles['badgeCard']}>
        <div className={styles['badgeHeading']}>
          <h3>Sandbox Top 100</h3>
          <span className={styles['kind']}>
            <Text>{'Classement dynamique'}</Text>
          </span>
        </div>
        <p>
          <Text>{rankingMessage}</Text>
        </p>
        {eligibility.asOf ? (
          <p className={styles['date']}>
            <Text>{'Dernière édition : '}</Text>
            {eligibility.edition}. <Text>{'Mesures : '}</Text>
            <time dateTime={eligibility.asOf}>{eligibility.asOf.slice(0, 10)}</time>.
          </p>
        ) : null}
        {eligibility.status === 'ranked' ? (
          <BadgeGenerator
            snippets={badgeSnippets(siteConfig.url, project)}
            source={badgePath(project.githubId)}
          />
        ) : null}
        <p className={styles['note']}>
          <Text>
            {
              'Le rang suit les éditions publiées. Le badge devient neutre si le projet sort du Top 100 ou si les données ont plus de 48 heures.'
            }
          </Text>
        </p>
      </article>
      {awards.map((award) => (
        <AwardCard key={award.id} award={award} generator />
      ))}
      {awardsResult.status === 'fulfilled' && awardsResult.value.length > 20 ? (
        <Link href="/charts/awards#award-history">
          <Text>{'Toutes les récompenses'}</Text>
        </Link>
      ) : null}
      {!awards.length ? (
        <p className={styles['note']}>
          <Text>
            {awardsResult.status === 'rejected'
              ? "L'historique des Awards est temporairement indisponible."
              : "Ce projet n'a pas encore reçu de récompense."}
          </Text>
        </p>
      ) : null}
    </section>
  );
}
