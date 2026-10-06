import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { isMock, siteConfig } from '@/config/site';
import { formatCompact, formatDayMonth, formatNumber, padRank } from '@/domain/format';
import { shortWeek, weekEnd, weekStart } from '@/domain/weeks';
import { highlightHeadline } from './moves';
import type { ChartView, Highlight } from './repository';
import type { Entity, Episode, Story } from '@/domain/schema';

/**
 * Cartes OpenGraph (1200×630) pour X, LinkedIn, Discord et Slack. Satori n'accepte ni les polices variables
 * ni le WOFF2 : on lit les fichiers WOFF statiques des paquets Fontsource.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_TYPE = 'image/png';

const PAPER = '#f3f0e8';
const INK = '#15140f';
const HL = '#d4ff3a';
const ACCENT = '#ff5a36';
/** Texte orange sur papier : version foncée pour un contraste lisible. */
const ACCENT_TEXT = '#c2300f';
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
      <div
        style={{
          display: 'flex',
          width: 330,
          justifyContent: 'flex-end',
          color: ACCENT_TEXT,
          fontWeight: 700,
        }}
      >
        {isMock ? 'Démo : données simulées' : ''}
      </div>
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
  return render(
    <div style={frame(PAPER, INK)}>
      <div
        style={{
          display: 'flex',
          height: 18,
          width: '100%',
          background: HL,
          marginTop: -48,
          marginLeft: -56,
          marginRight: -56,
          marginBottom: 0,
          boxSizing: 'content-box',
          paddingRight: 112,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            fontSize: 190,
            fontWeight: 900,
            lineHeight: 0.88,
            letterSpacing: -4,
            textTransform: 'uppercase',
          }}
        >
          {siteConfig.wordmark[0]}
        </div>
        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 190,
              fontWeight: 900,
              lineHeight: 0.88,
              letterSpacing: -4,
              textTransform: 'uppercase',
              background: HL,
              padding: '0 20px',
            }}
          >
            {siteConfig.wordmark[1]}
          </div>
        </div>
        <div
          style={{ display: 'flex', marginTop: 28, fontSize: 38, fontWeight: 800, maxWidth: 900 }}
        >
          {siteConfig.tagline}
        </div>
      </div>
      <Footer right="Podcast + classements" />
    </div>,
  );
}

export async function chartCard(view: ChartView): Promise<ImageResponse> {
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
            Week {shortWeek(view.week).slice(1)} · {formatDayMonth(weekStart(view.week))} –{' '}
            {formatDayMonth(weekEnd(view.week))}
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
      <Footer right={`Top ${String(view.chart.size)} · mis à jour chaque semaine`} />
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
        <span>Week {shortWeek(week).slice(1)}</span>
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
