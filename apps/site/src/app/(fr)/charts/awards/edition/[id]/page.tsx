import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { AwardCard } from '@/components/award-card';
import { Breadcrumbs } from '@/components/ui';
import { Text, LocalizedLink as Link } from '@/components/localization';
import {
  AWARD_DEFINITIONS,
  AWARD_RULE_DESCRIPTIONS,
  assignedAwardPath,
  assignedAwardShare,
  awardAssignmentIdSchema,
  awardEntityPath,
  awardPeriodBounds,
} from '@/domain/awards';
import { readPublicAward } from '@/lib/awards-store';
import { pageMetadata } from '@/lib/seo';
import styles from '@/components/badges.module.css';

export const dynamic = 'force-dynamic';
const readAward = cache(readPublicAward);
interface Props {
  params: Promise<{ id: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!awardAssignmentIdSchema.safeParse(id).success) return {};
  try {
    const award = await readAward(id);
    if (!award) return {};
    const title = award.withdrawnAt
      ? 'Attribution retirée.'
      : `${award.name} - ${AWARD_DEFINITIONS[award.type].name} ${award.period}`;
    const metadata = pageMetadata({
      title,
      description: AWARD_RULE_DESCRIPTIONS[award.type],
      path: assignedAwardPath(id),
      noindex: Boolean(award.withdrawnAt),
    });
    const { image } = assignedAwardShare(siteConfig.url, award);
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
      title: 'Sandbox Awards',
      description: 'Les distinctions Sandbox.',
      path: assignedAwardPath(id),
      noindex: true,
    });
  }
}
export default async function Page({ params }: Props) {
  const { id } = await params;
  if (!awardAssignmentIdSchema.safeParse(id).success) notFound();
  let award: Awaited<ReturnType<typeof readPublicAward>>;
  try {
    award = await readAward(id);
  } catch (error) {
    console.error('Sandbox award unavailable:', error instanceof Error ? error.name : 'unknown');
    return (
      <article className={`wrap ${styles['awardsPage']}`}>
        <h1>Sandbox Awards</h1>
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
  const bounds = awardPeriodBounds(award.type, award.period);
  return (
    <article className={`wrap ${styles['awardsPage']}`}>
      <Breadcrumbs
        items={[
          { label: 'Classements', href: '/charts' },
          { label: 'Badges & Awards', href: '/charts/awards' },
          { label: award.period },
        ]}
      />
      <header>
        <p className="sc-label">
          {AWARD_DEFINITIONS[award.type].name} / {award.period}
          {award.scope ? ` / ${award.scope}` : ''}
        </p>
        <h1 className={styles['awardTitle']}>{award.name}</h1>
        <p>
          <time dateTime={bounds.start}>{bounds.start}</time> -{' '}
          <time dateTime={bounds.end}>{bounds.end}</time>
        </p>
        <Link href={awardEntityPath(award)}>
          <Text>{'Consulter la fiche du lauréat'}</Text>
        </Link>
      </header>
      <AwardCard award={award} generator />
      <section className={styles['method']} aria-labelledby="award-source">
        <h2 id="award-source">
          <Text>{'Source et attribution'}</Text>
        </h2>
        <p>
          <Text>{AWARD_RULE_DESCRIPTIONS[award.type]}</Text>
        </p>
        <p>
          <Text>{'Empreinte des preuves : '}</Text>
          <code className={styles['evidenceHash']}>{award.evidenceHash}</code>
        </p>
        <Link href="/charts/awards#badge-criteria">
          <Text>{'Critères et installation'}</Text>
        </Link>
      </section>
      <Link href="/charts/awards">
        <Text>{'Toutes les récompenses'}</Text>
      </Link>
    </article>
  );
}
