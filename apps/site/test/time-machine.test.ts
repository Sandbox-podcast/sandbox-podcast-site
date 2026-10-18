import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildHistoryWrapped,
  changeHistoryPeriod,
  filterHistory,
  historyCurve,
  historyDate,
  historyTimestamp,
  historyYears,
  nearestHistoryPoint,
  sortHistory,
  timeMachineDataSchema,
  type HistoryEvent,
  type TimeMachineData,
} from '../src/domain/time-machine.ts';
import { timeMachineData } from '../src/lib/time-machine.ts';

const event = (id: string, date: string, extra: Partial<HistoryEvent> = {}): HistoryEvent => ({
  id,
  date,
  dateKind: 'announcement',
  title: 'Annonce ' + id,
  shortTitle: id,
  organization: 'Laboratoire',
  category: 'model',
  summary: 'Une annonce documentée et vérifiée.',
  context: "L'annonce précède l'ouverture publique.",
  landmark: false,
  tags: ['modèle'],
  sources: [{ label: 'Annonce primaire', url: 'https://example.org/' + id }],
  ...extra,
});
const data = (events: HistoryEvent[]): TimeMachineData => ({
  fromYear: 1996,
  toYear: 2026,
  reviewedAt: '2026-10-15',
  events,
});

describe("corpus historique de l'IA", () => {
  it('valide toutes les sources et les dates du corpus livré, sans classements', () => {
    const raw: unknown = JSON.parse(
      readFileSync(new URL('../content/ai-history.json', import.meta.url), 'utf8'),
    );
    const checked = timeMachineDataSchema.parse(raw);
    const loaded = timeMachineData();
    expect(loaded.events).toEqual(sortHistory(checked.events));
    expect(loaded.events.length).toBeGreaterThanOrEqual(150);
    expect(loaded.events[0]?.date).toBe('1996-02');
    expect(loaded.reviewedAt).toBe('2026-10-18');
    expect(loaded.events.at(-1)?.date).toBe('2026-10-17');
    expect(new Set(loaded.events.map((item) => item.category))).toEqual(
      new Set(['model', 'product', 'research', 'milestone', 'governance']),
    );
    for (const id of ['transformer', 'chatgpt', 'stable-diffusion', 'gpt-4', 'deepseek-r1'])
      expect(loaded.events.some((item) => item.id === id)).toBe(true);
    expect(loaded).not.toHaveProperty('collections');
    expect(loaded).not.toHaveProperty('mode');
    expect(loaded.events.every((item) => item.sources.length > 0)).toBe(true);
  });
  it('couvre les agents, modèles récents et découvertes scientifiques demandés', () => {
    const corpus = timeMachineData();
    const expected = {
      'grok-bot': '2026-08-11',
      'antigravity-antimicrobial-peptides': '2026-10-15',
      'rosalind-academic-plan': '2026-10-15',
      'muse-spark-open': '2026-10-15',
      'jais-3': '2026-10-15',
      'genesis-agent-skills': '2026-10-15',
      'granite-switch-4-1': '2026-10-15',
      'flux-3-image-klein': '2026-10-15',
      'beam-open-weights': '2026-10-16',
      'claude-quantum-circuits': '2026-10-16',
      'claude-ecdsa-curve-origins': '2026-10-16',
      'deepseek-v4-1-flash-1017': '2026-10-17',
      'grok-team-bots': '2026-09-28',
      'openai-dots': '2026-09-29',
      'gpt-6-1-sol': '2026-09-29',
      'navier-stokes-proposed-proof': '2026-09-08',
      'openai-math-repository': '2026-10-06',
      'jacobian-counterexample': '2026-07-21',
      'claude-art-enzyme': '2026-09-23',
      'muse-wonder': '2026-10-12',
      'gemini-4-argon': '2026-10-13',
      'grok-voice-3': '2026-10-14',
      'hiro-ace-v2': '2026-10-14',
    };
    for (const [id, date] of Object.entries(expected)) {
      expect(corpus.events.find((item) => item.id === id)).toMatchObject({ date });
    }
    for (const [query, id] of [
      ['Grok Bots', 'grok-bot'],
      ['Dots', 'openai-dots'],
      ['6.1 Sol', 'gpt-6-1-sol'],
      ['millenaire', 'navier-stokes-proposed-proof'],
      ['antibiotiques', 'halicin'],
      ['fusion', 'plasma-control'],
      ['materiaux', 'gnome'],
    ] as const) {
      expect(filterHistory(corpus.events, { query }).map((item) => item.id)).toContain(id);
    }
    for (const query of ['Muse Spark Open', 'Jais 3', 'Beam', '1017']) {
      expect(filterHistory(corpus.events, { query }).length).toBeGreaterThan(0);
    }
    const wrapped = buildHistoryWrapped(corpus, 2026);
    expect(wrapped.reviewedAt).toBe('2026-10-18');
    for (const id of Object.keys(expected).filter(
      (id) => expected[id as keyof typeof expected] >= '2026-10-15',
    ))
      expect(wrapped.events.map((item) => item.id)).toContain(id);
    expect(wrapped.events.map((item) => item.id)).toContain('gpt-6-1-sol');
    expect(wrapped.events.map((item) => item.id)).toContain('navier-stokes-proposed-proof');
  });
  it('conserve les limites scientifiques et distingue préversion et poids publiés', () => {
    const corpus = timeMachineData();
    const byId = (id: string) => corpus.events.find((item) => item.id === id);
    expect(byId('navier-stokes-proposed-proof')?.title).toContain('propose une preuve');
    expect(byId('navier-stokes-proposed-proof')?.context).toContain('ne valent pas attribution');
    expect(byId('jacobian-counterexample')?.context).toContain('dimension deux reste ouvert');
    expect(byId('claude-art-enzyme')?.context).toContain('fonction du système reste à établir');
    expect(byId('rentosertib-phase-2a')?.context).toContain('ni une autorisation');
    expect(byId('antigravity-antimicrobial-peptides')?.context).toContain(
      'validation en laboratoire',
    );
    expect(byId('claude-ecdsa-curve-origins')?.context).toContain('ne constitue pas une attaque');
    expect(byId('beam-open-weights')?.context).toContain("après l'annonce du 5 octobre");
    expect(byId('mistral-large-4')?.context).toContain('ne prouve pas');
  });
  it('refuse les dates impossibles, futures ou hors période et les identifiants dupliqués', () => {
    for (const date of [
      '2023-02-29',
      '2024-13-01',
      '2024-02-31',
      '2027-01-01',
      '1995',
      '2026-10-16',
    ])
      expect(timeMachineDataSchema.safeParse(data([event('test', date)])).success).toBe(false);
    expect(
      timeMachineDataSchema.safeParse(data([event('same', '2020'), event('same', '2021')])).success,
    ).toBe(false);
    expect(
      timeMachineDataSchema.safeParse({ ...data([]), fromYear: 2026, toYear: 1996 }).success,
    ).toBe(false);
    expect(timeMachineDataSchema.safeParse(data([event('leap', '2024-02-29')])).success).toBe(true);
  });
  it('exige une source primaire HTTPS et ne convertit pas une date imprécise en faux jour', () => {
    for (const url of ['javascript:alert(1)', 'http://example.org', 'data:text/html,test'])
      expect(
        timeMachineDataSchema.safeParse(
          data([event('unsafe', '2024', { sources: [{ label: 'Source', url }] })]),
        ).success,
      ).toBe(false);
    expect(
      timeMachineDataSchema.safeParse(data([event('missing-source', '2024', { sources: [] })]))
        .success,
    ).toBe(false);
    expect(historyDate('2009')).toBe('2009');
    expect(historyDate('1997-05')).toBe('mai 1997');
    expect(historyDate('2022-11-30')).toBe('30 novembre 2022');
    expect(historyTimestamp('2024-02')).toBe(Date.UTC(2024, 1, 1));
  });
});

describe('navigation et filtrage chronologique', () => {
  const events = [
    event('later', '2024-05-12', {
      organization: 'Équipe européenne',
      category: 'research',
      landmark: true,
    }),
    event('early', '1997-05', { category: 'milestone', tags: ['échecs'] }),
    event('first', '2022-11-30', { title: 'ChatGPT ouvre la conversation', category: 'product' }),
    event('same-date', '2024-05-12'),
  ];
  it('trie par date puis identifiant sans modifier le corpus original', () => {
    expect(sortHistory(events).map((item) => item.id)).toEqual([
      'early',
      'first',
      'later',
      'same-date',
    ]);
    expect(events[0]?.id).toBe('later');
    expect(historyYears(events)).toEqual([2024, 2022, 1997]);
  });
  it('combine période, catégorie, recherche sans accents et jalons majeurs', () => {
    expect(
      filterHistory(events, {
        fromYear: 2023,
        toYear: 2024,
        category: 'research',
        query: 'europeenne',
        landmarksOnly: true,
      }).map((item) => item.id),
    ).toEqual(['later']);
    expect(filterHistory(events, { query: 'ECHECS' }).map((item) => item.id)).toEqual(['early']);
    expect(filterHistory(events, { query: 'aucun résultat' })).toEqual([]);
    expect(filterHistory(events, { fromYear: 2022, toYear: 2022 }).map((item) => item.id)).toEqual([
      'first',
    ]);
    expect(filterHistory(events, { category: 'all' })).toHaveLength(4);
  });
  it('place les points sur le temps réel et compte uniquement la sélection', () => {
    const source = [event('a', '2000-01-01'), event('b', '2001-01-01'), event('c', '2020-01-01')];
    const points = historyCurve(source, 2000, 2020);
    expect(points[0]?.x).toBe(0);
    expect(points[0]?.count).toBe(1);
    expect(points[2]?.count).toBe(3);
    expect(points[2]?.y).toBe(1);
    expect((points[2]?.x ?? 0) - (points[1]?.x ?? 0)).toBeGreaterThan(
      15 * ((points[1]?.x ?? 0) - (points[0]?.x ?? 0)),
    );
    expect(historyCurve(source.slice(1), 2000, 2020)[0]?.count).toBe(1);
    expect(nearestHistoryPoint(points, points[1]?.x ?? 0)).toBe(1);
    expect(historyCurve([], 2020, 2020)).toEqual([]);
  });
  it('garde une période valide quand les bornes se croisent et autorise une année isolée', () => {
    const bounds = { fromYear: 1996, toYear: 2026 };
    expect(changeHistoryPeriod({ fromYear: 2020, toYear: 2024 }, 'from', 2025, bounds)).toEqual({
      fromYear: 2025,
      toYear: 2025,
    });
    expect(changeHistoryPeriod({ fromYear: 2020, toYear: 2024 }, 'to', 2012, bounds)).toEqual({
      fromYear: 2012,
      toYear: 2012,
    });
    expect(changeHistoryPeriod(bounds, 'from', 1900, bounds)).toEqual(bounds);
    expect(changeHistoryPeriod(bounds, 'to', 2050, bounds)).toEqual(bounds);
    expect(changeHistoryPeriod(bounds, 'to', NaN, bounds)).toEqual(bounds);
    expect(changeHistoryPeriod(bounds, 'from', 2024.5, bounds)).toEqual(bounds);
  });
  it('filtre une année entière, conserve les dates imprécises et recalcule la courbe', () => {
    const source = [
      event('before', '2023-12-31'),
      event('start', '2024-01-01'),
      event('year-only', '2024'),
      event('end', '2024-12-31'),
      event('after', '2025-01-01'),
    ];
    const selected = filterHistory(source, { fromYear: 2024, toYear: 2024 });
    expect(selected.map((item) => item.id)).toEqual(['start', 'year-only', 'end']);
    const points = historyCurve(selected, 2024, 2024);
    expect(points[0]?.x).toBe(0);
    expect(points.at(-1)?.x).toBeGreaterThan(0.99);
    expect(points.at(-1)?.count).toBe(3);
    expect(filterHistory(source, { fromYear: 2000, toYear: 2000 })).toEqual([]);
  });
});

describe('Sandbox Wrapped historique', () => {
  it("récapitule seulement les événements de l'année, sans prix ni rang inventés", () => {
    const wrapped = buildHistoryWrapped(
      data([
        event('past', '2023-12-31'),
        event('model', '2024-01-01', { landmark: true }),
        event('paper', '2024-12-31', {
          organization: 'Autre labo',
          category: 'research',
          landmark: true,
        }),
        event('current', '2026-01-01'),
      ]),
      2024,
    );
    expect(wrapped.events.map((item) => item.id)).toEqual(['model', 'paper']);
    expect(wrapped.highlights).toHaveLength(2);
    expect(wrapped.models).toBe(1);
    expect(wrapped.organizations).toBe(2);
    expect(wrapped.ongoing).toBe(false);
    expect(wrapped).not.toHaveProperty('winner');
  });
  it("signale l'année en cours et accepte une année sans événement", () => {
    expect(buildHistoryWrapped(data([event('now', '2026-10-01')]), 2026).ongoing).toBe(true);
    expect(buildHistoryWrapped(data([]), 2020)).toMatchObject({
      events: [],
      highlights: [],
      models: 0,
      organizations: 0,
      ongoing: false,
    });
  });
});
