import Link from 'next/link';
import { formatCompact, formatNumber } from '@/domain/format';
import type { ChartsRow, ChartsSeries, ChartPeriod } from '@/domain/sandbox-charts';

const signedCompact = (value: number): string => `${value > 0 ? '+' : ''}${formatCompact(value)}`;
const signedGrowth = (value: number): string => `${value > 0 ? '+' : ''}${formatNumber(value, 1)}%`;

export function ChartMovement({ row }: { row: ChartsRow }) {
  const { movement, baseline } = row;
  const visual = baseline
    ? '-'
    : movement.kind === 'new'
      ? 'NEW'
      : movement.kind === 're'
        ? 'RE'
        : movement.delta > 0
          ? `↑${movement.delta.toString().padStart(2, '0')}`
          : movement.delta < 0
            ? `↓${Math.abs(movement.delta).toString().padStart(2, '0')}`
            : '=';
  const label = baseline
    ? 'Pas de période précédente disponible'
    : movement.kind === 'new'
      ? 'Nouvelle entrée dans ce classement'
      : movement.kind === 're'
        ? 'Retour dans ce classement'
        : movement.delta > 0
          ? `${movement.delta} places gagnées`
          : movement.delta < 0
            ? `${Math.abs(movement.delta)} places perdues`
            : 'Position inchangée';
  return (
    <span
      className={`sc-movement sc-movement-${baseline ? 'stable' : movement.kind}`}
      aria-label={label}
    >
      {visual}
    </span>
  );
}
export function MomentumSpark({
  values,
  label = 'Momentum des cinq derniers relevés',
}: {
  values: (number | null)[];
  label?: string;
}) {
  const known = values.filter((value): value is number => value !== null);
  if (known.length < 2) return <span className="sc-spark-empty">Historique en cours</span>;
  const min = Math.min(...known);
  const max = Math.max(...known);
  let d = '';
  let segment = false;
  values.forEach((value, index) => {
    if (value === null) {
      segment = false;
      return;
    }
    const x = 4 + (index * 108) / Math.max(1, values.length - 1);
    const y = 34 - ((value - min) / Math.max(1, max - min)) * 28;
    d += `${segment ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `;
    segment = true;
  });
  return (
    <svg
      className="sc-spark"
      viewBox="0 0 116 40"
      role="img"
      aria-label={`${label} : ${values.map((value) => (value === null ? 'absent' : formatNumber(value))).join(', ')}`}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4,38H112" stroke="currentColor" opacity="0.2" />
    </svg>
  );
}
export function MomentumValue({ row, period }: { row: ChartsRow; period: ChartPeriod }) {
  return (
    <div className="sc-momentum">
      <strong>
        {row.periodStars !== null ? signedCompact(row.periodStars) : formatNumber(row.score, 1)}
      </strong>
      <span>
        {row.periodStars !== null ? 'STARS' : period === 'week' ? 'SANDBOX SCORE' : 'CHART INDEX'}
      </span>
    </div>
  );
}
export function ChartsPodium({ rows, period }: { rows: ChartsRow[]; period: ChartPeriod }) {
  const leader = rows[0];
  if (!leader) return null;
  return (
    <section className="sc-podium" aria-label="Le podium">
      <article className="sc-leader">
        <div className="sc-leader-rank" aria-label={`Numéro ${leader.rank}`}>
          {String(leader.rank).padStart(2, '0')}
        </div>
        <div className="sc-leader-copy">
          <p className="sc-label">{leader.rank === 1 ? 'THE ONE TO BEAT' : 'LEADING THIS VIEW'}</p>
          <h3>
            <Link href={leader.entity.href}>{leader.entity.name}</Link>
          </h3>
          <p className="sc-leader-description">{leader.entity.tagline}</p>
          <div className="sc-leader-numbers">
            <ChartMovement row={leader} />
            <MomentumValue row={leader} period={period} />
            {leader.metrics['growth'] !== undefined ? (
              <span className="sc-growth">
                {signedGrowth(leader.metrics['growth'])}
                <small>GROWTH</small>
              </span>
            ) : null}
          </div>
          {leader.take ? (
            <div className="sc-podium-take">
              <span className="sc-label">SANDBOX TAKE</span>
              <p>{leader.take.text}</p>
            </div>
          ) : null}
        </div>
      </article>
      <div className="sc-runners">
        {rows.slice(1, 3).map((row) => (
          <article className="sc-runner" key={row.entity.slug}>
            <span className="sc-runner-rank">{String(row.rank).padStart(2, '0')}</span>
            <div>
              <p className="sc-label">{row.entity.category}</p>
              <h3>
                <Link href={row.entity.href}>{row.entity.name}</Link>
              </h3>
              <div className="sc-runner-data">
                <ChartMovement row={row} />
                <MomentumValue row={row} period={period} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
export function ChartsRanking({
  rows,
  series,
  period,
  onShare,
}: {
  rows: ChartsRow[];
  series: ChartsSeries | undefined;
  period: ChartPeriod;
  onShare: (row: ChartsRow) => void;
}) {
  if (!rows.length)
    return (
      <div className="sc-empty" role="status">
        <span className="sc-label">NO ENTRIES</span>
        <h3>Aucune entrée pour cette sélection.</h3>
        <p>Essayez une autre catégorie ou une autre semaine.</p>
      </div>
    );
  return (
    <ol className="sc-ranking" aria-label="Classement et mouvements">
      {rows.map((row) => (
        <li key={row.entity.slug}>
          <details className="sc-row" data-lead={row.rank === 1}>
            <summary>
              <span className="sc-row-rank">{String(row.rank).padStart(2, '0')}</span>
              <ChartMovement row={row} />
              <div className="sc-row-identity">
                <h3>{row.entity.name}</h3>
                <p>{row.entity.github?.repo ?? row.entity.org ?? row.entity.category}</p>
                <div className="sc-row-meta">
                  <span>{row.entity.category}</span>
                  {series?.id === 'skills' ? <span className="sc-label">{row.status}</span> : null}
                </div>
              </div>
              <MomentumValue row={row} period={period} />
              <div className="sc-row-growth">
                {row.metrics['growth'] !== undefined ? (
                  <strong>{signedGrowth(row.metrics['growth'])}</strong>
                ) : (
                  <strong>
                    {row.entity.kind === 'model' && row.metrics['tps'] !== undefined
                      ? `${formatNumber(row.metrics['tps'])} tok/s`
                      : `${formatNumber(row.score, 1)}/100`}
                  </strong>
                )}
                <span className="sc-label">
                  {row.metrics['growth'] !== undefined
                    ? 'GROWTH'
                    : row.entity.kind === 'model'
                      ? 'SPEED'
                      : 'SCORE'}
                </span>
              </div>
              <div className="sc-row-spark">
                <MomentumSpark values={row.momentum} />
              </div>
              <span className="sc-row-open" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="sc-row-detail">
              <div className="sc-explanations">
                <div>
                  <h4 className="sc-label">WHAT IT IS</h4>
                  <p>
                    {[row.insight?.whatItIs, row.entity.description, row.entity.tagline].find(
                      (text) => text !== undefined && text.length > 0,
                    ) ?? ''}
                  </p>
                </div>
                <div className="sc-data-explanation">
                  <h4 className="sc-label">
                    WHY IT'S TRENDING <span>DATA</span>
                  </h4>
                  <p>
                    {row.periodStars !== null
                      ? `${formatNumber(Math.abs(row.periodStars))} stars ${row.periodStars < 0 ? 'perdues' : 'gagnées'} sur les relevés de cette période.`
                      : `Score ${period === 'week' ? 'SANDBOX' : 'de présence'} : ${formatNumber(row.score, 1)} sur 100.`}
                    {!row.baseline && row.movement.delta !== 0
                      ? ` ${Math.abs(row.movement.delta)} places ${row.movement.delta > 0 ? 'gagnées' : 'perdues'} depuis la période précédente.`
                      : ''}
                  </p>
                </div>
                {row.insight?.whyTrending ? (
                  <div>
                    <h4 className="sc-label">LECTURE SANDBOX</h4>
                    <p>{row.insight.whyTrending}</p>
                  </div>
                ) : null}
                {row.insight?.whyMatters ? (
                  <div>
                    <h4 className="sc-label">WHY IT MATTERS</h4>
                    <p>{row.insight.whyMatters}</p>
                  </div>
                ) : null}
                {row.insight?.bestFor.length ? (
                  <div>
                    <h4 className="sc-label">BEST FOR</h4>
                    <p>{row.insight.bestFor.join(' · ')}</p>
                  </div>
                ) : null}
                {row.take ? (
                  <blockquote className="sc-take">
                    <span className="sc-label">SANDBOX TAKE</span>
                    <p>{row.take.text}</p>
                    <cite>{row.take.author}</cite>
                  </blockquote>
                ) : null}
              </div>
              <div className="sc-row-history">
                <h4 className="sc-label">30 DAYS MOMENTUM</h4>
                <MomentumSpark
                  values={row.momentum}
                  label="Relevés hebdomadaires sur environ 30 jours"
                />
                <div className="sc-rank-history">
                  {row.rankSeries.map((point) => (
                    <span key={point.week}>
                      <small>W{point.week.slice(-2)}</small>
                      <b>{point.rank === null ? '-' : `#${point.rank}`}</b>
                    </span>
                  ))}
                </div>
                <p className="sc-label">
                  {row.weeksInTop} semaines dans le Top 20 · meilleur rang #{row.peak ?? '-'}
                </p>
                <div className="sc-row-actions">
                  <Link href={row.entity.href}>Ouvrir la fiche ↗</Link>
                  <button
                    type="button"
                    onClick={() => {
                      onShare(row);
                    }}
                  >
                    SHARE RANKING ↗
                  </button>
                </div>
              </div>
              <details className="sc-metrics">
                <summary>Mesures, composants du score et sources</summary>
                <dl>
                  {Object.entries(row.metrics).map(([key, value]) => {
                    const metric = series?.metrics.find((item) => item.key === key);
                    return (
                      <div key={key}>
                        <dt>{metric?.label ?? key}</dt>
                        <dd>{formatNumber(value, Number.isInteger(value) ? 0 : 1)}</dd>
                        <span>
                          {metric ? (
                            <a href={metric.url} target="_blank" rel="noreferrer">
                              {metric.source} ↗
                            </a>
                          ) : (
                            'Calculé depuis les relevés'
                          )}
                        </span>
                      </div>
                    );
                  })}
                </dl>
                <p className="sc-label">Composants du score</p>
                <dl>
                  {Object.entries(row.dimensions).map(([key, value]) => (
                    <div key={key}>
                      <dt>{series?.dimensions.find((item) => item.id === key)?.label ?? key}</dt>
                      <dd>{formatNumber(value, 1)}/100</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}
