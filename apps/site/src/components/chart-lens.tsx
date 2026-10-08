'use client';
import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
/**
 * Sélecteur de critère : le classement officiel est rendu côté serveur (lisible sans JavaScript, indexable),
 * et ce composant ajoute des « vues » : les mêmes entités triées par un autre critère, avec une animation
 * de réordonnancement. Une vue n'est pas un classement officiel et elle est présentée comme telle.
 */
export interface LensEntry {
  slug: string;
  name: string;
  href: string;
  tagline: string;
  org: string | null;
  glyph: string;
  tone: number;
  officialRank: number;
  dims: Record<string, number>;
}
export interface LensView {
  id: string;
  label: string;
}
const pad = (n: number): string => String(n).padStart(2, '0');
export function ChartLens({
  views,
  entries,
  size,
  dimLabels,
  officialLabel,
  official,
}: {
  views: LensView[];
  entries: LensEntry[];
  size: number;
  dimLabels: Record<string, string>;
  officialLabel: string;
  official: ReactNode;
}) {
  const first = views[0]?.id ?? '';
  const [view, setView] = useState(first);
  const nodes = useRef(new Map<string, HTMLLIElement>());
  const tops = useRef(new Map<string, number>());
  // Une vue peut être partagée par son ancre : /charts/ai-models#coding
  useEffect(() => {
    const wanted = window.location.hash.replace('#', '');
    if (wanted && views.some((v) => v.id === wanted)) setView(wanted);
  }, [views]);
  const choose = (id: string): void => {
    setView(id);
    window.history.replaceState(null, '', id === first ? window.location.pathname : `#${id}`);
  };
  const ranked = useMemo(() => {
    if (view === first) return [];
    return entries
      .filter((e) => e.dims[view] !== undefined)
      .sort((a, b) => (b.dims[view] ?? 0) - (a.dims[view] ?? 0) || a.officialRank - b.officialRank)
      .slice(0, size);
  }, [entries, view, first, size]);
  const missing = view === first ? 0 : entries.filter((e) => e.dims[view] === undefined).length;
  // FLIP : on mesure avant/après et on anime l'écart. Désactivé si l'utilisateur réduit les animations.
  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = new Map<string, number>();
    nodes.current.forEach((el, slug) => {
      next.set(slug, el.getBoundingClientRect().top + window.scrollY);
    });
    if (!reduce) {
      nodes.current.forEach((el, slug) => {
        const before = tops.current.get(slug);
        const after = next.get(slug);
        if (before !== undefined && after !== undefined && Math.abs(before - after) > 1) {
          el.animate(
            [{ transform: `translateY(${String(before - after)}px)` }, { transform: 'none' }],
            {
              duration: 420,
              easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            },
          );
        }
      });
    }
    tops.current = next;
  }, [ranked, view]);
  const current = views.find((v) => v.id === view);
  const others = (id: string): string[] =>
    views
      .filter((v) => v.id !== id && v.id !== first)
      .slice(0, 2)
      .map((v) => v.id);
  return (
    <div>
      <div className="mb-5">
        <p className="label mb-2 text-ink-2">
          <Text>{'Trier par crit\u00E8re'}</Text>
        </p>
        <div className="scroll-x -mx-1 pb-2">
          <LocalizedElement
            as="div"
            role="group"
            aria-label="Trier par critère"
            className="flex gap-2 px-1"
          >
            <Text>
              {views.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  className="lens-tab"
                  aria-pressed={view === v.id}
                  onClick={() => {
                    choose(v.id);
                  }}
                >
                  <Text>{v.label}</Text>
                  <Text>{i === 0 ? ' · officiel' : ''}</Text>
                </button>
              ))}
            </Text>
          </LocalizedElement>
        </div>
        <Text>
          {view !== first ? (
            <p className="label mt-2 text-ink-2" role="status">
              <Text>{'Vue \u00AB '}</Text>
              <Text>{current?.label}</Text>
              <Text>{' \u00BB : un tri par crit\u00E8re, pas le classement officiel ('}</Text>
              <Text>{officialLabel}</Text>
              <Text>{').'}</Text>
              <Text>
                {missing > 0 ? ` ${String(missing)} candidat(s) non évalué(s) sur ce critère.` : ''}
              </Text>
            </p>
          ) : null}
        </Text>
      </div>

      <Text>
        {view === first ? (
          official
        ) : (
          <LocalizedElement
            as="ol"
            className="m-0 list-none p-0"
            aria-label={`Classement par ${current?.label ?? ''}`}
          >
            <Text>
              {ranked.map((e, i) => (
                <li
                  key={e.slug}
                  ref={(el) => {
                    if (el) nodes.current.set(e.slug, el);
                    else nodes.current.delete(e.slug);
                  }}
                  className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-4 gap-y-1 border-t-2 border-ink py-4 md:grid-cols-[6rem_3.25rem_1fr_14rem]"
                >
                  <span className="rank-num rank-lens" data-outline={i + 1 > 3 ? 'true' : 'false'}>
                    <Text>{pad(i + 1)}</Text>
                  </span>
                  <span className="mark hidden md:grid" data-tone={e.tone} aria-hidden="true">
                    <Text>{e.glyph}</Text>
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={e.href}
                      className="font-display text-xl font-extrabold leading-tight hover:underline md:text-2xl"
                    >
                      <Text>{e.name}</Text>
                    </Link>
                    <p className="label mt-1 text-ink-2">
                      <Text>{e.org ? `${e.org} · ` : ''}</Text>
                      <Text>
                        {e.officialRank <= size
                          ? `${officialLabel} n°${String(e.officialRank)}`
                          : `hors Top ${String(size)} au ${officialLabel.toLowerCase()} (n°${String(e.officialRank)})`}
                      </Text>
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      <Text>
                        {others(view).map((id) => (
                          <li key={id} className="chip">
                            <Text>{dimLabels[id] ?? id}</Text>
                            <Text> </Text>
                            <b className="tnum">
                              <Text>{e.dims[id] === undefined ? '—' : Math.round(e.dims[id])}</Text>
                            </b>
                          </li>
                        ))}
                      </Text>
                    </ul>
                  </div>
                  <div className="col-span-3 md:col-span-1 md:text-right">
                    <p
                      className="font-display text-3xl font-extrabold leading-none tnum md:text-4xl"
                      style={{ fontStretch: '80%' }}
                    >
                      <Text>{(e.dims[view] ?? 0).toFixed(1).replace('.', ',')}</Text>
                    </p>
                    <span className="bar mt-2 block">
                      <i style={{ width: `${String(Math.min(100, e.dims[view] ?? 0))}%` }} />
                    </span>
                  </div>
                </li>
              ))}
            </Text>
          </LocalizedElement>
        )}
      </Text>
    </div>
  );
}
