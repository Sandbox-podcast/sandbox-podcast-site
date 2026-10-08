import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RankHistory } from '@/components/charts-svg';
import { CopyButton } from '@/components/client';
import { JsonLd } from '@/components/json-ld';
import { TakeCard } from '@/components/take-card';
import { Breadcrumbs, Mark, MoveBadge, SectionHead } from '@/components/ui';
import { siteConfig } from '@/config/site';
import { formatCompact, formatDayMonth } from '@/domain/format';
import { shortWeek, weekEnd, weekStart } from '@/domain/weeks';
import { highlightsFor, moveTriples } from '@/lib/move-params';
import { highlightHeadline, sharePath } from '@/lib/moves';
import { chartView, entityPath, findChart, findEntity, weeksOf } from '@/lib/repository';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return moveTriples();
}

interface Props {
  params: Promise<{ chart: string; week: string; entity: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { chart, week, entity } = await params;
  const hs = highlightsFor(chart, week, entity);
  const first = hs[0];
  if (!first) return {};
  return pageMetadata({
    title: highlightHeadline(first),
    description: `Semaine ${shortWeek(week).slice(1)} : ${hs.map(highlightHeadline).join(' ')}`,
    path: sharePath(chart, week, entity),
    ownImage: true,
  });
}

export default async function MovePage({ params }: Props) {
  const { chart: chartSlug, week, entity: entitySlug } = await params;
  const chart = findChart(chartSlug);
  const entity = findEntity(entitySlug);
  if (!chart || !entity || !weeksOf(chartSlug).includes(week)) notFound();
  const hs = highlightsFor(chartSlug, week, entitySlug);
  const primary = hs[0];
  if (!primary) notFound();

  const view = chartView(chartSlug, week);
  const row = view.rows.find((r) => r.entity.slug === entitySlug);
  const rank = row?.rank ?? primary.rank;
  const path = sharePath(chartSlug, week, entitySlug);
  const text = `${highlightHeadline(primary)} ${absoluteUrl(path)}`;
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(highlightHeadline(primary))}&url=${encodeURIComponent(absoluteUrl(path))}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(absoluteUrl(path))}`;

  return (
    <article className="wrap move-page pt-6">
      <Breadcrumbs
        items={[
          { label: 'Classements', href: '/charts' },
          { label: chart.short, href: `/charts/${chart.slug}/${week}` },
          { label: entity.name },
        ]}
      />

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[1fr_22rem]">
        <div>
          <p className="label mb-3 text-ink-2">
            Carte de partage · {formatDayMonth(weekStart(week))} – {formatDayMonth(weekEnd(week))}
          </p>
          <h1 className="move-title">{highlightHeadline(primary)}</h1>

          <div
            className="move-preview mt-8 flex aspect-[1200/630] flex-col justify-between border border-hair bg-hl p-5 text-on-hl md:p-8"
            role="img"
            aria-label={`Carte : ${highlightHeadline(primary)}`}
          >
            <p className="label flex justify-between">
              <span>{chart.title}</span>
              <span>Week {shortWeek(week).slice(1)}</span>
            </p>
            <div className="flex items-center gap-4 md:gap-8">
              <span
                className="display"
                style={{ fontSize: 'clamp(4rem, 17vw, 12rem)', lineHeight: 0.8 }}
              >
                {rank === null ? 'OUT' : `#${String(rank)}`}
              </span>
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-3">
                  <Mark entity={entity} size={52} />
                  <span className="display" style={{ fontSize: 'clamp(1.5rem, 4.5vw, 3.25rem)' }}>
                    {entity.name}
                  </span>
                </div>
                {row ? <MoveBadge kind={row.movement.kind} delta={row.movement.delta} /> : null}
              </div>
            </div>
            <p className="label">
              {siteConfig.name} ·{' '}
              {primary.stat
                ? `+${formatCompact(primary.stat.value)} stars / 7 j`
                : 'mis à jour chaque semaine'}
            </p>
          </div>

          <p className="mt-6 flex flex-wrap gap-2">
            <a className="btn btn-solid" href={intent} target="_blank" rel="noopener noreferrer">
              Partager sur X ↗
            </a>
            <a className="btn" href={linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn ↗
            </a>
            <CopyButton text={path} />
            <a
              className="btn"
              href={`${path}/opengraph-image`}
              download={`${entity.slug}-${week}.png`}
            >
              Télécharger l’image
            </a>
          </p>
          <p className="move-share-url label mt-3 text-ink-3" aria-hidden="true">
            {text}
          </p>

          {hs.length > 1 ? (
            <section className="mt-10" aria-labelledby="also">
              <SectionHead title="Aussi cette semaine" id="also" />
              <ul className="m-0 grid list-none gap-2 p-0">
                {hs.slice(1).map((h) => (
                  <li key={h.kind} className="border-t border-hair py-2.5">
                    {highlightHeadline(h)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {row?.explanation ? (
            <div className="data-block mt-10">
              <p className="data-title">
                <span className="label bg-ink px-1.5 py-0.5 text-paper">DATA</span>
                <span className="label">Pourquoi ça bouge</span>
              </p>
              <p>{row.explanation.headline}</p>
            </div>
          ) : null}
          {row?.take ? (
            <div className="mt-6 max-w-2xl">
              <TakeCard take={row.take} />
            </div>
          ) : null}
        </div>

        <aside className="grid h-fit content-start gap-8">
          {row ? (
            <div>
              <p className="label mb-2 border-t-4 border-ink pt-2">
                Parcours dans le {chart.short}
              </p>
              <RankHistory
                points={row.stats.points.map((p) => ({ week: p.week, rank: p.rank }))}
                size={chart.size}
                title={`Parcours de ${entity.name}`}
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Link href={entityPath(entity)} className="btn btn-solid justify-between">
              Fiche {entity.name} <span aria-hidden="true">→</span>
            </Link>
            <Link href={`/charts/${chart.slug}/${week}`} className="btn justify-between">
              Le classement de la semaine <span aria-hidden="true">→</span>
            </Link>
            <Link href={`/charts/${chart.slug}/methodology`} className="btn justify-between">
              Méthodologie <span aria-hidden="true">→</span>
            </Link>
          </div>
        </aside>
      </div>

      <JsonLd
        data={breadcrumbLd([
          { name: 'Accueil', path: '/' },
          { name: chart.title, path: `/charts/${chart.slug}` },
          { name: highlightHeadline(primary), path },
        ])}
      />
    </article>
  );
}
