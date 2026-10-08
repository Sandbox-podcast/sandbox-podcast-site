import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
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
import { localizedHref } from '@/i18n/routing';
import { translateText, type TranslationDictionary } from '@/i18n/translation';
export const dynamicParams = false;
export function generateStaticParams() {
  return moveTriples();
}
interface Props {
  locale?: string;
  dictionary?: TranslationDictionary;
  params: Promise<{
    chart: string;
    week: string;
    entity: string;
  }>;
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
export default async function MovePage({ params, locale = 'fr-FR', dictionary = {} }: Props) {
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
  const shareUrl = absoluteUrl(localizedHref(path, locale));
  const headline = translateText(highlightHeadline(primary), dictionary, locale);
  const text = `${headline} ${shareUrl}`;
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(headline)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
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
            <Text>{'Carte de partage \u00B7 '}</Text>
            <Text>{formatDayMonth(weekStart(week))}</Text>
            <Text>{' \u2013 '}</Text>
            <Text>{formatDayMonth(weekEnd(week))}</Text>
          </p>
          <h1 className="move-title">
            <Text>{highlightHeadline(primary)}</Text>
          </h1>

          <LocalizedElement
            as="div"
            className="move-preview mt-8 flex aspect-[1200/630] flex-col justify-between border border-hair bg-hl p-5 text-on-hl md:p-8"
            role="img"
            aria-label={`Carte : ${highlightHeadline(primary)}`}
          >
            <p className="label flex justify-between">
              <span>
                <Text>{chart.title}</Text>
              </span>
              <span>
                <Text>{'Week '}</Text>
                <Text>{shortWeek(week).slice(1)}</Text>
              </span>
            </p>
            <div className="flex items-center gap-4 md:gap-8">
              <span
                className="display"
                style={{ fontSize: 'clamp(4rem, 17vw, 12rem)', lineHeight: 0.8 }}
              >
                <Text>{rank === null ? 'OUT' : `#${String(rank)}`}</Text>
              </span>
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-3">
                  <Mark entity={entity} size={52} />
                  <span className="display" style={{ fontSize: 'clamp(1.5rem, 4.5vw, 3.25rem)' }}>
                    <Text>{entity.name}</Text>
                  </span>
                </div>
                <Text>
                  {row ? <MoveBadge kind={row.movement.kind} delta={row.movement.delta} /> : null}
                </Text>
              </div>
            </div>
            <p className="label">
              <Text>{siteConfig.name}</Text>
              <Text>{' \u00B7'}</Text>
              <Text> </Text>
              <Text>
                {primary.stat
                  ? `+${formatCompact(primary.stat.value)} stars / 7 j`
                  : 'mis à jour chaque semaine'}
              </Text>
            </p>
          </LocalizedElement>

          <p className="mt-6 flex flex-wrap gap-2">
            <a className="btn btn-solid" href={intent} target="_blank" rel="noopener noreferrer">
              <Text>{'Partager sur X \u2197'}</Text>
            </a>
            <a className="btn" href={linkedin} target="_blank" rel="noopener noreferrer">
              <Text>{'LinkedIn \u2197'}</Text>
            </a>
            <CopyButton text={path} />
            <a
              className="btn"
              href={`${path}/opengraph-image`}
              download={`${entity.slug}-${week}.png`}
            >
              <Text>{'T\u00E9l\u00E9charger l\u2019image'}</Text>
            </a>
          </p>
          <p className="move-share-url label mt-3 text-ink-3" aria-hidden="true">
            <Text>{text}</Text>
          </p>

          <Text>
            {hs.length > 1 ? (
              <section className="mt-10" aria-labelledby="also">
                <SectionHead title="Aussi cette semaine" id="also" />
                <ul className="m-0 grid list-none gap-2 p-0">
                  <Text>
                    {hs.slice(1).map((h) => (
                      <li key={h.kind} className="border-t border-hair py-2.5">
                        <Text>{highlightHeadline(h)}</Text>
                      </li>
                    ))}
                  </Text>
                </ul>
              </section>
            ) : null}
          </Text>

          <Text>
            {row?.explanation ? (
              <div className="data-block mt-10">
                <p className="data-title">
                  <span className="label bg-ink px-1.5 py-0.5 text-paper">
                    <Text>{'DATA'}</Text>
                  </span>
                  <span className="label">
                    <Text>{'Pourquoi \u00E7a bouge'}</Text>
                  </span>
                </p>
                <p>
                  <Text>{row.explanation.headline}</Text>
                </p>
              </div>
            ) : null}
          </Text>
          <Text>
            {row?.take ? (
              <div className="mt-6 max-w-2xl">
                <TakeCard take={row.take} />
              </div>
            ) : null}
          </Text>
        </div>

        <aside className="grid h-fit content-start gap-8">
          <Text>
            {row ? (
              <div>
                <p className="label mb-2 border-t-4 border-ink pt-2">
                  <Text>{'Parcours dans le '}</Text>
                  <Text>{chart.short}</Text>
                </p>
                <RankHistory
                  points={row.stats.points.map((p) => ({ week: p.week, rank: p.rank }))}
                  size={chart.size}
                  title={`Parcours de ${entity.name}`}
                />
              </div>
            ) : null}
          </Text>
          <div className="grid gap-2">
            <Link href={entityPath(entity)} className="btn btn-solid justify-between">
              <Text>{'Fiche '}</Text>
              <Text>{entity.name}</Text>{' '}
              <span aria-hidden="true">
                <Text>{'\u2192'}</Text>
              </span>
            </Link>
            <Link href={`/charts/${chart.slug}/${week}`} className="btn justify-between">
              <Text>{'Le classement de la semaine '}</Text>
              <span aria-hidden="true">
                <Text>{'\u2192'}</Text>
              </span>
            </Link>
            <Link href={`/charts/${chart.slug}/methodology`} className="btn justify-between">
              <Text>{'M\u00E9thodologie '}</Text>
              <span aria-hidden="true">
                <Text>{'\u2192'}</Text>
              </span>
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
