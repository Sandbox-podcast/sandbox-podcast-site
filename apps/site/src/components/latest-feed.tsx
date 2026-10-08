'use client';
import { Text, LocalizedElement } from '@/components/localization';
import { useState, type ReactNode } from 'react';
export interface FeedEntry {
  id: string;
  /** `episode` ou un type d'article. */
  kind: string;
  label: string;
  node: ReactNode;
}
/**
 * Flux chronologique filtrable. Les cartes sont rendues côté serveur (HTML complet, indexable) ;
 * ce composant ne fait que masquer celles qui ne correspondent pas au filtre choisi.
 */
export function LatestFeed({
  entries,
  filters,
}: {
  entries: FeedEntry[];
  filters: {
    kind: string;
    label: string;
  }[];
}) {
  const [kind, setKind] = useState('all');
  const shown = kind === 'all' ? entries : entries.filter((e) => e.kind === kind);
  return (
    <div>
      <div className="scroll-x -mx-1 mb-8 pb-2">
        <LocalizedElement
          as="div"
          role="group"
          aria-label="Filtrer par type"
          className="flex gap-2 px-1"
        >
          <button
            type="button"
            className="lens-tab"
            aria-pressed={kind === 'all'}
            onClick={() => {
              setKind('all');
            }}
          >
            <Text>{'Tout \u00B7 '}</Text>
            <Text>{entries.length}</Text>
          </button>
          <Text>
            {filters.map((f) => {
              const count = entries.filter((e) => e.kind === f.kind).length;
              return (
                <button
                  key={f.kind}
                  type="button"
                  className="lens-tab"
                  aria-pressed={kind === f.kind}
                  onClick={() => {
                    setKind(f.kind);
                  }}
                  disabled={count === 0}
                  style={count === 0 ? { opacity: 0.35 } : undefined}
                >
                  <Text>{f.label}</Text>
                  <Text>{' \u00B7 '}</Text>
                  <Text>{count}</Text>
                </button>
              );
            })}
          </Text>
        </LocalizedElement>
      </div>
      <p className="sr-only" role="status">
        <Text>{shown.length}</Text>
        <Text>{' contenus affich\u00E9s'}</Text>
      </p>
      <ul className="m-0 grid list-none gap-x-8 gap-y-10 p-0 md:grid-cols-2 lg:grid-cols-3">
        <Text>
          {shown.map((e) => (
            <li key={e.id} className="flex">
              <div className="w-full">
                <Text>{e.node}</Text>
              </div>
            </li>
          ))}
        </Text>
      </ul>
    </div>
  );
}
