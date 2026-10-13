import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { JsonLd } from '@/components/json-ld';
import { formatDate, formatDayMonth, formatNumber, pluralize } from '@/domain/format';
import type { Reign } from '@/domain/history';
import { editionEnd, editionMark, editionStart, shortWeek } from '@/domain/weeks';
import { absoluteUrl, breadcrumbLd } from '@/lib/seo';
import { episodesForChart } from '@/lib/graph';
import { chartView, entityPath, getEntity, weeksOf, type ChartView } from '@/lib/repository';
import { BubblingList, ChartList, OutList } from './chart-row';
import { ChartLens, type LensEntry } from './chart-lens';
import { TimeAgo } from './client';
import { EpisodeCard } from './cards';
import { MoveBadge, SectionHead } from './ui';
import { ChartWeekSelect } from './chart-week-select';
function Summary({ view }: { view: ChartView }) {
  const first = view.rows[0];
  const lead = view.reigns.at(-1);
  const climber = view.rows
    .filter((r) => r.movement.kind === 'up')
    .sort((a, b) => b.movement.delta - a.movement.delta)[0];
  const faller = view.rows
    .filter((r) => r.movement.kind === 'down')
    .sort((a, b) => a.movement.delta - b.movement.delta)[0];
  const newcomers = view.rows.filter((r) => r.movement.kind === 'new' || r.movement.kind === 're');
  if (!first) return null;
  const cell = 'flex min-h-28 flex-col gap-1.5 bg-paper p-3.5';
  return (
    <LocalizedElement
      as="section"
      aria-label="Résumé de la semaine"
      className="mt-8 grid grid-cols-2 gap-px border-2 border-ink bg-ink lg:grid-cols-4"
    >
      <div className={`${cell} !bg-hl text-on-hl`}>
        <p className="label">
          <Text>{'#1 cette semaine'}</Text>
        </p>
        <p className="font-display text-2xl font-extrabold leading-none">
          <Link href={entityPath(first.entity)} className="hover:underline">
            <Text>{first.entity.name}</Text>
          </Link>
        </p>
        <p className="label mt-auto">
          <Text>
            {lead?.entity === first.entity.slug
              ? lead.weeks > 1
                ? `${String(lead.weeks)}ᵉ semaine en tête`
                : view.baseline
                  ? 'Première semaine du classement'
                  : 'Prend la tête'
              : ''}
          </Text>
        </p>
      </div>
      <div className={cell}>
        <p className="label text-ink-2">
          <Text>{'Plus forte hausse'}</Text>
        </p>
        <Text>
          {climber ? (
            <>
              <p className="font-display text-xl font-extrabold leading-tight">
                <Text>{climber.entity.name}</Text>
              </p>
              <p className="label mt-auto flex items-center gap-2">
                <MoveBadge kind="up" delta={climber.movement.delta} />
                <Text>{' n\u00B0'}</Text>
                <Text>{climber.rank}</Text>
              </p>
            </>
          ) : (
            <p className="label mt-auto text-ink-3">
              <Text>{'Aucune hausse'}</Text>
            </p>
          )}
        </Text>
      </div>
      <div className={cell}>
        <p className="label text-ink-2">
          <Text>{'Plus forte baisse'}</Text>
        </p>
        <Text>
          {faller ? (
            <>
              <p className="font-display text-xl font-extrabold leading-tight">
                <Text>{faller.entity.name}</Text>
              </p>
              <p className="label mt-auto flex items-center gap-2">
                <MoveBadge kind="down" delta={faller.movement.delta} />
                <Text>{' n\u00B0'}</Text>
                <Text>{faller.rank}</Text>
              </p>
            </>
          ) : (
            <p className="label mt-auto text-ink-3">
              <Text>{'Aucune baisse'}</Text>
            </p>
          )}
        </Text>
      </div>
      <div className={cell}>
        <p className="label text-ink-2">
          <Text>{'Entr\u00E9es et sorties'}</Text>
        </p>
        <p className="font-display text-xl font-extrabold leading-tight">
          <Text>
            {view.baseline
              ? '—'
              : `${String(newcomers.length)} in · ${String(view.out.length)} out`}
          </Text>
        </p>
        <p className="label mt-auto truncate text-ink-3">
          <Text>
            {view.baseline
              ? 'Base de départ'
              : [...newcomers.map((r) => r.entity.name), ...view.out.map((o) => o.entity.name)]
                  .slice(0, 3)
                  .join(', ') || 'Aucun changement'}
          </Text>
        </p>
      </div>
    </LocalizedElement>
  );
}
/** « Hall of #1 » : qui a tenu la première place, et combien de temps. */
export function ReignStrip({ reigns, chartSlug }: { reigns: Reign[]; chartSlug: string }) {
  if (reigns.length === 0) return null;
  const total = reigns.reduce((n, r) => n + r.weeks, 0);
  const totals = new Map<string, number>();
  for (const r of reigns) totals.set(r.entity, (totals.get(r.entity) ?? 0) + r.weeks);
  const ranking = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  return (
    <LocalizedElement as="section" className="mt-14" aria-label="Hall of #1">
      <h3 className="label mb-3 border-t-2 border-ink pt-2">
        <Text>{'Hall of #1 \u00B7 qui a tenu la t\u00EAte'}</Text>
      </h3>
      <div className="scroll-x">
        <ol className="m-0 flex min-w-[40rem] list-none gap-px border-2 border-ink bg-ink p-0">
          <Text>
            {reigns.map((r, i) => {
              const entity = getEntity(r.entity);
              return (
                <li
                  key={`${r.entity}${r.from}`}
                  style={{ flexGrow: r.weeks, flexBasis: 0 }}
                  className="min-w-0 bg-paper p-2"
                >
                  <div
                    data-tone={entity.mark.tone}
                    className="mark mb-1.5 !h-1.5 !w-full !border-0"
                    aria-hidden="true"
                  >
                    <Text> </Text>
                  </div>
                  <p className="truncate font-display text-sm font-extrabold">
                    <Text>{entity.name}</Text>
                  </p>
                  <p className="label truncate text-ink-3">
                    <Text>{i === reigns.length - 1 ? 'en cours · ' : ''}</Text>
                    <Text>{shortWeek(r.from)}</Text>
                    <Text>{r.from !== r.to ? `–${shortWeek(r.to)}` : ''}</Text>
                    <Text>{' \u00B7 '}</Text>
                    <Text>{String(r.weeks)}</Text>
                    <Text>{' sem.'}</Text>
                  </p>
                </li>
              );
            })}
          </Text>
        </ol>
      </div>
      <p className="label mt-3 flex flex-wrap gap-x-5 gap-y-1 text-ink-2">
        <Text>
          {ranking.map(([slug, weeks]) => (
            <span key={slug}>
              <Link
                href={entityPath(getEntity(slug))}
                className="underline decoration-2 underline-offset-2 hover:bg-hl hover:text-on-hl"
              >
                <Text>{getEntity(slug).name}</Text>
              </Link>
              <Text> </Text>
              <Text>{': '}</Text>
              <Text>{pluralize(weeks, 'semaine', 'semaines')}</Text>
              <Text>{' / '}</Text>
              <Text>{String(total)}</Text>
            </span>
          ))}
        </Text>
      </p>
      <p className="sr-only">
        <Text>{'Classement '}</Text>
        <Text>{chartSlug}</Text>
      </p>
    </LocalizedElement>
  );
}
function lensEntries(view: ChartView): LensEntry[] {
  return view.snapshot.entries.map((e) => {
    const entity = getEntity(e.entity);
    return {
      slug: entity.slug,
      name: entity.name,
      href: entityPath(entity),
      tagline: entity.tagline,
      org: entity.org ?? null,
      glyph: entity.mark.glyph,
      tone: entity.mark.tone,
      officialRank: e.rank,
      dims: e.dimensions,
    };
  });
}
export function ChartScreen({ slug, week }: { slug: string; week?: string }) {
  const view = chartView(slug, week);
  const { chart, profile } = view;
  const episodes = episodesForChart(chart.slug, view.week).slice(0, 3);
  const dimLabels = Object.fromEntries(profile.dimensions.map((d) => [d.id, d.label]));
  const listing = view.rows.map((r, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: r.entity.name,
    url: absoluteUrl(entityPath(r.entity)),
  }));
  const own = view.isLatest ? `/charts/${chart.slug}` : `/charts/${chart.slug}/${view.week}`;
  return (
    <div className="wrap pt-6 pb-4">
      <LocalizedElement as="nav" aria-label="Fil d’Ariane" className="label mb-5 text-ink-2">
        <Link href="/charts" className="underline decoration-2 underline-offset-4">
          <Text>{'Charts'}</Text>
        </Link>
        <Text> </Text>
        <Text>{'/ '}</Text>
        <Text>{chart.short}</Text>
        <Text>{view.isLatest ? '' : ` / ${shortWeek(view.week)} (archive)`}</Text>
      </LocalizedElement>

      <header>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="label flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="tag">
              <Text>{chart.code}</Text>
            </span>
            <span>
              <Text>{'Semaine '}</Text>
              <Text>{editionMark(view.week)}</Text>
              <Text>{' \u00B7 '}</Text>
              <Text>{formatDayMonth(editionStart(view.week))}</Text>
              <Text>{' \u2013'}</Text>
              <Text> </Text>
              <Text>{formatDayMonth(editionEnd(view.week))}</Text>
            </span>
            <Text>
              {view.isLatest ? null : (
                <span className="tag tag-line">
                  <Text>{'Archive'}</Text>
                </span>
              )}
            </Text>
          </p>
          <ChartWeekSelect
            slug={chart.slug}
            selectedWeek={view.week}
            weeks={weeksOf(chart.slug).slice().reverse()}
          />
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(3.25rem, 11vw, 8.5rem)' }}>
          <Text>{chart.title}</Text>
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
          <Text>{chart.tagline}</Text>
        </p>
        <p className="label mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-ink-2">
          <span className="flex items-center gap-2">
            <Text>{'Derni\u00E8re mise \u00E0 jour : '}</Text>
            <TimeAgo iso={view.snapshot.publishedAt} />
          </span>
          <Link
            href={`/charts/${chart.slug}/methodology`}
            className="underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
          >
            <Text>{'Comment ce classement est calcul\u00E9 \u2192'}</Text>
          </Link>
        </p>
      </header>

      <Summary view={view} />

      <LocalizedElement
        as="section"
        className="mt-12"
        aria-label={`${chart.title}, semaine ${shortWeek(view.week)}`}
      >
        <Text>
          {chart.views.length > 1 ? (
            <ChartLens
              views={chart.views}
              entries={lensEntries(view)}
              size={chart.size}
              dimLabels={dimLabels}
              officialLabel={dimLabels[profile.primary] ?? 'Global'}
              official={<ChartList view={view} />}
            />
          ) : (
            <ChartList view={view} />
          )}
        </Text>
        <BubblingList rows={view.bubbling} size={chart.size} />
        <OutList rows={view.out} size={chart.size} />
      </LocalizedElement>

      <ReignStrip reigns={view.reigns} chartSlug={chart.slug} />

      <Text>
        {episodes.length > 0 ? (
          <section className="mt-16">
            <SectionHead kicker="Épisodes liés" title="Dans les podcasts" />
            <div className="grid gap-x-8 gap-y-10 md:grid-cols-3">
              <Text>
                {episodes.map((e) => (
                  <EpisodeCard key={e.number} episode={e} />
                ))}
              </Text>
            </div>
          </section>
        ) : null}
      </Text>

      <section className="mt-16 border-t-4 border-ink pt-3">
        <p className="label text-ink-2">
          <Text>{formatNumber(view.snapshot.entries.length)}</Text>
          <Text>{' candidats suivis cette semaine. Les rangs au-del\u00E0 du Top '}</Text>
          <Text>{chart.size}</Text>
          <Text>
            {' sont affich\u00E9s pour le contexte (\u00AB bubbling under \u00BB). Relev\u00E9 du'}
          </Text>
          <Text> </Text>
          <Text>{formatDate(view.snapshot.retrievedAt)}</Text>
          <Text>{'.'}</Text>
          <Text> </Text>
          <Link
            href={`/charts/${chart.slug}/methodology`}
            className="underline decoration-2 underline-offset-4"
          >
            <Text>{'M\u00E9thodologie'}</Text>
          </Link>
          <Text>{'.'}</Text>
        </p>
      </section>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${chart.title} : semaine ${editionMark(view.week)}`,
            description: chart.description,
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            numberOfItems: listing.length,
            dateModified: view.snapshot.publishedAt,
            url: absoluteUrl(own),
            itemListElement: listing,
          },
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Charts', path: '/charts' },
            { name: chart.title, path: own },
          ]),
        ]}
      />
    </div>
  );
}
