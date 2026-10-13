import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import {
  formatByUnit,
  formatDate,
  formatDateShort,
  formatNumber,
  formatTimestamp,
  ordinal,
} from '@/domain/format';
import { editionMark, shortWeek } from '@/domain/weeks';
import { competitorsOf, episodesForEntity } from '@/lib/graph';
import { absoluteUrl, breadcrumbLd } from '@/lib/seo';
import { entityPath, entityView, getTopic, type Appearance } from '@/lib/repository';
import { EntityCard } from './cards';
import { RankHistory, SeriesChart } from './charts-svg';
import { JsonLd } from './json-ld';
import { TakeCard } from './take-card';
import { ExtLink, Mark, MoveBadge, RankNum, SectionHead } from './ui';
import { Breadcrumbs } from './ui';
import { episodeResourcePath } from '@/domain/discovery';
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
      <dt className="label opacity-75">
        <Text>{label}</Text>
      </dt>
      <dd
        className="m-0 font-display text-3xl font-extrabold leading-none tnum"
        style={{ fontStretch: '75%' }}
      >
        <Text>{value}</Text>
      </dd>
      <Text>
        {sub ? (
          <dd className="label m-0 mt-auto opacity-75">
            <Text>{sub}</Text>
          </dd>
        ) : null}
      </Text>
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
    <LocalizedElement as="section" className="border-t-4 border-ink pt-4" aria-label={chart.title}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-ink-2">
            <Text>{chart.code}</Text>
            <Text>{' \u00B7 semaine '}</Text>
            <Text>{editionMark(a.week)}</Text>
          </p>
          <h3 className="display text-4xl">
            <Link
              href={`/charts/${chart.slug}`}
              className="hover:underline hover:decoration-4 hover:underline-offset-4"
            >
              <Text>{chart.title}</Text>
            </Link>
          </h3>
        </div>
        <Link
          href={`/charts/${chart.slug}/methodology`}
          className="label underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
        >
          <Text>{'M\u00E9thodologie \u2192'}</Text>
        </Link>
      </header>

      <div className="mt-4 grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-5">
          <Text>
            {inTop ? (
              <>
                <RankNum rank={entry.rank} size="xl" />
                {movement ? <MoveBadge kind={movement.kind} delta={movement.delta} /> : null}
              </>
            ) : (
              <div>
                <p className="display text-4xl text-ink-3">
                  <Text>{'Hors Top '}</Text>
                  <Text>{chart.size}</Text>
                </p>
                <p className="label mt-1 text-ink-2">
                  <Text>
                    {a.bubblingRank
                      ? `Suivi, ${ordinal(a.bubblingRank)} du pool (bubbling under)`
                      : 'Plus suivi cette semaine'}
                  </Text>
                </p>
              </div>
            )}
          </Text>
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
            <span className="bg-ink px-1.5 py-0.5 text-paper">
              <Text>{'DATA'}</Text>
            </span>
            <Text>{' Position semaine apr\u00E8s semaine'}</Text>
          </p>
          <RankHistory
            points={history.points.map((p) => ({ week: p.week, rank: p.rank }))}
            size={chart.size}
            title={`Historique de ${chart.title}`}
          />
        </div>
        <div>
          <p className="label mb-2 flex items-center gap-2">
            <span className="bg-ink px-1.5 py-0.5 text-paper">
              <Text>{'DATA'}</Text>
            </span>{' '}
            <Text>{a.tracked.info.label}</Text>
          </p>
          <SeriesChart
            points={a.tracked.series}
            unit={a.tracked.info.unit}
            decimals={a.tracked.info.decimals}
            title={`Évolution de ${a.tracked.info.label}`}
          />
          <Text>
            {a.tracked.info.source ? (
              <p className="label mt-1 text-ink-3">
                <Text>{'Source :'}</Text>
                <Text> </Text>
                <ExtLink href={a.tracked.info.source.url}>
                  <Text>{a.tracked.info.source.label}</Text>
                </ExtLink>
                <Text> </Text>
              </p>
            ) : null}
          </Text>
        </div>
      </div>

      <Text>
        {a.explanation ? (
          <div className="data-block mt-6">
            <p className="data-title">
              <span className="label bg-ink px-1.5 py-0.5 text-paper">
                <Text>{'DATA'}</Text>
              </span>
              <span className="label">
                <Text>{'Pourquoi \u00E7a bouge'}</Text>
              </span>
            </p>
            <p>
              <Text>{a.explanation.headline}</Text>
            </p>
          </div>
        ) : null}
      </Text>

      <Text>
        {entry ? (
          <details className="disclosure mt-6">
            <summary className="label">
              <Text>{'Tous les sous-scores et mesures'}</Text>
            </summary>
            <div className="mt-3 grid gap-8 md:grid-cols-2">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>
                      <Text>{'Sous-score'}</Text>
                    </th>
                    <th className="num">
                      <Text>{'Valeur'}</Text>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <Text>
                    {dims.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <Text>{d.label}</Text>
                        </td>
                        <td className="num">
                          <Text>
                            {entry.dimensions[d.id] === undefined
                              ? '—'
                              : formatNumber(entry.dimensions[d.id] ?? 0, 1)}
                          </Text>
                        </td>
                      </tr>
                    ))}
                  </Text>
                </tbody>
              </table>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>
                      <Text>{'Mesure'}</Text>
                    </th>
                    <th className="num">
                      <Text>{'Valeur'}</Text>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <Text>
                    {chart.detailMetrics.map((key) => {
                      const info = [...profile.metrics, ...profile.derived].find(
                        (m) => m.key === key,
                      );
                      const v = entry.metrics[key];
                      return info ? (
                        <tr key={key}>
                          <td>
                            <Text>{info.label}</Text>
                          </td>
                          <td className="num">
                            <Text>
                              {v === undefined ? '—' : formatByUnit(v, info.unit, info.decimals)}
                            </Text>
                          </td>
                        </tr>
                      ) : null;
                    })}
                  </Text>
                </tbody>
              </table>
            </div>
          </details>
        ) : null}
      </Text>
    </LocalizedElement>
  );
}
export function EntityScreen({ slug }: { slug: string }) {
  const view = entityView(slug);
  const { entity, appearances, takes } = view;
  const episodes = episodesForEntity(slug);
  const rivals = competitorsOf(entity);
  const path = entityPath(entity);
  const sameAs = entity.links.map((l) => l.url);
  return (
    <article className="wrap pt-6">
      <Breadcrumbs items={[{ label: 'Classements', href: '/charts' }, { label: entity.name }]} />

      <header className="entity-heading grid gap-6 md:grid-cols-[auto_1fr] md:items-end">
        <Mark entity={entity} size={104} />
        <div className="min-w-0">
          <p className="label mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
            <span className="tag">
              <Text namespace="category">{entity.category}</Text>
            </span>
            <Text>
              {entity.org ? (
                <span>
                  <Text>{entity.org}</Text>
                </span>
              ) : null}
            </Text>
            <Text>
              {entity.license ? (
                <span className="chip">
                  <Text>{'Licence : '}</Text>
                  <Text>{entity.license}</Text>
                </span>
              ) : null}
            </Text>
            <Text>
              {entity.openWeights === true ? (
                <span className="chip bg-up-bg text-up">
                  <Text>{'Open weights'}</Text>
                </span>
              ) : null}
            </Text>
            <Text>
              {entity.openWeights === false ? (
                <span className="chip">
                  <Text>{'Poids ferm\u00E9s'}</Text>
                </span>
              ) : null}
            </Text>
          </p>
          <h1 className="display">
            <Text>{entity.name}</Text>
          </h1>
          <p className="mt-3 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
            <Text>{entity.tagline}</Text>
          </p>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Text>
          {entity.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="btn">
              <Text>{l.label}</Text>{' '}
              <span aria-hidden="true">
                <Text>{'\u2197'}</Text>
              </span>
              <span className="sr-only">
                <Text>{'(nouvel onglet)'}</Text>
              </span>
            </a>
          ))}
        </Text>
        <Text>
          {entity.topics.map((t) => (
            <Link key={t} href={`/topics/${t}`} className="chip hover:bg-hl hover:text-on-hl">
              <Text>{'#'}</Text>
              <Text>{getTopic(t).label}</Text>
            </Link>
          ))}
        </Text>
      </div>

      <LocalizedElement as="nav" className="entity-section-nav" aria-label="Dans cette fiche">
        <Text>
          {appearances.length > 0 ? (
            <a className="chip" href="#entity-rankings">
              <Text>{'Classements'}</Text>
            </a>
          ) : null}
        </Text>
        <a className="chip" href="#takes">
          <Text>{'Notre avis'}</Text>
        </a>
        <a className="chip" href="#about-entity">
          <Text>{'\u00C0 propos'}</Text>
        </a>
        <Text>
          {episodes.length > 0 ? (
            <a className="chip" href="#in-episodes">
              <Text>{'Dans les \u00E9pisodes'}</Text>
            </a>
          ) : null}
        </Text>
      </LocalizedElement>
      <div id="entity-rankings" className="mt-12 grid gap-14">
        <Text>
          {appearances.length > 0 ? (
            appearances.map((a) => <AppearanceBlock key={a.chart.slug} a={a} />)
          ) : (
            <p className="label text-ink-3">
              <Text>{'Cette entit\u00E9 n\u2019est dans aucun classement pour le moment.'}</Text>
            </p>
          )}
        </Text>

        <section aria-labelledby="takes">
          <SectionHead kicker="L’avis de l’équipe, signé" title="Notre avis" id="takes" />
          <Text>
            {takes.length > 0 ? (
              <ul className="m-0 grid list-none gap-5 p-0 md:grid-cols-2">
                <Text>
                  {takes.map((t) => (
                    <li key={t.id} className="flex flex-col gap-1.5">
                      <TakeCard take={t} showDate />
                      <p className="label text-ink-3">
                        <Text>
                          {t.chart && t.week ? (
                            <>
                              À propos de sa place au{' '}
                              <Link
                                href={`/charts/${t.chart.slug}/${t.week}`}
                                className="underline decoration-2 underline-offset-2"
                              >
                                <Text>{t.chart.title}</Text>
                              </Link>
                              , semaine {editionMark(t.week)}
                            </>
                          ) : (
                            'Avis général'
                          )}
                        </Text>
                      </p>
                    </li>
                  ))}
                </Text>
              </ul>
            ) : (
              <p className="text-ink-2">
                <Text>{'Pas encore d\u2019avis sur '}</Text>
                <Text>{entity.name}</Text>
                <Text>{'. Les chiffres, eux, sont ci-dessus.'}</Text>
              </p>
            )}
          </Text>
        </section>

        <section aria-labelledby="about-entity">
          <SectionHead kicker="Éditorial" title="À propos" id="about-entity" />
          <p className="max-w-3xl font-serif text-xl leading-relaxed">
            <Text>{entity.description}</Text>
          </p>
        </section>

        <Text>
          {episodes.length > 0 ? (
            <section aria-labelledby="in-episodes">
              <SectionHead kicker="Où on en parle" title="Dans les épisodes" id="in-episodes" />
              <ul className="m-0 grid list-none gap-4 p-0">
                <Text>
                  {episodes.map(({ episode, mentions }) => (
                    <li
                      key={episode.number}
                      className="grid gap-1 border-t border-hair pt-3 md:grid-cols-[14rem_1fr]"
                    >
                      <p className="label text-ink-2">
                        <Text>{'\u00C9pisode '}</Text>
                        <Text>{episode.number}</Text>
                        <Text>{' \u00B7 '}</Text>
                        <Text>{formatDateShort(episode.publishedAt)}</Text>
                      </p>
                      <div>
                        <Link
                          href={`/episodes/${String(episode.number)}`}
                          className="font-display text-lg font-extrabold hover:underline"
                        >
                          <Text>{episode.title}</Text>
                        </Link>
                        <ul className="m-0 mt-1 flex list-none flex-wrap gap-2 p-0">
                          <Text>
                            {mentions.map((m) => {
                              const idx = episode.mentions.indexOf(m);
                              return (
                                <li key={m.label}>
                                  <Link
                                    href={episodeResourcePath(episode.number, idx)}
                                    className="chip hover:bg-hl hover:text-on-hl"
                                  >
                                    <Text>
                                      {m.at !== undefined ? `▶ ${formatTimestamp(m.at)}` : 'Cité'}
                                    </Text>
                                    <Text>{' \u00B7'}</Text>
                                    <Text> </Text>
                                    <Text>{m.label}</Text>
                                  </Link>
                                </li>
                              );
                            })}
                          </Text>
                        </ul>
                      </div>
                    </li>
                  ))}
                </Text>
              </ul>
            </section>
          ) : null}
        </Text>

        <Text>
          {rivals.length > 0 ? (
            <section aria-labelledby="rivals">
              <SectionHead
                kicker="Alternatives et voisins de classement"
                title="Concurrents"
                id="rivals"
              />
              <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                <Text>
                  {rivals.map((r) => (
                    <EntityCard key={r.slug} entity={r} />
                  ))}
                </Text>
              </div>
            </section>
          ) : null}
        </Text>
      </div>

      <p className="label mt-14 border-t-2 border-ink pt-3 text-ink-3">
        <Text>{'Fiche mise \u00E0 jour avec le relev\u00E9 du'}</Text>
        <Text> </Text>
        <Text>{appearances[0] ? formatDate(appearances[0].publishedAt) : '—'}</Text>
        <Text>
          {
            '. Les donn\u00E9es viennent des sources cit\u00E9es ; les avis sont ceux de l\u2019\u00E9quipe, jamais m\u00E9lang\u00E9s.'
          }
        </Text>
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
              ? { codeRepository: entity.links.find((l) => l.kind === 'github')?.url }
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
