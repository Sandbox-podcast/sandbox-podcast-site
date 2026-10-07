import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { formatDate, formatDayMonth, formatNumber, pluralize } from '@/domain/format';
import type { Reign } from '@/domain/history';
import { shortWeek, weekEnd, weekStart } from '@/domain/weeks';
import { absoluteUrl, breadcrumbLd } from '@/lib/seo';
import { episodesForChart } from '@/lib/graph';
import { chartView, entityPath, getEntity, weeksOf, type ChartView } from '@/lib/repository';
import { BubblingList, ChartList, OutList } from './chart-row';
import { ChartLens, type LensEntry } from './chart-lens';
import { TimeAgo } from './client';
import { EpisodeCard } from './cards';
import { MoveBadge, ProvChip, SectionHead } from './ui';

function WeekNav({ view }: { view: ChartView }) {
  const weeks = weeksOf(view.chart.slug).slice().reverse();
  const href = (w: string, latest: boolean): string =>
    latest ? `/charts/${view.chart.slug}` : `/charts/${view.chart.slug}/${w}`;
  return (
    <nav aria-label="Choisir une semaine" className="mt-6">
      <div className="flex items-center gap-2">
        {view.previousWeek ? (
          <Link className="btn px-3" href={href(view.previousWeek, false)} rel="prev">
            ← {shortWeek(view.previousWeek)}
          </Link>
        ) : (
          <span className="btn px-3 opacity-30" aria-hidden="true">
            ←
          </span>
        )}
        <span className="label px-1">Semaine {shortWeek(view.week).slice(1)}</span>
        {view.nextWeek ? (
          <Link
            className="btn px-3"
            href={href(view.nextWeek, view.nextWeek === weeks[0])}
            rel="next"
          >
            {shortWeek(view.nextWeek)} →
          </Link>
        ) : (
          <span className="btn px-3 opacity-30" aria-hidden="true">
            →
          </span>
        )}
        <Link
          href="/charts/history"
          className="label ml-auto underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
        >
          Historique complet →
        </Link>
      </div>
      <div className="scroll-x mt-3 -mx-1 pb-2">
        <ul className="m-0 flex list-none gap-1.5 p-1">
          {weeks.map((w, i) => (
            <li key={w}>
              <Link
                href={href(w, i === 0)}
                className={`chip ${w === view.week ? 'bg-ink text-paper' : 'hover:bg-paper-3'}`}
                aria-current={w === view.week ? 'page' : undefined}
              >
                {shortWeek(w)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

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
    <section
      aria-label="Résumé de la semaine"
      className="mt-8 grid grid-cols-2 gap-px border-2 border-ink bg-ink lg:grid-cols-4"
    >
      <div className={`${cell} !bg-hl text-on-hl`}>
        <p className="label">#1 cette semaine</p>
        <p className="font-display text-2xl font-extrabold leading-none">
          <Link href={entityPath(first.entity)} className="hover:underline">
            {first.entity.name}
          </Link>
        </p>
        <p className="label mt-auto">
          {lead?.entity === first.entity.slug
            ? lead.weeks > 1
              ? `${String(lead.weeks)}ᵉ semaine en tête`
              : view.baseline
                ? 'Première semaine du classement'
                : 'Prend la tête'
            : ''}
        </p>
      </div>
      <div className={cell}>
        <p className="label text-ink-2">Plus forte hausse</p>
        {climber ? (
          <>
            <p className="font-display text-xl font-extrabold leading-tight">
              {climber.entity.name}
            </p>
            <p className="label mt-auto flex items-center gap-2">
              <MoveBadge kind="up" delta={climber.movement.delta} /> n°{climber.rank}
            </p>
          </>
        ) : (
          <p className="label mt-auto text-ink-3">Aucune hausse</p>
        )}
      </div>
      <div className={cell}>
        <p className="label text-ink-2">Plus forte baisse</p>
        {faller ? (
          <>
            <p className="font-display text-xl font-extrabold leading-tight">
              {faller.entity.name}
            </p>
            <p className="label mt-auto flex items-center gap-2">
              <MoveBadge kind="down" delta={faller.movement.delta} /> n°{faller.rank}
            </p>
          </>
        ) : (
          <p className="label mt-auto text-ink-3">Aucune baisse</p>
        )}
      </div>
      <div className={cell}>
        <p className="label text-ink-2">Entrées et sorties</p>
        <p className="font-display text-xl font-extrabold leading-tight">
          {view.baseline ? '—' : `${String(newcomers.length)} in · ${String(view.out.length)} out`}
        </p>
        <p className="label mt-auto truncate text-ink-3">
          {view.baseline
            ? 'Base de départ'
            : [...newcomers.map((r) => r.entity.name), ...view.out.map((o) => o.entity.name)]
                .slice(0, 3)
                .join(', ') || 'Aucun changement'}
        </p>
      </div>
    </section>
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
    <section className="mt-14" aria-label="Hall of #1">
      <h3 className="label mb-3 border-t-2 border-ink pt-2">Hall of #1 · qui a tenu la tête</h3>
      <div className="scroll-x">
        <ol className="m-0 flex min-w-[40rem] list-none gap-px border-2 border-ink bg-ink p-0">
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
                  {' '}
                </div>
                <p className="truncate font-display text-sm font-extrabold">{entity.name}</p>
                <p className="label truncate text-ink-3">
                  {i === reigns.length - 1 ? 'en cours · ' : ''}
                  {shortWeek(r.from)}
                  {r.from !== r.to ? `–${shortWeek(r.to)}` : ''} · {String(r.weeks)} sem.
                </p>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="label mt-3 flex flex-wrap gap-x-5 gap-y-1 text-ink-2">
        {ranking.map(([slug, weeks]) => (
          <span key={slug}>
            <Link
              href={entityPath(getEntity(slug))}
              className="underline decoration-2 underline-offset-2 hover:bg-hl hover:text-on-hl"
            >
              {getEntity(slug).name}
            </Link>{' '}
            : {pluralize(weeks, 'semaine', 'semaines')} / {String(total)}
          </span>
        ))}
      </p>
      <p className="sr-only">Classement {chartSlug}</p>
    </section>
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
      <nav aria-label="Fil d’Ariane" className="label mb-5 text-ink-2">
        <Link href="/charts" className="underline decoration-2 underline-offset-4">
          Charts
        </Link>{' '}
        / {chart.short}
        {view.isLatest ? '' : ` / ${shortWeek(view.week)} (archive)`}
      </nav>

      <header>
        <p className="label mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="tag">{chart.code}</span>
          <span>
            Semaine {shortWeek(view.week).slice(1)} · {formatDayMonth(weekStart(view.week))} –{' '}
            {formatDayMonth(weekEnd(view.week))}
          </span>
          {view.isLatest ? null : <span className="tag tag-line">Archive</span>}
        </p>
        <h1 className="display" style={{ fontSize: 'clamp(3.25rem, 11vw, 8.5rem)' }}>
          {chart.title}
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
          {chart.tagline}
        </p>
        <p className="label mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-ink-2">
          <span className="flex items-center gap-2">
            Dernière mise à jour : <TimeAgo iso={view.snapshot.publishedAt} />
          </span>
          <span className="flex items-center gap-2">
            Données <ProvChip provenance={view.snapshot.provenance} />
          </span>
          <Link
            href={`/charts/${chart.slug}/methodology`}
            className="underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
          >
            Comment ce classement est calculé →
          </Link>
        </p>
        <WeekNav view={view} />
      </header>

      <Summary view={view} />

      <section className="mt-12" aria-label={`${chart.title}, semaine ${shortWeek(view.week)}`}>
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
        <BubblingList rows={view.bubbling} size={chart.size} />
        <OutList rows={view.out} size={chart.size} />
      </section>

      <ReignStrip reigns={view.reigns} chartSlug={chart.slug} />

      {episodes.length > 0 ? (
        <section className="mt-16">
          <SectionHead kicker="Épisodes liés" title="Dans les podcasts" />
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-3">
            {episodes.map((e) => (
              <EpisodeCard key={e.number} episode={e} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-16 border-t-4 border-ink pt-3">
        <p className="label text-ink-2">
          {formatNumber(view.snapshot.entries.length)} candidats suivis cette semaine. Les rangs
          au-delà du Top {chart.size} sont affichés pour le contexte (« bubbling under »). Relevé du{' '}
          {formatDate(view.snapshot.retrievedAt)}.{' '}
          <Link
            href={`/charts/${chart.slug}/methodology`}
            className="underline decoration-2 underline-offset-4"
          >
            Méthodologie
          </Link>
          .
        </p>
      </section>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${chart.title} : semaine ${shortWeek(view.week).slice(1)}`,
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
