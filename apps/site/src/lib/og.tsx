import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { siteConfig } from '@/config/site';
import { formatCompact, formatDayMonth, formatNumber, padRank } from '@/domain/format';
import { editionEnd, editionMark, editionStart } from '@/domain/weeks';
import { highlightHeadline } from './moves';
import type { ChartView, Highlight } from './repository';
import type { Entity, Episode, Story } from '@/domain/schema';
import { hasDemoSnapshots } from '@/domain/demo-content';
import { historyCurve, type TimeMachineData } from '@/domain/time-machine';
import {
  chartRows,
  CHART_LABELS,
  editionWeekForChart,
  type ChartId,
  type ChartsData,
} from '@/domain/sandbox-charts';

/**
 * Cartes OpenGraph (1200×630) pour X, LinkedIn, Discord et Slack. Satori n'accepte ni les polices variables
 * ni le WOFF2 : on lit les fichiers WOFF statiques des paquets Fontsource.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_TYPE = 'image/png';

export function timeMachineCard(data: TimeMachineData) {
  const points = historyCurve(data.events, data.fromYear, data.toYear);
  const path = points.reduce((line, point, index) => {
    const x = 26 + point.x * 400;
    const previousY = 280 - (points[index - 1]?.y ?? 0) * 234;
    const y = 280 - point.y * 234;
    return `${line} L${x.toFixed(1)},${previousY.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)}`;
  }, 'M26,280');
  return render(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: 1200,
        height: 630,
        background: '#07121c',
        color: '#f4f7fa',
        padding: '48px 60px',
        fontFamily: 'Archivo',
        borderTop: '6px solid #50d9ee',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'Mono',
          fontSize: 20,
          color: '#8eb3c7',
        }}
      >
        <span style={{ color: '#50d9ee' }}>SANDBOX / TIME MACHINE</span>
        <span>
          {data.fromYear} - {data.toYear}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 45 }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 610 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 80,
              lineHeight: 1.02,
              fontWeight: 900,
              letterSpacing: -3,
            }}
          >
            L'histoire de l'IA.
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 23,
              fontSize: 28,
              lineHeight: 1.4,
              color: '#a9c1d0',
            }}
          >
            Les grandes dates de l'intelligence artificielle.
          </div>
        </div>
        <svg width="430" height="315" viewBox="0 0 460 315">
          {[46, 124, 202, 280].map((y) => (
            <line key={y} x1="26" x2="426" y1={y} y2={y} stroke="#294457" strokeDasharray="3 8" />
          ))}
          <path d={path} fill="none" stroke="#50d9ee" strokeWidth="3" strokeLinejoin="round" />
          {points
            .filter((point) => point.event.landmark)
            .map((point) => (
              <circle
                key={point.event.id}
                cx={26 + point.x * 400}
                cy={280 - point.y * 234}
                r="4"
                fill="#ade9f9"
              />
            ))}
        </svg>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #294457',
          paddingTop: 22,
          fontFamily: 'Mono',
          fontSize: 20,
          color: '#a3bdcd',
        }}
      >
        <span>{data.events.length} événements sourcés</span>
        <span>Chronologie interactive</span>
      </div>
    </div>,
  );
}

const PAPER = '#f3f0e8';
const INK = '#15140f';
const HL = '#d4ff3a';
const ACCENT = '#ff5a36';
const UP = '#0a6a32';
const DOWN = '#b81d2a';

const TONES: Record<number, { bg: string; fg: string }> = {
  0: { bg: INK, fg: PAPER },
  1: { bg: HL, fg: INK },
  2: { bg: ACCENT, fg: INK },
  3: { bg: '#f2b705', fg: INK },
  4: { bg: '#1f6b46', fg: PAPER },
  5: { bg: '#0e7490', fg: PAPER },
  6: { bg: PAPER, fg: INK },
};

interface FontSpec {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 700 | 800 | 900;
  style: 'normal' | 'italic';
}
let fontsPromise: Promise<FontSpec[]> | undefined;

async function read(pkg: string, file: string): Promise<ArrayBuffer> {
  const buf = await readFile(
    join(process.cwd(), 'node_modules', '@fontsource', pkg, 'files', file),
  );
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function fonts(): Promise<FontSpec[]> {
  fontsPromise ??= Promise.all([
    read('archivo', 'archivo-latin-900-normal.woff'),
    read('archivo', 'archivo-latin-800-normal.woff'),
    read('jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff'),
    read('jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff'),
    read('newsreader', 'newsreader-latin-400-italic.woff'),
  ]).then(([a9, a8, m5, m7, ni]): FontSpec[] => [
    { name: 'Archivo', data: a9, weight: 900, style: 'normal' },
    { name: 'Archivo', data: a8, weight: 800, style: 'normal' },
    { name: 'Mono', data: m5, weight: 500, style: 'normal' },
    { name: 'Mono', data: m7, weight: 700, style: 'normal' },
    { name: 'Serif', data: ni, weight: 400, style: 'italic' },
  ]);
  return fontsPromise;
}

async function render(node: React.ReactElement): Promise<ImageResponse> {
  return new ImageResponse(node, { ...OG_SIZE, fonts: await fonts() });
}

/** Même moteur et mêmes polices que les aperçus de liens existants. */
export function awardCard(award: {
  name: string;
  week?: string;
  period?: string;
  label?: string;
  scope?: string;
  chart?: string;
  withdrawnAt: string | null;
}) {
  const accent = award.withdrawnAt ? '#9baebb' : '#3cd6fc';
  return render(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1200,
        height: 630,
        background: '#05090d',
        color: '#f4f7fa',
        padding: 60,
        fontFamily: 'Archivo',
        borderTop: `8px solid ${accent}`,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 28, fontWeight: 900 }}
      >
        <svg width="48" height="48" viewBox="0 0 64 64">
          <path
            d="M32 10 55 52H9L32 10Zm0 14L21.8 43h20.4L32 24Z"
            fill="#1cb5ed"
            fillRule="evenodd"
          />
        </svg>
        <span>SANDBOX AWARDS</span>
        <span style={{ marginLeft: 'auto', color: accent, fontFamily: 'Mono' }}>
          {award.period ?? award.week}
        </span>
      </div>
      <div
        style={{ display: 'flex', fontSize: 26, color: accent, fontFamily: 'Mono', marginTop: 52 }}
      >
        {award.withdrawnAt ? 'ATTRIBUTION RETIRÉE' : (award.label ?? 'RISING STAR OF THE WEEK')}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          fontSize: award.name.length > 50 ? 44 : 68,
          fontWeight: 900,
          lineHeight: 1.15,
          overflow: 'hidden',
          wordBreak: 'break-word',
        }}
      >
        {award.name}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 23,
          color: '#ade9f9',
          fontFamily: 'Mono',
          borderTop: '1px solid #294457',
          paddingTop: 25,
        }}
      >
        <span>
          {award.withdrawnAt
            ? 'HISTORIQUE CONSERVÉ'
            : `${(award.chart ?? 'GITHUB AI').toUpperCase()} / ${award.scope ? award.scope.toUpperCase() : 'RÉCOMPENSE SANDBOX'}`}
        </span>
        <span>{new URL(siteConfig.url).host}</span>
      </div>
    </div>,
  );
}

/** Les cartes publiques utilisent le même jeu de données que SANDBOX CHARTS. */
export function sandboxChartCard(data: ChartsData, id: ChartId) {
  const week = editionWeekForChart(data, id);
  const rows = chartRows(data, id, week).slice(0, 3);
  return render(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1200,
        height: 630,
        background: '#05090d',
        color: '#f4f7fa',
        padding: 55,
        fontFamily: 'Archivo',
      }}
    >
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 800 }}
      >
        <span>SANDBOX CHARTS</span>
        <span style={{ color: '#3cd6fc', fontFamily: 'Mono' }}>{week}</span>
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 72,
          fontWeight: 900,
          letterSpacing: -4,
          marginTop: 24,
          marginBottom: 14,
        }}
      >
        {CHART_LABELS[id].title}
      </div>
      {rows.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {rows.map((row) => (
            <div
              key={row.entity.slug}
              style={{
                display: 'flex',
                alignItems: 'center',
                borderTop: '1px solid #294457',
                padding: '15px 0',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  width: 110,
                  color: '#3cd6fc',
                  fontSize: 52,
                  fontWeight: 900,
                }}
              >
                {String(row.rank).padStart(2, '0')}
              </span>
              <span
                style={{
                  display: 'flex',
                  flex: 1,
                  fontSize: Math.min(38, 540 / Math.max(1, row.entity.name.length * 0.6)),
                  fontWeight: 800,
                }}
              >
                {row.entity.name}
              </span>
              <span style={{ display: 'flex', fontFamily: 'Mono', fontSize: 22 }}>
                {row.periodStars === null
                  ? `${row.score.toFixed(1)} / 100`
                  : `${row.periodStars > 0 ? '+' : ''}${formatCompact(row.periodStars)} STARS`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{ display: 'flex', flex: 1, alignItems: 'center', color: '#3cd6fc', fontSize: 36 }}
        >
          {data.mode === 'unavailable'
            ? 'Data temporarily unavailable.'
            : 'Building the history. First edition coming next.'}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: 18,
          borderTop: '1px solid #294457',
          fontSize: 16,
          fontFamily: 'Mono',
        }}
      >
        <span>
          {data.mode === 'fixtures'
            ? 'LOCAL PREVIEW / FIXTURES'
            : 'THE WEEKLY CHARTS OF WHAT MATTERS IN AI.'}
        </span>
        <span>UPDATED EVERY MONDAY</span>
      </div>
    </div>,
  );
}

const mono = { fontFamily: 'Mono', textTransform: 'uppercase', letterSpacing: 2 } as const;

function Footer({ right }: { right?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...mono,
        fontSize: 22,
        fontWeight: 500,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Archivo', fontWeight: 900, fontSize: 30, letterSpacing: 0 }}>
          {siteConfig.wordmark[0]}
        </span>
        <span
          style={{
            fontFamily: 'Archivo',
            fontWeight: 900,
            fontSize: 30,
            background: HL,
            color: INK,
            padding: '0 8px',
            marginLeft: 8,
            letterSpacing: 0,
          }}
        >
          {siteConfig.wordmark[1]}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flex: 1,
          justifyContent: 'center',
          padding: '0 24px',
          fontSize: 20,
        }}
      >
        {right ?? ''}
      </div>
      <div style={{ display: 'flex', width: 330 }} />
    </div>
  );
}

const frame = (bg: string, fg: string) =>
  ({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    background: bg,
    color: fg,
    padding: '48px 56px',
    fontFamily: 'Archivo',
  }) as const;

export async function siteCard(): Promise<ImageResponse> {
  const logo = await readFile(join(process.cwd(), 'public', 'sandbox-logo.png'));
  return render(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#05090d',
        color: '#f4f7fa',
        fontFamily: 'Archivo',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: 8,
          background: '#1cb5ed',
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '62px 72px 50px',
        }}
      >
        <img
          src={`data:image/png;base64,${logo.toString('base64')}`}
          alt=""
          style={{ width: 864, height: 288, objectFit: 'contain' }}
        />
        <div
          style={{
            display: 'flex',
            width: '100%',
            borderTop: '2px solid #294457',
            paddingTop: 28,
            alignItems: 'flex-end',
          }}
        >
          <span style={{ fontSize: 70, fontWeight: 900, letterSpacing: -2 }}>PODCASTS</span>
          <span
            style={{
              marginLeft: 46,
              fontSize: 54,
              fontWeight: 900,
              letterSpacing: -2,
              color: '#3cd6fc',
            }}
          >
            SANDBOX CHARTS
          </span>
        </div>
      </div>
    </div>,
  );
}

export async function chartCard(view: ChartView): Promise<ImageResponse> {
  if (hasDemoSnapshots([view.snapshot])) return demoCard(view.chart.title);
  const rows = view.rows.slice(0, 5);
  return render(
    <div style={frame(PAPER, INK)}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            ...mono,
            fontSize: 22,
            fontWeight: 500,
          }}
        >
          <span style={{ background: INK, color: PAPER, padding: '2px 10px' }}>
            {view.chart.code}
          </span>
          <span>
            Week {editionMark(view.week)} · {formatDayMonth(editionStart(view.week))} –{' '}
            {formatDayMonth(editionEnd(view.week))}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 14,
            fontSize: 92,
            fontWeight: 900,
            lineHeight: 0.92,
            textTransform: 'uppercase',
            letterSpacing: -2,
          }}
        >
          {view.chart.title}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', borderTop: `4px solid ${INK}` }}>
        {rows.map((r) => {
          const kind = r.movement.kind;
          const badge = view.baseline
            ? ''
            : kind === 'up'
              ? `+${String(r.movement.delta)}`
              : kind === 'down'
                ? `-${String(Math.abs(r.movement.delta))}`
                : kind === 'new'
                  ? 'NEW'
                  : kind === 're'
                    ? 'RE'
                    : '=';
          const color = kind === 'up' ? UP : kind === 'down' ? DOWN : INK;
          return (
            <div
              key={r.entity.slug}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 64,
                borderBottom: `1px solid rgba(21,20,15,0.25)`,
                background: r.rank === 1 ? HL : 'transparent',
                padding: r.rank === 1 ? '0 14px' : 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 92,
                  fontSize: 52,
                  fontWeight: 900,
                  letterSpacing: -2,
                }}
              >
                {padRank(r.rank)}
              </div>
              <div style={{ display: 'flex', flex: 1, fontSize: 36, fontWeight: 800 }}>
                {r.entity.name}
              </div>
              <div
                style={{
                  display: 'flex',
                  width: 120,
                  ...mono,
                  fontSize: 24,
                  fontWeight: 700,
                  color,
                }}
              >
                {badge}
              </div>
              <div
                style={{
                  display: 'flex',
                  width: 90,
                  justifyContent: 'flex-end',
                  ...mono,
                  fontSize: 24,
                  fontWeight: 500,
                }}
              >
                {formatNumber(r.score, 1)}
              </div>
            </div>
          );
        })}
      </div>
      <Footer right={`Top ${String(view.chart.size)} · mis à jour chaque jour`} />
    </div>,
  );
}

export async function moveCard(
  chart: ChartView['chart'],
  week: string,
  entity: Entity,
  rank: number | null,
  highlight: Highlight,
): Promise<ImageResponse> {
  const tone = TONES[entity.mark.tone] ?? TONES[0];
  const headline = highlightHeadline(highlight);
  return render(
    <div style={frame(HL, INK)}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          ...mono,
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        <span>{chart.title}</span>
        <span>Week {editionMark(week)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            fontSize: rank === null ? 220 : 400,
            fontWeight: 900,
            lineHeight: 0.8,
            letterSpacing: -12,
            marginRight: 40,
          }}
        >
          {rank === null ? 'OUT' : `#${String(rank)}`}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 84,
                height: 84,
                background: tone?.bg ?? INK,
                color: tone?.fg ?? PAPER,
                border: `4px solid ${INK}`,
                fontSize: 36,
                fontWeight: 900,
              }}
            >
              {entity.mark.glyph}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 64,
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: -1,
                marginLeft: 22,
              }}
            >
              {entity.name}
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>
            {headline}
          </div>
        </div>
      </div>
      <Footer right={highlight.stat ? `+${formatCompact(highlight.stat.value)} stars / 7 j` : ''} />
    </div>,
  );
}

export async function episodeCard(episode: Episode): Promise<ImageResponse> {
  const tone = TONES[episode.cover.tone] ?? TONES[0];
  return render(
    <div style={frame(tone?.bg ?? INK, tone?.fg ?? PAPER)}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          ...mono,
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        <span>Episode {episode.number}</span>
        <span>{episode.cover.kicker}</span>
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 78,
          fontWeight: 900,
          lineHeight: 0.95,
          letterSpacing: -2,
          textTransform: 'uppercase',
          maxWidth: 1000,
        }}
      >
        {episode.title}
      </div>
      <Footer right={`${String(episode.mentions.length)} liens cités`} />
    </div>,
  );
}

export async function entityCard(
  entity: Entity,
  ranks: { chart: string; rank: number }[],
): Promise<ImageResponse> {
  const tone = TONES[entity.mark.tone] ?? TONES[0];
  return render(
    <div style={frame(PAPER, INK)}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            background: tone?.bg ?? INK,
            color: tone?.fg ?? PAPER,
            border: `5px solid ${INK}`,
            fontSize: 52,
            fontWeight: 900,
          }}
        >
          {entity.mark.glyph}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 28 }}>
          <div style={{ display: 'flex', ...mono, fontSize: 24, fontWeight: 500 }}>
            {entity.org ? `${entity.org} · ` : ''}
            {entity.category}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 100,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: -2,
              textTransform: 'uppercase',
            }}
          >
            {entity.name}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Serif',
            fontStyle: 'italic',
            fontSize: 38,
            maxWidth: 980,
            lineHeight: 1.2,
            marginBottom: 24,
          }}
        >
          {entity.tagline}
        </div>
        <div style={{ display: 'flex' }}>
          {ranks.map((r) => (
            <div
              key={r.chart}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginRight: 16,
                border: `3px solid ${INK}`,
                padding: '6px 16px',
                background: r.rank === 1 ? HL : 'transparent',
                ...mono,
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              {r.chart} · n°{r.rank}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>,
  );
}

/** Aucun rang ni avis simulé dans les aperçus des anciennes démonstrations. */
export async function demoCard(title: string): Promise<ImageResponse> {
  return render(
    <div style={frame(PAPER, INK)}>
      <div style={{ display: 'flex', ...mono, fontSize: 30 }}>DÉMONSTRATION</div>
      <div style={{ display: 'flex', fontSize: 72, fontWeight: 900 }}>{title}</div>
      <div style={{ display: 'flex', fontSize: 32 }}>
        Données simulées retirées de l'affichage public.
      </div>
      <Footer />
    </div>,
  );
}

export async function storyCard(story: Story): Promise<ImageResponse> {
  const opinion = story.type === 'opinion';
  const long = story.title.length > 70;
  return render(
    <div style={frame(opinion ? HL : PAPER, INK)}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          ...mono,
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        <span style={{ background: INK, color: opinion ? HL : PAPER, padding: '2px 12px' }}>
          {story.type}
        </span>
        <span>{story.author}</span>
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: long ? 62 : 76,
          fontWeight: 900,
          lineHeight: 0.98,
          letterSpacing: -2,
          maxWidth: 1060,
        }}
      >
        {story.title}
      </div>
      <Footer />
    </div>,
  );
}
