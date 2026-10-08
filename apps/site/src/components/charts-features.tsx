import Link from 'next/link';
import { formatCompact, formatNumber } from '@/domain/format';
import {
  chartMonthRows,
  chartsRecords,
  marketSignals,
  chartFilterLabel,
  type ChartId,
  type ChartsData,
  type ChartsRow,
} from '@/domain/sandbox-charts';
import { weekStart } from '@/domain/weeks';
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
    <section className="sc-movers" aria-label="Les mouvements de la semaine">
      {groups.map((group) => (
        <div className={`sc-feature sc-feature-${group.kind}`} key={group.title}>
          <p className="sc-label">CETTE SEMAINE</p>
          <h2>{group.title}</h2>
          <p className="sc-section-subtitle">{group.subtitle}</p>
          {group.rows.length ? (
            <ul>
              {group.rows.map((row) => (
                <li key={row.entity.slug}>
                  <ChartMovement row={row} />
                  <div>
                    <Link href={row.entity.href}>{row.entity.name}</Link>
                    <p className="sc-label">
                      {row.movement.previousRank ? `#${row.movement.previousRank} → ` : ''}#
                      {row.rank}
                      {row.movement.kind === 'new' && row.rank <= 10
                        ? ' · ENTRÉE DIRECTE DANS LE TOP 10'
                        : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sc-section-empty">{group.empty}</p>
          )}
        </div>
      ))}
    </section>
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
        <p className="sc-label">LA SÉLECTION DE LA RÉDACTION</p>
        <h2 id="sc-watchlist-title">
          SANDBOX
          <br />À SUIVRE<span>.</span>
        </h2>
        <p>Pas encore en tête, mais déjà à suivre.</p>
      </div>
      <div className="sc-watch-items">
        {items.length ? (
          items.map((item, index) => (
            <article key={item.entity.slug}>
              <span className="sc-watch-number">0{index + 1}</span>
              <div>
                <p className="sc-label">{chartFilterLabel(item.entity.category)}</p>
                <h3>
                  <Link href={item.entity.href}>{item.entity.name} ↗</Link>
                </h3>
                <p>{item.reason}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="sc-watch-pending">
            L'équipe n'a pas encore ajouté sa sélection pour cette édition.
          </p>
        )}
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
          <p className="sc-label">SUIVRE L’ATTENTION</p>
          <h2 id="sc-market-title">SIGNAUX DU MARCHÉ</h2>
        </div>
        <p>
          Variation des étoiles gagnées par les dépôts suivis,
          <br />
          sur une cohorte identique à la semaine précédente.
        </p>
      </div>
      {signals.length ? (
        <div className="sc-signals">
          {signals.map((signal) => (
            <div className="sc-signal" key={signal.category}>
              <div>
                <h3>{chartFilterLabel(signal.category)}</h3>
                <strong
                  className={signal.change !== null && signal.change >= 0 ? 'sc-up' : 'sc-down'}
                >
                  {signal.change === null
                    ? '-'
                    : `${signal.change >= 0 ? '↑' : '↓'}${formatNumber(Math.abs(signal.change), 0)}%`}
                </strong>
              </div>
              <div className="sc-signal-bar">
                <i
                  style={{ width: `${Math.max(2, (Math.abs(signal.change ?? 0) / max) * 100)}%` }}
                />
              </div>
              <p className="sc-label">
                {signal.candidates} dépôts · +{formatCompact(signal.stars)} étoiles
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="sc-section-empty">
          Deux semaines de mesures sont nécessaires pour lire ces signaux.
        </p>
      )}
    </section>
  );
}
export function ChartsMonthly({ data, week }: { data: ChartsData; week: string }) {
  const month = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(weekStart(week));
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
        <p className="sc-label">SANDBOX CHARTS / ÉDITION MENSUELLE</p>
        <h2 id="sc-monthly-title">
          {month.split(' ')[0]}
          <br />
          <span>{month.split(' ')[1]}</span>
        </h2>
        <p>{headline ?? 'Les projets qui ont tenu les premières places ce mois-ci.'}</p>
        <p className="sc-label">
          Édition en cours · semaines disponibles jusqu'à W{week.slice(-2)}
        </p>
      </div>
      <div className="sc-monthly-winners">
        {leaders.map(({ id, first }) => (
          <div key={id}>
            <span className="sc-label">
              Nº 1 {id === 'models' ? 'MODÈLE' : id === 'skills' ? 'SKILL' : 'PROJET GITHUB'}
            </span>
            <Link href={first.entity.href}>{first.entity.name} ↗</Link>
          </div>
        ))}
        {entity ? (
          <div>
            <span className="sc-label">CHOIX DE SANDBOX</span>
            <Link href={entity.href}>{entity.name} ↗</Link>
          </div>
        ) : null}
        {!leaders.length ? (
          <p>La couverture mensuelle sera disponible après la première édition.</p>
        ) : (
          <p className="sc-label">Calculé depuis les positions hebdomadaires du mois.</p>
        )}
      </div>
    </section>
  );
}
export function ChartsRecords({ data, id, week }: { data: ChartsData; id: ChartId; week: string }) {
  const records = chartsRecords(data, id, week);
  if (!records.length) return null;
  return (
    <section className="sc-records" aria-label="Records du classement">
      <h2 className="sc-label">LES RECORDS</h2>
      <div>
        {records.map((record) => (
          <article key={record.label}>
            <p className="sc-label">{record.label}</p>
            <strong>{record.value}</strong>
            <Link href={record.entity.href}>{record.entity.name}</Link>
            <small>Mesuré sur l'historique disponible.</small>
          </article>
        ))}
      </div>
    </section>
  );
}
