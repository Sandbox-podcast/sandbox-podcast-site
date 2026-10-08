import { Text } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
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
        return (
          <span key={key}>
            <Text>{node.v}</Text>
          </span>
        );
      case 'strong':
        return (
          <strong key={key}>
            <Text>{renderNodes(node.c, key)}</Text>
          </strong>
        );
      case 'em':
        return (
          <em key={key}>
            <Text>{renderNodes(node.c, key)}</Text>
          </em>
        );
      case 'code':
        return <code key={key}>{node.v}</code>;
      case 'link':
        return node.external ? (
          <ExtLink key={key} href={node.href} className="inline-link">
            <Text>{renderNodes(node.c, key)}</Text>
          </ExtLink>
        ) : (
          <Link key={key} href={node.href} className="inline-link">
            <Text>{renderNodes(node.c, key)}</Text>
          </Link>
        );
      case 'ref': {
        if (node.kind === 'entity') {
          const entity = findEntity(node.id);
          return entity ? (
            <Link key={key} href={entityPath(entity)} className="ref-link">
              <Text>{entity.name}</Text>
            </Link>
          ) : (
            <span key={key}>
              <Text>{node.id}</Text>
            </span>
          );
        }
        if (node.kind === 'chart') {
          const chart = findChart(node.id);
          return chart ? (
            <Link key={key} href={`/charts/${chart.slug}`} className="ref-link">
              <Text>{chart.title}</Text>
            </Link>
          ) : (
            <span key={key}>
              <Text>{node.id}</Text>
            </span>
          );
        }
        if (node.kind === 'episode') {
          const episode = getEpisode(Number(node.id));
          return episode ? (
            <Link key={key} href={`/episodes/${String(episode.number)}`} className="ref-link">
              <Text>{'\u00E9pisode '}</Text>
              <Text>{episode.number}</Text>
            </Link>
          ) : (
            <span key={key}>
              <Text>{node.id}</Text>
            </span>
          );
        }
        const story = getStory(node.id);
        return story ? (
          <Link key={key} href={`/stories/${story.slug}`} className="ref-link">
            <Text>{story.title}</Text>
          </Link>
        ) : (
          <span key={key}>
            <Text>{node.id}</Text>
          </span>
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
      <Text>
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
                  <Text>
                    {block.cite ? (
                      <figcaption className="label mt-2 text-ink-3">
                        <Text>{'\u2014 '}</Text>
                        <Text>{block.cite}</Text>
                      </figcaption>
                    ) : null}
                  </Text>
                </figure>
              );
            case 'list': {
              const Tag = block.ordered ? 'ol' : 'ul';
              return (
                <Tag key={key}>
                  <Text>
                    {block.items.map((item, j) => (
                      <li key={`${key}-${String(j)}`}>
                        <Inline text={item} />
                      </li>
                    ))}
                  </Text>
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
                  <Text>
                    {block.title ? (
                      <p className="label mb-1.5">
                        <Text>{block.tone === 'warning' ? '⚠ ' : 'ℹ '}</Text>
                        <Text>{block.title}</Text>
                      </p>
                    ) : null}
                  </Text>
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
                  <Text>
                    {block.items.map((item) => (
                      <div key={item.label} className="bg-paper p-3">
                        <dd
                          className="m-0 font-display text-4xl font-extrabold leading-none tnum"
                          style={{ fontStretch: '75%' }}
                        >
                          <Text>{item.value}</Text>
                        </dd>
                        <dt className="label mt-1.5 text-ink-2">
                          <Text>{item.label}</Text>
                        </dt>
                      </div>
                    ))}
                  </Text>
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
      </Text>
    </div>
  );
}
