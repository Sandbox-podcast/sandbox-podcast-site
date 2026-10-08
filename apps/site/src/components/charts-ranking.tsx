import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
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
    <LocalizedElement
      as="span"
      className={`sc-movement sc-movement-${baseline ? 'stable' : movement.kind}`}
      aria-label={label}
    >
      <Text>{visual}</Text>
    </LocalizedElement>
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
  if (known.length < 2)
    return (
      <span className="sc-spark-empty">
        <Text>{'Historique en cours'}</Text>
      </span>
    );
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
    <LocalizedElement
      as="svg"
      className="sc-spark"
      viewBox="0 0 116 40"
      role="img"
      aria-label={`${label} : ${values.map((value) => (value === null ? 'absent' : formatNumber(value))).join(', ')}`}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4,38H112" stroke="currentColor" opacity="0.2" />
    </LocalizedElement>
  );
}
export function MomentumValue({ row, period }: { row: ChartsRow; period: ChartPeriod }) {
  return (
    <div className="sc-momentum">
      <strong>
        <Text>
          {row.periodStars !== null ? signedCompact(row.periodStars) : formatNumber(row.score, 1)}
        </Text>
      </strong>
      <span>
        <Text>
          {row.periodStars !== null ? 'STARS' : period === 'week' ? 'SANDBOX SCORE' : 'CHART INDEX'}
        </Text>
      </span>
    </div>
  );
}
export function ChartsPodium({ rows, period }: { rows: ChartsRow[]; period: ChartPeriod }) {
  const leader = rows[0];
  if (!leader) return null;
  return (
    <LocalizedElement as="section" className="sc-podium" aria-label="Le podium">
      <article className="sc-leader">
        <LocalizedElement as="div" className="sc-leader-rank" aria-label={`Numéro ${leader.rank}`}>
          <Text>{String(leader.rank).padStart(2, '0')}</Text>
        </LocalizedElement>
        <div className="sc-leader-copy">
          <p className="sc-label">
            <Text>{leader.rank === 1 ? 'THE ONE TO BEAT' : 'LEADING THIS VIEW'}</Text>
          </p>
          <h3>
            <Link href={leader.entity.href}>
              <Text>{leader.entity.name}</Text>
            </Link>
          </h3>
          <p className="sc-leader-description">
            <Text>{leader.entity.tagline}</Text>
          </p>
          <div className="sc-leader-numbers">
            <ChartMovement row={leader} />
            <MomentumValue row={leader} period={period} />
            <Text>
              {leader.metrics['growth'] !== undefined ? (
                <span className="sc-growth">
                  <Text>{signedGrowth(leader.metrics['growth'])}</Text>
                  <small>
                    <Text>{'GROWTH'}</Text>
                  </small>
                </span>
              ) : null}
            </Text>
          </div>
          <Text>
            {leader.take ? (
              <div className="sc-podium-take">
                <span className="sc-label">
                  <Text>{'SANDBOX TAKE'}</Text>
                </span>
                <p>
                  <Text>{leader.take.text}</Text>
                </p>
              </div>
            ) : null}
          </Text>
        </div>
      </article>
      <div className="sc-runners">
        <Text>
          {rows.slice(1, 3).map((row) => (
            <article className="sc-runner" key={row.entity.slug}>
              <span className="sc-runner-rank">
                <Text>{String(row.rank).padStart(2, '0')}</Text>
              </span>
              <div>
                <p className="sc-label">
                  <Text namespace="category">{row.entity.category}</Text>
                </p>
                <h3>
                  <Link href={row.entity.href}>
                    <Text>{row.entity.name}</Text>
                  </Link>
                </h3>
                <div className="sc-runner-data">
                  <ChartMovement row={row} />
                  <MomentumValue row={row} period={period} />
                </div>
              </div>
            </article>
          ))}
        </Text>
      </div>
    </LocalizedElement>
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
        <span className="sc-label">
          <Text>{'NO ENTRIES'}</Text>
        </span>
        <h3>
          <Text>{'Aucune entr\u00E9e pour cette s\u00E9lection.'}</Text>
        </h3>
        <p>
          <Text>{'Essayez une autre cat\u00E9gorie ou une autre semaine.'}</Text>
        </p>
      </div>
    );
  return (
    <LocalizedElement as="ol" className="sc-ranking" aria-label="Classement et mouvements">
      <Text>
        {rows.map((row) => (
          <li key={row.entity.slug}>
            <details className="sc-row" data-lead={row.rank === 1}>
              <summary>
                <span className="sc-row-rank">
                  <Text>{String(row.rank).padStart(2, '0')}</Text>
                </span>
                <ChartMovement row={row} />
                <div className="sc-row-identity">
                  <h3>
                    <Text>{row.entity.name}</Text>
                  </h3>
                  <p>
                    <Text>{row.entity.github?.repo ?? row.entity.org ?? row.entity.category}</Text>
                  </p>
                  <div className="sc-row-meta">
                    <span>
                      <Text namespace="category">{row.entity.category}</Text>
                    </span>
                    <Text>
                      {series?.id === 'skills' ? (
                        <span className="sc-label">
                          <Text>{row.status}</Text>
                        </span>
                      ) : null}
                    </Text>
                  </div>
                </div>
                <MomentumValue row={row} period={period} />
                <div className="sc-row-growth">
                  <Text>
                    {row.metrics['growth'] !== undefined ? (
                      <strong>
                        <Text>{signedGrowth(row.metrics['growth'])}</Text>
                      </strong>
                    ) : (
                      <strong>
                        <Text>
                          {row.entity.kind === 'model' && row.metrics['tps'] !== undefined
                            ? `${formatNumber(row.metrics['tps'])} tok/s`
                            : `${formatNumber(row.score, 1)}/100`}
                        </Text>
                      </strong>
                    )}
                  </Text>
                  <span className="sc-label">
                    <Text>
                      {row.metrics['growth'] !== undefined
                        ? 'GROWTH'
                        : row.entity.kind === 'model'
                          ? 'SPEED'
                          : 'SCORE'}
                    </Text>
                  </span>
                </div>
                <div className="sc-row-spark">
                  <MomentumSpark values={row.momentum} />
                </div>
                <span className="sc-row-open" aria-hidden="true">
                  <Text>{'+'}</Text>
                </span>
              </summary>
              <div className="sc-row-detail">
                <div className="sc-explanations">
                  <div>
                    <h4 className="sc-label">
                      <Text>{'WHAT IT IS'}</Text>
                    </h4>
                    <p>
                      <Text>
                        {[row.insight?.whatItIs, row.entity.description, row.entity.tagline].find(
                          (text) => text !== undefined && text.length > 0,
                        ) ?? ''}
                      </Text>
                    </p>
                  </div>
                  <div className="sc-data-explanation">
                    <h4 className="sc-label">
                      <Text>{"WHY IT'S TRENDING "}</Text>
                      <span>
                        <Text>{'DATA'}</Text>
                      </span>
                    </h4>
                    <p>
                      <Text>
                        {row.periodStars !== null
                          ? `${formatNumber(Math.abs(row.periodStars))} stars ${row.periodStars < 0 ? 'perdues' : 'gagnées'} sur les relevés de cette période.`
                          : `Score ${period === 'week' ? 'SANDBOX' : 'de présence'} : ${formatNumber(row.score, 1)} sur 100.`}
                      </Text>
                      <Text>
                        {!row.baseline && row.movement.delta !== 0
                          ? ` ${Math.abs(row.movement.delta)} places ${row.movement.delta > 0 ? 'gagnées' : 'perdues'} depuis la période précédente.`
                          : ''}
                      </Text>
                    </p>
                  </div>
                  <Text>
                    {row.insight?.whyTrending ? (
                      <div>
                        <h4 className="sc-label">
                          <Text>{'LECTURE SANDBOX'}</Text>
                        </h4>
                        <p>
                          <Text>{row.insight.whyTrending}</Text>
                        </p>
                      </div>
                    ) : null}
                  </Text>
                  <Text>
                    {row.insight?.whyMatters ? (
                      <div>
                        <h4 className="sc-label">
                          <Text>{'WHY IT MATTERS'}</Text>
                        </h4>
                        <p>
                          <Text>{row.insight.whyMatters}</Text>
                        </p>
                      </div>
                    ) : null}
                  </Text>
                  <Text>
                    {row.insight?.bestFor.length ? (
                      <div>
                        <h4 className="sc-label">
                          <Text>{'BEST FOR'}</Text>
                        </h4>
                        <p>
                          <Text>{row.insight.bestFor.join(' · ')}</Text>
                        </p>
                      </div>
                    ) : null}
                  </Text>
                  <Text>
                    {row.take ? (
                      <blockquote className="sc-take">
                        <span className="sc-label">
                          <Text>{'SANDBOX TAKE'}</Text>
                        </span>
                        <p>
                          <Text>{row.take.text}</Text>
                        </p>
                        <cite>
                          <Text>{row.take.author}</Text>
                        </cite>
                      </blockquote>
                    ) : null}
                  </Text>
                </div>
                <div className="sc-row-history">
                  <h4 className="sc-label">
                    <Text>{'30 DAYS MOMENTUM'}</Text>
                  </h4>
                  <MomentumSpark
                    values={row.momentum}
                    label="Relevés hebdomadaires sur environ 30 jours"
                  />
                  <div className="sc-rank-history">
                    <Text>
                      {row.rankSeries.map((point) => (
                        <span key={point.week}>
                          <small>
                            <Text>{'W'}</Text>
                            <Text>{point.week.slice(-2)}</Text>
                          </small>
                          <b>
                            <Text>{point.rank === null ? '-' : `#${point.rank}`}</Text>
                          </b>
                        </span>
                      ))}
                    </Text>
                  </div>
                  <p className="sc-label">
                    <Text>{row.weeksInTop}</Text>
                    <Text>{' semaines dans le Top 20 \u00B7 meilleur rang #'}</Text>
                    <Text>{row.peak ?? '-'}</Text>
                  </p>
                  <div className="sc-row-actions">
                    <Link href={row.entity.href}>
                      <Text>{'Ouvrir la fiche \u2197'}</Text>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        onShare(row);
                      }}
                    >
                      <Text>{'SHARE RANKING \u2197'}</Text>
                    </button>
                  </div>
                </div>
                <details className="sc-metrics">
                  <summary>
                    <Text>{'Mesures, composants du score et sources'}</Text>
                  </summary>
                  <dl>
                    <Text>
                      {Object.entries(row.metrics).map(([key, value]) => {
                        const metric = series?.metrics.find((item) => item.key === key);
                        return (
                          <div key={key}>
                            <dt>
                              <Text>{metric?.label ?? key}</Text>
                            </dt>
                            <dd>
                              <Text>{formatNumber(value, Number.isInteger(value) ? 0 : 1)}</Text>
                            </dd>
                            <span>
                              <Text>
                                {metric ? (
                                  <a href={metric.url} target="_blank" rel="noreferrer">
                                    <Text>{metric.source}</Text>
                                    <Text>{' \u2197'}</Text>
                                  </a>
                                ) : (
                                  'Calculé depuis les relevés'
                                )}
                              </Text>
                            </span>
                          </div>
                        );
                      })}
                    </Text>
                  </dl>
                  <p className="sc-label">
                    <Text>{'Composants du score'}</Text>
                  </p>
                  <dl>
                    <Text>
                      {Object.entries(row.dimensions).map(([key, value]) => (
                        <div key={key}>
                          <dt>
                            <Text>
                              {series?.dimensions.find((item) => item.id === key)?.label ?? key}
                            </Text>
                          </dt>
                          <dd>
                            <Text>{formatNumber(value, 1)}</Text>
                            <Text>{'/100'}</Text>
                          </dd>
                        </div>
                      ))}
                    </Text>
                  </dl>
                </details>
              </div>
            </details>
          </li>
        ))}
      </Text>
    </LocalizedElement>
  );
}
