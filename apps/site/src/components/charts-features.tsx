import { Text, LocalizedElement, useLocalization } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { formatCompact, formatNumber } from '@/domain/format';
import {
  chartFilterLabel,
  chartMonthRows,
  chartsRecords,
  marketSignals,
  type ChartId,
  type ChartsData,
  type ChartsRow,
} from '@/domain/sandbox-charts';
import { editionMark, editionStart } from '@/domain/weeks';
import { intlLocale } from '@/i18n/translation';
import { ChartMovement } from './charts-ranking';
export function ChartsMovers({ rows }: { rows: ChartsRow[] }) {
  const groups = [
    {
      title: 'PLUS FORTES HAUSSES',
      subtitle: 'Les progressions les plus nettes cette semaine.',
      kind: 'up',
      rows: rows
        .filter((row) => !row.baseline && row.movement.delta > 0)
        .toSorted((a, b) => b.movement.delta - a.movement.delta)
        .slice(0, 3),
      empty: 'Aucune hausse de rang cette semaine.',
    },
    {
      title: 'NOUVEAUX CETTE SEMAINE',
      subtitle: 'Les nouvelles entrées dans le classement.',
      kind: 'new',
      rows: rows.filter((row) => !row.baseline && row.movement.kind === 'new').slice(0, 3),
      empty: 'Aucune nouvelle entrée cette semaine.',
    },
    {
      title: 'EN BAISSE',
      subtitle: 'Les projets qui reculent cette semaine.',
      kind: 'down',
      rows: rows
        .filter((row) => !row.baseline && row.movement.delta < 0)
        .toSorted((a, b) => a.movement.delta - b.movement.delta)
        .slice(0, 3),
      empty: 'Aucune baisse de rang cette semaine.',
    },
  ];
  return (
    <LocalizedElement as="section" className="sc-movers" aria-label="Les mouvements de la semaine">
      <Text>
        {groups.map((group) => (
          <div className={`sc-feature sc-feature-${group.kind}`} key={group.title}>
            <p className="sc-label">
              <Text>{'CETTE SEMAINE'}</Text>
            </p>
            <h2>
              <Text>{group.title}</Text>
            </h2>
            <p className="sc-section-subtitle">
              <Text>{group.subtitle}</Text>
            </p>
            <Text>
              {group.rows.length ? (
                <ul>
                  <Text>
                    {group.rows.map((row) => (
                      <li key={row.entity.slug}>
                        <ChartMovement row={row} />
                        <div>
                          <Link href={row.entity.href}>
                            <Text>{row.entity.name}</Text>
                          </Link>
                          <p className="sc-label">
                            <Text>
                              {row.movement.previousRank ? `#${row.movement.previousRank} → ` : ''}
                            </Text>
                            <Text>{'#'}</Text>
                            <Text>{row.rank}</Text>
                            <Text>
                              {row.movement.kind === 'new' && row.rank <= 10
                                ? ' · ENTRÉE DIRECTE DANS LE TOP 10'
                                : ''}
                            </Text>
                          </p>
                        </div>
                      </li>
                    ))}
                  </Text>
                </ul>
              ) : (
                <p className="sc-section-empty">
                  <Text>{group.empty}</Text>
                </p>
              )}
            </Text>
          </div>
        ))}
      </Text>
    </LocalizedElement>
  );
}
export function ChartsWatchlist({
  data,
  id,
  week,
}: {
  data: ChartsData;
  id: ChartId;
  week: string;
}) {
  const edition = data.series
    .find((item) => item.id === id)
    ?.editions.find((item) => item.week === week);
  const items =
    edition?.watchlist.flatMap((item) => {
      const entity = data.entities.find((candidate) => candidate.slug === item.entity);
      return entity ? [{ ...item, entity }] : [];
    }) ?? [];
  return (
    <section className="sc-watchlist" aria-labelledby="sc-watchlist-title">
      <div>
        <p className="sc-label">
          <Text>{'LA SÉLECTION DE LA RÉDACTION'}</Text>
        </p>
        <h2 id="sc-watchlist-title">
          <Text>{'SANDBOX'}</Text>
          <br />
          <Text>{'À SUIVRE'}</Text>
          <span>
            <Text>{'.'}</Text>
          </span>
        </h2>
        <p>
          <Text>{'Pas encore en tête, mais déjà à suivre.'}</Text>
        </p>
      </div>
      <div className="sc-watch-items">
        <Text>
          {items.length ? (
            items.map((item, index) => (
              <article key={item.entity.slug}>
                <span className="sc-watch-number">
                  <Text>{'0'}</Text>
                  <Text>{index + 1}</Text>
                </span>
                <div>
                  <p className="sc-label">
                    <Text namespace="category">{chartFilterLabel(item.entity.category)}</Text>
                  </p>
                  <h3>
                    <Link href={item.entity.href}>
                      <Text>{item.entity.name}</Text>
                      <Text>{' \u2197'}</Text>
                    </Link>
                  </h3>
                  <p>
                    <Text>{item.reason}</Text>
                  </p>
                </div>
              </article>
            ))
          ) : (
            <p className="sc-watch-pending">
              <Text>
                {
                  "L'\u00E9quipe n'a pas encore ajout\u00E9 sa s\u00E9lection pour cette \u00E9dition."
                }
              </Text>
            </p>
          )}
        </Text>
      </div>
    </section>
  );
}
export function ChartsMarket({ data, week }: { data: ChartsData; week: string }) {
  const signals = marketSignals(data, week).filter((signal) => signal.candidates > 0);
  const max = Math.max(1, ...signals.map((signal) => Math.abs(signal.change ?? 0)));
  return (
    <section className="sc-market" aria-labelledby="sc-market-title">
      <div className="sc-section-heading">
        <div>
          <p className="sc-label">
            <Text>{'SUIVRE L’ATTENTION'}</Text>
          </p>
          <h2 id="sc-market-title">
            <Text>{'SIGNAUX DU MARCHÉ'}</Text>
          </h2>
        </div>
        <p>
          <Text>{'Variation des étoiles gagnées par les dépôts suivis,'}</Text>
          <br />
          <Text>{'sur une cohorte identique \u00E0 la semaine pr\u00E9c\u00E9dente.'}</Text>
        </p>
      </div>
      <Text>
        {signals.length ? (
          <div className="sc-signals">
            <Text>
              {signals.map((signal) => (
                <div className="sc-signal" key={signal.category}>
                  <div>
                    <h3>
                      <Text>{chartFilterLabel(signal.category)}</Text>
                    </h3>
                    <strong
                      className={signal.change !== null && signal.change >= 0 ? 'sc-up' : 'sc-down'}
                    >
                      <Text>
                        {signal.change === null
                          ? '-'
                          : `${signal.change >= 0 ? '↑' : '↓'}${formatNumber(Math.abs(signal.change), 0)}%`}
                      </Text>
                    </strong>
                  </div>
                  <div className="sc-signal-bar">
                    <i
                      style={{
                        width: `${Math.max(2, (Math.abs(signal.change ?? 0) / max) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="sc-label">
                    <Text>{signal.candidates}</Text>
                    <Text>{' d\u00E9p\u00F4ts \u00B7 +'}</Text>
                    <Text>{formatCompact(signal.stars)}</Text>
                    <Text>{' étoiles'}</Text>
                  </p>
                </div>
              ))}
            </Text>
          </div>
        ) : (
          <p className="sc-section-empty">
            <Text>{'Deux semaines de mesures sont n\u00E9cessaires pour lire ces signaux.'}</Text>
          </p>
        )}
      </Text>
    </section>
  );
}
export function ChartsMonthly({ data, week }: { data: ChartsData; week: string }) {
  const { locale } = useLocalization();
  const month = new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(editionStart(week));
  const leaders = (['github', 'skills', 'models'] as const).flatMap((id) => {
    const first = chartMonthRows(data, id, week)[0];
    return first ? [{ id, first }] : [];
  });
  const headline = data.series
    .flatMap((item) => item.editions)
    .find((item) => item.week === week && item.monthlyHeadline)?.monthlyHeadline;
  const pick = data.series.flatMap((item) => item.editions).find((item) => item.week === week)
    ?.watchlist[0];
  const entity = pick ? data.entities.find((item) => item.slug === pick.entity) : undefined;
  return (
    <section className="sc-monthly" aria-labelledby="sc-monthly-title">
      <div className="sc-monthly-cover">
        <p className="sc-label">
          <Text>{'SANDBOX CHARTS / ÉDITION MENSUELLE'}</Text>
        </p>
        <h2 id="sc-monthly-title">
          <Text>{month.split(' ')[0]}</Text>
          <br />
          <span>
            <Text>{month.split(' ')[1]}</Text>
          </span>
        </h2>
        <p>
          <Text>{headline ?? 'Les projets qui ont tenu les premières places ce mois-ci.'}</Text>
        </p>
        <p className="sc-label">
          <Text>{'\u00C9dition en cours \u00B7 jusqu\u2019\u00E0 '}</Text>
          <Text>{editionMark(week)}</Text>
        </p>
      </div>
      <div className="sc-monthly-winners">
        <Text>
          {leaders.map(({ id, first }) => (
            <div key={id}>
              <span className="sc-label">
                <Text>{'Nº 1 '}</Text>
                <Text>
                  {id === 'models' ? 'MODÈLE' : id === 'skills' ? 'SKILL' : 'PROJET GITHUB'}
                </Text>
              </span>
              <Link href={first.entity.href}>
                <Text>{first.entity.name}</Text>
                <Text>{' \u2197'}</Text>
              </Link>
            </div>
          ))}
        </Text>
        <Text>
          {entity ? (
            <div>
              <span className="sc-label">
                <Text>{'CHOIX DE SANDBOX'}</Text>
              </span>
              <Link href={entity.href}>
                <Text>{entity.name}</Text>
                <Text>{' \u2197'}</Text>
              </Link>
            </div>
          ) : null}
        </Text>
        <Text>
          {!leaders.length ? (
            <p>
              <Text>
                {
                  'La couverture mensuelle sera disponible apr\u00E8s la premi\u00E8re \u00E9dition.'
                }
              </Text>
            </p>
          ) : (
            <p className="sc-label">
              <Text>{'Calcul\u00E9 depuis les positions hebdomadaires du mois.'}</Text>
            </p>
          )}
        </Text>
      </div>
    </section>
  );
}
export function ChartsRecords({ data, id, week }: { data: ChartsData; id: ChartId; week: string }) {
  const records = chartsRecords(data, id, week);
  if (!records.length) return null;
  return (
    <LocalizedElement as="section" className="sc-records" aria-label="Records du classement">
      <h2 className="sc-label">
        <Text>{'LES RECORDS'}</Text>
      </h2>
      <div>
        <Text>
          {records.map((record) => (
            <article key={record.label}>
              <p className="sc-label">
                <Text>{record.label}</Text>
              </p>
              <strong>
                <Text>{record.value}</Text>
              </strong>
              <Link href={record.entity.href}>
                <Text>{record.entity.name}</Text>
              </Link>
              <small>
                <Text>{"Mesur\u00E9 sur l'historique disponible."}</Text>
              </small>
            </article>
          ))}
        </Text>
      </div>
    </LocalizedElement>
  );
}
