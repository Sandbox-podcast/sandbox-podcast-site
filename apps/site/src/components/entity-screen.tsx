import Link from 'next/link';
import {
  formatByUnit,
  formatDate,
  formatDateShort,
  formatNumber,
  formatTimestamp,
  ordinal,
} from '@/domain/format';
import { shortWeek } from '@/domain/weeks';
import { competitorsOf, episodesForEntity } from '@/lib/graph';
import { absoluteUrl, breadcrumbLd } from '@/lib/seo';
import { entityPath, entityView, getTopic, type Appearance } from '@/lib/repository';
import { EntityCard } from './cards';
import { RankHistory, SeriesChart } from './charts-svg';
import { JsonLd } from './json-ld';
import { TakeCard } from './take-card';
import { ExtLink, Mark, MoveBadge, RankNum, SectionHead } from './ui';

function Kpi({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`flex min-h-24 flex-col gap-1 p-3 ${accent ? 'bg-hl text-on-hl' : 'bg-paper'}`}>
      <dt className="label opacity-75">{label}</dt>
      <dd
        className="m-0 font-display text-3xl font-extrabold leading-none tnum"
        style={{ fontStretch: '75%' }}
      >
        {value}
      </dd>
      {sub ? <dd className="label m-0 mt-auto opacity-75">{sub}</dd> : null}
    </div>
  );
}

function AppearanceBlock({ a }: { a: Appearance }) {
  const { chart, history, entry, profile } = a;
  const inTop = entry !== undefined && entry.rank <= chart.size;
  const first = history.firstWeek;
  const movement = a.movement;
  const dims = profile.dimensions;
  return (
    <section className="border-t-4 border-ink pt-4" aria-label={chart.title}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-ink-2">
            {chart.code} · semaine {shortWeek(a.week).slice(1)}
          </p>
          <h3 className="display text-4xl">
            <Link
              href={`/charts/${chart.slug}`}
              className="hover:underline hover:decoration-4 hover:underline-offset-4"
            >
              {chart.title}
            </Link>
          </h3>
        </div>
        <Link
          href={`/charts/${chart.slug}/methodology`}
          className="label underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
        >
          Méthodologie →
        </Link>
      </header>

      <div className="mt-4 grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-5">
          {inTop ? (
            <>
              <RankNum rank={entry.rank} size="xl" />
              {movement ? <MoveBadge kind={movement.kind} delta={movement.delta} /> : null}
            </>
          ) : (
            <div>
              <p className="display text-4xl text-ink-3">Hors Top {chart.size}</p>
              <p className="label mt-1 text-ink-2">
                {a.bubblingRank
                  ? `Suivi, ${ordinal(a.bubblingRank)} du pool (bubbling under)`
                  : 'Plus suivi cette semaine'}
              </p>
            </div>
          )}
        </div>
        <dl className="m-0 grid grid-cols-2 gap-px border-2 border-ink bg-ink sm:grid-cols-4">
          <Kpi
            label="Current ranking"
            value={history.currentRank ? `#${String(history.currentRank)}` : '—'}
            accent={history.currentRank === 1}
          />
          <Kpi
            label="Previous ranking"
            value={history.previousRank ? `#${String(history.previousRank)}` : '—'}
            sub={a.history.points.at(-2) ? shortWeek(a.history.points.at(-2)?.week ?? '') : ''}
          />
          <Kpi
            label="Peak"
            value={history.peak ? `#${String(history.peak)}` : '—'}
            sub={history.peak ? `${String(history.weeksAtPeak)} sem. à ce rang` : ''}
          />
          <Kpi
            label="Weeks in Top 10"
            value={String(history.weeksInTop)}
            sub={`${String(history.currentStreak)} d’affilée`}
          />
          <Kpi
            label="Première entrée"
            value={first ? shortWeek(first) : '—'}
            sub={first ? 'au Top' : ''}
          />
          <Kpi label="Fois #1" value={String(history.weeksAtNumberOne)} sub="semaines en tête" />
          <Kpi
            label="Plus forte hausse"
            value={history.biggestClimb ? `+${String(history.biggestClimb.places)}` : '—'}
            sub={history.biggestClimb ? shortWeek(history.biggestClimb.week) : ''}
          />
          <Kpi
            label="Plus forte chute"
            value={history.biggestFall ? `−${String(history.biggestFall.places)}` : '—'}
            sub={history.biggestFall ? shortWeek(history.biggestFall.week) : ''}
          />
        </dl>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <p className="label mb-2 flex items-center gap-2">
            <span className="bg-ink px-1.5 py-0.5 text-paper">DATA</span> Position semaine après
            semaine
          </p>
          <RankHistory
            points={history.points.map((p) => ({ week: p.week, rank: p.rank }))}
            size={chart.size}
            title={`Historique de ${chart.title}`}
          />
        </div>
        <div>
          <p className="label mb-2 flex items-center gap-2">
            <span className="bg-ink px-1.5 py-0.5 text-paper">DATA</span> {a.tracked.info.label}
          </p>
          <SeriesChart
            points={a.tracked.series}
            unit={a.tracked.info.unit}
            decimals={a.tracked.info.decimals}
            title={`Évolution de ${a.tracked.info.label}`}
          />
          {a.tracked.info.source ? (
            <p className="label mt-1 text-ink-3">
              Source :{' '}
              <ExtLink href={a.tracked.info.source.url}>{a.tracked.info.source.label}</ExtLink>{' '}
            </p>
          ) : null}
        </div>
      </div>

      {a.explanation ? (
        <div className="data-block mt-6">
          <p className="data-title">
            <span className="label bg-ink px-1.5 py-0.5 text-paper">DATA</span>
            <span className="label">Pourquoi ça bouge</span>
          </p>
          <p>{a.explanation.headline}</p>
        </div>
      ) : null}

      {entry ? (
        <details className="disclosure mt-6">
          <summary className="label">Tous les sous-scores et mesures</summary>
          <div className="mt-3 grid gap-8 md:grid-cols-2">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Sous-score</th>
                  <th className="num">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {dims.map((d) => (
                  <tr key={d.id}>
                    <td>{d.label}</td>
                    <td className="num">
                      {entry.dimensions[d.id] === undefined
                        ? '—'
                        : formatNumber(entry.dimensions[d.id] ?? 0, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="dtable">
              <thead>
                <tr>
                  <th>Mesure</th>
                  <th className="num">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {chart.detailMetrics.map((key) => {
                  const info = [...profile.metrics, ...profile.derived].find((m) => m.key === key);
                  const v = entry.metrics[key];
                  return info ? (
                    <tr key={key}>
                      <td>{info.label}</td>
                      <td className="num">
                        {v === undefined ? '—' : formatByUnit(v, info.unit, info.decimals)}
                      </td>
                    </tr>
                  ) : null;
                })}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}

export function EntityScreen({ slug }: { slug: string }) {
  const view = entityView(slug);
  const { entity, appearances, takes } = view;
  const episodes = episodesForEntity(slug);
  const rivals = competitorsOf(entity);
  const section =
    entity.kind === 'project' ? 'Projects' : entity.kind === 'model' ? 'Models' : 'Tools';
  const path = entityPath(entity);
  const sameAs = entity.links.map((l) => l.url);

  return (
    <article className="wrap pt-6">
      <nav aria-label="Fil d’Ariane" className="label mb-5 text-ink-2">
        <Link href="/charts" className="underline decoration-2 underline-offset-4">
          Charts
        </Link>{' '}
        / {section} / {entity.name}
      </nav>

      <header className="grid gap-6 md:grid-cols-[auto_1fr] md:items-end">
        <Mark entity={entity} size={104} />
        <div className="min-w-0">
          <p className="label mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
            <span className="tag">{entity.category}</span>
            {entity.org ? <span>{entity.org}</span> : null}
            {entity.license ? <span className="chip">Licence : {entity.license}</span> : null}
            {entity.openWeights === true ? (
              <span className="chip bg-up-bg text-up">Open weights</span>
            ) : null}
            {entity.openWeights === false ? <span className="chip">Poids fermés</span> : null}
          </p>
          <h1 className="display" style={{ fontSize: 'clamp(3rem, 9vw, 7rem)' }}>
            {entity.name}
          </h1>
          <p className="mt-3 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
            {entity.tagline}
          </p>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {entity.links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="btn">
            {l.label} <span aria-hidden="true">↗</span>
            <span className="sr-only">(nouvel onglet)</span>
          </a>
        ))}
        {entity.topics.map((t) => (
          <Link key={t} href={`/topics/${t}`} className="chip hover:bg-hl hover:text-on-hl">
            #{getTopic(t).label}
          </Link>
        ))}
      </div>

      <div className="mt-12 grid gap-14">
        {appearances.length > 0 ? (
          appearances.map((a) => <AppearanceBlock key={a.chart.slug} a={a} />)
        ) : (
          <p className="label text-ink-3">
            Cette entité n’est dans aucun classement pour le moment.
          </p>
        )}

        <section aria-labelledby="takes">
          <SectionHead kicker="L’avis de l’équipe, signé" title="Notre avis" id="takes" />
          {takes.length > 0 ? (
            <ul className="m-0 grid list-none gap-5 p-0 md:grid-cols-2">
              {takes.map((t) => (
                <li key={t.id} className="flex flex-col gap-1.5">
                  <TakeCard take={t} showDate />
                  <p className="label text-ink-3">
                    {t.chart && t.week ? (
                      <>
                        À propos de sa place au{' '}
                        <Link
                          href={`/charts/${t.chart.slug}/${t.week}`}
                          className="underline decoration-2 underline-offset-2"
                        >
                          {t.chart.title}
                        </Link>
                        , semaine {shortWeek(t.week).slice(1)}
                      </>
                    ) : (
                      'Avis général'
                    )}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-2">
              Pas encore d’avis sur {entity.name}. Les chiffres, eux, sont ci-dessus.
            </p>
          )}
        </section>

        <section aria-labelledby="about-entity">
          <SectionHead kicker="Éditorial" title="À propos" id="about-entity" />
          <p className="max-w-3xl font-serif text-xl leading-relaxed">{entity.description}</p>
        </section>

        {episodes.length > 0 ? (
          <section aria-labelledby="in-episodes">
            <SectionHead kicker="Où on en parle" title="Dans les épisodes" id="in-episodes" />
            <ul className="m-0 grid list-none gap-4 p-0">
              {episodes.map(({ episode, mentions }) => (
                <li
                  key={episode.number}
                  className="grid gap-1 border-t border-hair pt-3 md:grid-cols-[14rem_1fr]"
                >
                  <p className="label text-ink-2">
                    Épisode {episode.number} · {formatDateShort(episode.publishedAt)}
                  </p>
                  <div>
                    <Link
                      href={`/episodes/${String(episode.number)}`}
                      className="font-display text-lg font-extrabold hover:underline"
                    >
                      {episode.title}
                    </Link>
                    <ul className="m-0 mt-1 flex list-none flex-wrap gap-2 p-0">
                      {mentions.map((m) => {
                        const idx = episode.mentions.indexOf(m);
                        return (
                          <li key={m.label}>
                            <Link
                              href={`/episodes/${String(episode.number)}#m-${String(idx)}`}
                              className="chip hover:bg-hl hover:text-on-hl"
                            >
                              {m.at !== undefined ? `▶ ${formatTimestamp(m.at)}` : 'Cité'} ·{' '}
                              {m.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {rivals.length > 0 ? (
          <section aria-labelledby="rivals">
            <SectionHead
              kicker="Alternatives et voisins de classement"
              title="Concurrents"
              id="rivals"
            />
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {rivals.map((r) => (
                <EntityCard key={r.slug} entity={r} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <p className="label mt-14 border-t-2 border-ink pt-3 text-ink-3">
        Fiche mise à jour avec le relevé du{' '}
        {appearances[0] ? formatDate(appearances[0].publishedAt) : '—'}. Les données viennent des
        sources citées ; les avis sont ceux de l’équipe, jamais mélangés.
      </p>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': entity.kind === 'project' ? 'SoftwareSourceCode' : 'SoftwareApplication',
            name: entity.name,
            description: entity.description,
            url: absoluteUrl(path),
            sameAs,
            ...(entity.kind === 'project'
              ? { codeRepositoryUrl: entity.links.find((l) => l.kind === 'github')?.url }
              : { applicationCategory: 'Large language model' }),
            ...(entity.license ? { license: entity.license } : {}),
            ...(entity.org ? { author: { '@type': 'Organization', name: entity.org } } : {}),
          },
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Charts', path: '/charts' },
            { name: entity.name, path },
          ]),
        ]}
      />
    </article>
  );
}
