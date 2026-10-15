import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/ui';
import { Text, LocalizedLink as Link } from '@/components/localization';
import { EntityAwards } from '@/components/entity-awards';
import { slugSchema } from '@/domain/schema';
import { awardEntityDetail } from '@/lib/award-entities';
import { pageMetadata } from '@/lib/seo';
import styles from '@/components/badges.module.css';

export const dynamic = 'force-dynamic';
interface Props {
  params: Promise<{ slug: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) return {};
  try {
    const detail = await awardEntityDetail(slug);
    return detail
      ? pageMetadata({
          title: detail.entity.name,
          description:
            detail.entity.description ?? 'Classements officiels et distinctions Sandbox.',
          path: `/charts/entity/${slug}`,
          noindex: false,
        })
      : {};
  } catch (error) {
    console.error(
      'Sandbox entity metadata unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return {};
  }
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) notFound();
  let detail: Awaited<ReturnType<typeof awardEntityDetail>>;
  try {
    detail = await awardEntityDetail(slug);
  } catch (error) {
    console.error('Sandbox entity unavailable:', error instanceof Error ? error.name : 'unknown');
    return (
      <article className={`wrap ${styles['awardsPage']}`}>
        <h1>Sandbox Charts</h1>
        <p role="alert">
          <Text>{'Cette fiche est temporairement indisponible.'}</Text>
        </p>
        <Link href="/charts">
          <Text>{'Classements'}</Text>
        </Link>
      </article>
    );
  }
  if (!detail) notFound();
  if (detail.isGithub) redirect(`/charts/project/${slug}`);
  return (
    <article className={`wrap ${styles['awardsPage']}`}>
      <Breadcrumbs
        items={[{ label: 'Classements', href: '/charts' }, { label: detail.entity.name }]}
      />
      <header>
        <p className="sc-label">SANDBOX / {detail.entity.type.toUpperCase()}</p>
        <h1 className={styles['awardTitle']}>{detail.entity.name}</h1>
        <p>{detail.entity.description}</p>
        <a href={detail.entity.sourceUrl} target="_blank" rel="noopener noreferrer">
          <Text>{'Source officielle'}</Text>
        </a>
      </header>
      <Suspense
        fallback={
          <p role="status">
            <Text>{'Chargement des distinctions.'}</Text>
          </p>
        }
      >
        <EntityAwards entityId={detail.entity.id} />
      </Suspense>
      <section className={styles['method']}>
        <h2>
          <Text>{'Dernières apparitions'}</Text>
        </h2>
        <ol className={styles['winners']}>
          {detail.rankings.map((ranking) => (
            <li className={styles['badgeCard']} key={`${ranking.chart}-${ranking.date}`}>
              <Link
                href={`/charts/${ranking.chart === 'models' ? 'ai-models' : ranking.chart}/${ranking.date}`}
              >
                {ranking.chart.toUpperCase()} / {ranking.date}
              </Link>
              <p>
                <Text>{'Rang source : '}</Text>#{ranking.rank}. <Text>{'Score : '}</Text>
                {ranking.score.toFixed(2)} / 100.
              </p>
              <small>{ranking.scoringVersion}</small>
            </li>
          ))}
        </ol>
      </section>
      {detail.sources.length ? (
        <section>
          <h2>
            <Text>{'Sources'}</Text>
          </h2>
          <ul>
            {detail.sources.map((source) => (
              <li key={`${source.provider}-${source.url}`}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
