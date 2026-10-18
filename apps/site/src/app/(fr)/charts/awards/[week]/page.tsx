import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Text, LocalizedLink as Link } from '@/components/localization';
import { Breadcrumbs } from '@/components/ui';
import { BadgeGenerator } from '@/components/badge-generator';
import {
  awardPath,
  awardShareContent,
  awardSunday,
  awardWeekSchema,
  badgePath,
  badgeSnippets,
} from '@/domain/badges';
import { weekStart } from '@/domain/weeks';
import { siteConfig } from '@/config/site';
import { readBadgeAwardEdition } from '@/lib/badges-store';
import { pageMetadata } from '@/lib/seo';
import styles from '@/components/badges.module.css';

export const dynamic = 'force-dynamic';
const readEdition = cache(readBadgeAwardEdition);
interface Props {
  params: Promise<{ week: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { week } = await params;
  if (!awardWeekSchema.safeParse(week).success) return {};
  try {
    const award = await readEdition(week);
    if (!award) return {};
    const title = award.withdrawnAt
      ? 'Attribution retirée.'
      : `${award.name} - Sandbox Rising Star ${week}`;
    const metadata = pageMetadata({
      title,
      description: award.withdrawnAt
        ? 'Voir le retrait de cette attribution et sa source historique.'
        : 'La récompense hebdomadaire, son classement source et son badge GitHub AI.',
      path: awardPath(week),
      noindex: Boolean(award.withdrawnAt),
    });
    const { image } = awardShareContent(siteConfig.url, week, award.name);
    return {
      ...metadata,
      openGraph: {
        ...metadata.openGraph,
        images: [{ url: image, width: 1200, height: 630, alt: title }],
      },
      twitter: { ...metadata.twitter, images: [{ url: image, alt: title }] },
    };
  } catch (error) {
    console.error(
      'Sandbox award metadata unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return pageMetadata({
      title: 'Sandbox Rising Star',
      description: 'Récompenses hebdomadaires Sandbox.',
      path: awardPath(week),
      noindex: true,
    });
  }
}

export default async function Page({ params }: Props) {
  const { week } = await params;
  if (!awardWeekSchema.safeParse(week).success) notFound();
  let award: Awaited<ReturnType<typeof readBadgeAwardEdition>>;
  try {
    award = await readEdition(week);
  } catch (error) {
    console.error(
      'Sandbox award edition unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return (
      <article className={`wrap ${styles['awardsPage']}`}>
        <h1>Sandbox Rising Star</h1>
        <p role="alert">
          <Text>{'Cette récompense est temporairement indisponible.'}</Text>
        </p>
        <Link href="/charts/awards">
          <Text>{'Toutes les récompenses'}</Text>
        </Link>
      </article>
    );
  }
  if (!award) notFound();
  return (
    <article className={`wrap ${styles['awardsPage']}`}>
      <Breadcrumbs
        items={[
          { label: 'Classements', href: '/charts' },
          { label: 'Badges & Awards', href: '/charts/awards' },
          { label: week },
        ]}
      />
      <header>
        <p className="sc-label">SANDBOX RISING STAR / {week}</p>
        <h1 className={styles['awardTitle']}>{award.name}</h1>
        <p>
          <Text>{'Récompense historique'}</Text>. GitHub AI.
        </p>
        <p>
          <time dateTime={weekStart(week).toISOString()}>
            {weekStart(week).toISOString().slice(0, 10)}
          </time>{' '}
          - <time dateTime={awardSunday(week)}>{awardSunday(week)}</time>
        </p>
        <Link href={`/charts/project/${award.slug}`}>
          <Text>{'Consulter la fiche du projet'}</Text>
        </Link>
      </header>
      <section
        className={styles['badgeCard']}
        data-award="true"
        aria-labelledby="award-distinction"
      >
        <h2 id="award-distinction">Sandbox Rising Star of the Week</h2>
        {award.withdrawnAt ? (
          <div role="status">
            <p>
              <Text>{'Attribution retirée.'}</Text>
            </p>
            <p>{award.withdrawalReason}</p>
            <time dateTime={award.withdrawnAt}>{award.withdrawnAt.slice(0, 10)}</time>
          </div>
        ) : (
          <>
            <p>
              <Text>{'Premier du classement Rising à la clôture de cette semaine.'}</Text>
            </p>
            <img
              className={styles['awardBadge']}
              src={badgePath(award.githubId, week)}
              alt={`Sandbox Rising Star ${week}: ${award.name}`}
              width={340}
              height={40}
            />
            <BadgeGenerator
              source={badgePath(award.githubId, week)}
              week={week}
              snippets={badgeSnippets(
                siteConfig.url,
                { githubId: award.githubId, slug: award.slug, name: award.name },
                week,
              )}
              share={awardShareContent(siteConfig.url, week, award.name)}
            />
          </>
        )}
      </section>
      <section className={styles['method']} aria-labelledby="award-source">
        <h2 id="award-source">
          <Text>{'Source et attribution'}</Text>
        </h2>
        <p>
          <Text>{'Rang source : '}</Text>#{award.rank}. <Text>{'Score : '}</Text>
          {award.score.toFixed(2)} / 100.
        </p>
        <p>
          <Text>{'Attribué le : '}</Text>
          <time dateTime={award.assignedAt}>{award.assignedAt.slice(0, 10)}</time>.
        </p>
        <p>
          <Text>{"Règle d'attribution : "}</Text>
          {award.ruleVersion}.
        </p>
        <Link href={`/charts/rising/${award.sourceEdition}`}>
          <Text>{"Consulter l'édition source"}</Text> {award.sourceEdition}
        </Link>
        <p>
          <Link href="/charts/awards#badge-criteria">
            <Text>{'Critères et installation'}</Text>
          </Link>
        </p>
      </section>
      <Link href="/charts/awards">
        <Text>{'Toutes les récompenses'}</Text>
      </Link>
    </article>
  );
}
