import Link from 'next/link';
import type { ReactNode } from 'react';
import { parseInline, type InlineNode } from '@/domain/markup';
import type { Block } from '@/domain/schema';
import { findChart, findEntity, entityPath, getEpisode, getStory } from '@/lib/repository';
import { EntityCard, MiniChart } from './cards';
import { ExtLink } from './ui';

/** Rend un balisage en ligne en nœuds React : tout texte est échappé par React, rien n'est injecté en HTML. */
function renderNodes(nodes: InlineNode[], keyPrefix = 'n'): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}${String(i)}`;
    switch (node.t) {
      case 'text':
        return <span key={key}>{node.v}</span>;
      case 'strong':
        return <strong key={key}>{renderNodes(node.c, key)}</strong>;
      case 'em':
        return <em key={key}>{renderNodes(node.c, key)}</em>;
      case 'code':
        return <code key={key}>{node.v}</code>;
      case 'link':
        return node.external ? (
          <ExtLink key={key} href={node.href} className="inline-link">
            {renderNodes(node.c, key)}
          </ExtLink>
        ) : (
          <Link key={key} href={node.href} className="inline-link">
            {renderNodes(node.c, key)}
          </Link>
        );
      case 'ref': {
        if (node.kind === 'entity') {
          const entity = findEntity(node.id);
          return entity ? (
            <Link key={key} href={entityPath(entity)} className="ref-link">
              {entity.name}
            </Link>
          ) : (
            <span key={key}>{node.id}</span>
          );
        }
        if (node.kind === 'chart') {
          const chart = findChart(node.id);
          return chart ? (
            <Link key={key} href={`/charts/${chart.slug}`} className="ref-link">
              {chart.title}
            </Link>
          ) : (
            <span key={key}>{node.id}</span>
          );
        }
        if (node.kind === 'episode') {
          const episode = getEpisode(Number(node.id));
          return episode ? (
            <Link key={key} href={`/episodes/${String(episode.number)}`} className="ref-link">
              épisode {episode.number}
            </Link>
          ) : (
            <span key={key}>{node.id}</span>
          );
        }
        const story = getStory(node.id);
        return story ? (
          <Link key={key} href={`/stories/${story.slug}`} className="ref-link">
            {story.title}
          </Link>
        ) : (
          <span key={key}>{node.id}</span>
        );
      }
    }
  });
}

export function Inline({ text }: { text: string }) {
  return <>{renderNodes(parseInline(text))}</>;
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose">
      {blocks.map((block, i) => {
        const key = `${block.type}${String(i)}`;
        switch (block.type) {
          case 'p':
            return (
              <p key={key}>
                <Inline text={block.text} />
              </p>
            );
          case 'h2':
            return (
              <h2 key={key}>
                <Inline text={block.text} />
              </h2>
            );
          case 'h3':
            return (
              <h3 key={key}>
                <Inline text={block.text} />
              </h3>
            );
          case 'quote':
            return (
              <figure key={key} className="m-0">
                <blockquote>
                  <Inline text={block.text} />
                </blockquote>
                {block.cite ? (
                  <figcaption className="label mt-2 text-ink-3">— {block.cite}</figcaption>
                ) : null}
              </figure>
            );
          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul';
            return (
              <Tag key={key}>
                {block.items.map((item, j) => (
                  <li key={`${key}-${String(j)}`}>
                    <Inline text={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case 'callout':
            return (
              <aside
                key={key}
                className={`border-2 border-ink p-4 font-sans text-base ${block.tone === 'warning' ? 'bg-down-bg' : 'bg-paper-2'}`}
                style={{ fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}
              >
                {block.title ? (
                  <p className="label mb-1.5">
                    {block.tone === 'warning' ? '⚠ ' : 'ℹ '}
                    {block.title}
                  </p>
                ) : null}
                <p className="m-0 text-[0.9375rem]">
                  <Inline text={block.text} />
                </p>
              </aside>
            );
          case 'stat':
            return (
              <dl
                key={key}
                className="m-0 grid grid-cols-2 gap-px border-2 border-ink bg-ink md:grid-cols-4"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {block.items.map((item) => (
                  <div key={item.label} className="bg-paper p-3">
                    <dd
                      className="m-0 font-display text-4xl font-extrabold leading-none tnum"
                      style={{ fontStretch: '75%' }}
                    >
                      {item.value}
                    </dd>
                    <dt className="label mt-1.5 text-ink-2">{item.label}</dt>
                  </div>
                ))}
              </dl>
            );
          case 'code':
            return (
              <pre key={key} tabIndex={0}>
                <code style={{ background: 'transparent', padding: 0 }}>{block.code}</code>
              </pre>
            );
          case 'chart':
            return (
              <div key={key} className="my-8" style={{ fontFamily: 'var(--font-sans)' }}>
                <MiniChart
                  chart={block.chart}
                  {...(block.week ? { week: block.week } : {})}
                  top={block.top}
                />
              </div>
            );
          case 'entity': {
            const entity = findEntity(block.entity);
            return entity ? (
              <div key={key} className="my-6" style={{ fontFamily: 'var(--font-sans)' }}>
                <EntityCard entity={entity} />
              </div>
            ) : null;
          }
        }
      })}
    </div>
  );
}
