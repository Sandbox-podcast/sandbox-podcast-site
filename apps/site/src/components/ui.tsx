import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { formatDelta, padRank } from '@/domain/format';
import type { Entity, MovementKind, StoryType } from '@/domain/schema';

/** Monogramme coloré : l'identité visuelle d'une entité, sans image externe ni licence à gérer. */
export function Mark({ entity, size = 52 }: { entity: Pick<Entity, 'mark'>; size?: number }) {
  const style = { '--mark': `${String(size)}px` } as CSSProperties;
  return (
    <span className="mark" data-tone={entity.mark.tone} style={style} aria-hidden="true">
      {entity.mark.glyph}
    </span>
  );
}

/** Gros numéro de classement. Les trois premiers sont pleins, les suivants détourés. */
export function RankNum({ rank, size = 'lg' }: { rank: number; size?: 'xl' | 'lg' | 'md' | 'sm' }) {
  return (
    <span className={`rank-num rank-${size}`} data-outline={rank > 3 ? 'true' : 'false'}>
      <span className="sr-only">Place </span>
      {padRank(rank)}
    </span>
  );
}

const MOVE_TEXT: Record<MovementKind | 'out', (delta: number) => string> = {
  up: (d) => `En hausse de ${String(d)} place${d > 1 ? 's' : ''}`,
  down: (d) => `En baisse de ${String(Math.abs(d))} place${Math.abs(d) > 1 ? 's' : ''}`,
  stable: () => 'Place inchangée',
  new: () => 'Nouvelle entrée',
  re: () => 'Retour dans le classement',
  out: () => 'Sorti du classement',
};

export function MoveBadge({
  kind,
  delta = 0,
  baseline = false,
}: {
  kind: MovementKind | 'out';
  delta?: number;
  /** Première semaine du classement : rien à comparer, on n'affiche pas de mouvement. */
  baseline?: boolean;
}) {
  if (baseline) {
    return (
      <span className="move move-stable" title="Première semaine du classement">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Première semaine du classement</span>
      </span>
    );
  }
  const visual =
    kind === 'up' ? (
      <>
        <span aria-hidden="true">▲</span>
        {Math.abs(delta)}
      </>
    ) : kind === 'down' ? (
      <>
        <span aria-hidden="true">▼</span>
        {Math.abs(delta)}
      </>
    ) : kind === 'stable' ? (
      <span aria-hidden="true">＝</span>
    ) : kind === 'new' ? (
      'NEW'
    ) : kind === 're' ? (
      'RE'
    ) : (
      'OUT'
    );
  return (
    <span className={`move move-${kind}`}>
      {visual}
      <span className="sr-only">{MOVE_TEXT[kind](delta)}</span>
    </span>
  );
}

export function DataLabel({ children }: { children?: ReactNode }) {
  return (
    <span className="label inline-flex items-center gap-1.5 bg-ink px-1.5 py-0.5 text-paper">
      {children ?? 'DATA'}
    </span>
  );
}

export function SectionHead({
  kicker,
  title,
  href,
  linkLabel,
  id,
  level = 2,
}: {
  kicker?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  id?: string;
  level?: 1 | 2;
}) {
  const Tag = level === 1 ? 'h1' : 'h2';
  return (
    <div className="section-head">
      <div className="min-w-0">
        {kicker ? <p className="label mb-1.5 text-ink-2">{kicker}</p> : null}
        <Tag className="section-title" id={id}>
          {title}
        </Tag>
      </div>
      {href ? (
        <Link
          href={href}
          className="label shrink-0 underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
        >
          {linkLabel ?? 'Tout voir'} →
        </Link>
      ) : null}
    </div>
  );
}

export const STORY_TYPE_LABEL: Record<StoryType, string> = {
  news: 'NEWS',
  analysis: 'ANALYSIS',
  experiment: 'EXPERIMENT',
  benchmark: 'BENCHMARK',
  guide: 'GUIDE',
  opinion: 'OPINION',
  recap: 'RECAP',
};

/** Les articles d'opinion ont un style propre : on ne les confond pas avec de l'information. */
export function TypeTag({ type }: { type: StoryType }) {
  const cls = type === 'opinion' ? 'tag tag-hl' : type === 'recap' ? 'tag tag-line' : 'tag';
  return <span className={cls}>{STORY_TYPE_LABEL[type]}</span>;
}

export function Delta({ value, unit = '' }: { value: number; unit?: string }) {
  const cls = value > 0 ? 'text-up' : value < 0 ? 'text-down' : 'text-ink-3';
  return (
    <span className={`${cls} tnum`}>
      {formatDelta(value)}
      {unit}
    </span>
  );
}

/** Lien externe : toujours rel sécurisé, et signalé aux lecteurs d'écran. */
export function ExtLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> (nouvel onglet)</span>
    </a>
  );
}
