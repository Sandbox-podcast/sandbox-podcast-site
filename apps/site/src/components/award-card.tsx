import { siteConfig } from '@/config/site';
import {
  AWARD_CAMPAIGNS,
  AWARD_DEFINITIONS,
  assignedAwardBadgePath,
  assignedAwardPath,
  assignedAwardShare,
  assignedAwardSnippets,
  awardEntityPath,
  awardSourcePath,
} from '@/domain/awards';
import { awardPath, awardShareContent, badgePath, badgeSnippets } from '@/domain/badges';
import type { PublicAward } from '@/lib/awards-store';
import { BadgeGenerator } from './badge-generator';
import { LocalizedLink as Link, Text } from './localization';
import styles from './badges.module.css';

export function AwardCard({
  award,
  generator = false,
}: {
  award: PublicAward;
  generator?: boolean;
}) {
  const definition = AWARD_DEFINITIONS[award.type];
  const legacy = award.type === 'rising-star' && award.githubId !== null;
  const path = legacy ? awardPath(award.period) : assignedAwardPath(award.id);
  const source =
    legacy && award.githubId !== null
      ? badgePath(award.githubId, award.period)
      : assignedAwardBadgePath(award.id);
  const snippets =
    legacy && award.githubId !== null
      ? badgeSnippets(siteConfig.url, { ...award, githubId: award.githubId }, award.period)
      : assignedAwardSnippets(siteConfig.url, award);
  const share = legacy
    ? awardShareContent(siteConfig.url, award.period, award.name)
    : assignedAwardShare(siteConfig.url, award);
  return (
    <article className={styles['badgeCard']} data-award="true" id={`award-${award.id}`}>
      {legacy ? <span id={`award-${award.period}`} /> : null}
      <div className={styles['badgeHeading']}>
        <h3>
          <Link href={path}>{award.name}</Link>
        </h3>
        <span className={styles['kind']}>
          {award.period}
          {award.scope ? ` / ${award.scope}` : ''}
        </span>
      </div>
      <p>
        {definition.name}. <Text>{'Récompense historique'}</Text>.
      </p>
      {award.withdrawnAt ? (
        <div role="status">
          <p>
            <Text>{'Attribution retirée.'}</Text> {award.withdrawalReason}
          </p>
          <time dateTime={award.withdrawnAt}>{award.withdrawnAt.slice(0, 10)}</time>
        </div>
      ) : (
        <>
          <img className={styles['awardBadge']} src={source} alt={snippets.alt} loading="lazy" />
          {generator ? (
            <BadgeGenerator
              source={source}
              snippets={snippets}
              share={share}
              campaign={AWARD_CAMPAIGNS[award.type]}
              period={award.period}
              {...(legacy ? { week: award.period } : {})}
            />
          ) : null}
        </>
      )}
      <AwardFacts award={award} />
      <p>
        <Link href={awardSourcePath(award)}>
          <Text>{"Consulter l'édition source"}</Text> {award.sourceEdition}
        </Link>
      </p>
      {!generator ? (
        <Link href={`${awardEntityPath(award)}#award-${award.id}`}>
          <Text>{'Obtenir mon badge'}</Text>
        </Link>
      ) : null}
      <small>
        <Text>{"Règle d'attribution : "}</Text>
        {award.ruleVersion}. <Text>{'Attribué le : '}</Text>
        <time dateTime={award.assignedAt}>{award.assignedAt.slice(0, 10)}</time>.
      </small>
    </article>
  );
}

export function AwardFacts({ award }: { award: PublicAward }) {
  return (
    <p>
      {award.chart.toUpperCase()}. <Text>{'Rang source : '}</Text>#{award.rank}.{' '}
      <Text>{'Score : '}</Text>
      {award.score.toFixed(2)} / 100.
      {award.facts.rankGain ? (
        <>
          {' '}
          <Text>{'Places gagnées : '}</Text>
          {award.facts.rankGain}. <Text>{'Rang précédent : '}</Text>#{award.facts.previousRank}.
        </>
      ) : null}
      {award.facts.firstPlaces ? (
        <>
          {' '}
          <Text>{'Premières places sur la période : '}</Text>
          {award.facts.firstPlaces}.
        </>
      ) : null}
    </p>
  );
}
