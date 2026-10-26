import { analyticsActionFromDataset } from '../src/domain/analytics-actions';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SandboxRoomContent,
  cinemaReplayPage,
  projectBayPage,
} from '../src/components/sandbox-room-content';
import { LocalizationProvider } from '../src/components/localization';
import { episodeSchema } from '../src/domain/schema';
import {
  SANDBOX_ROOMS,
  SANDBOX_CHART_TERMINALS,
  isSandboxRoomId,
  sandboxRoom,
} from '../src/domain/sandbox-rooms';
import historySource from '../content/ai-history.json';
import { HISTORY_ERAS, sortHistory, timeMachineDataSchema } from '../src/domain/time-machine';
import { personalProjects } from '../src/lib/personal-projects';
import english from '../src/i18n/dictionaries/en.json';
import spanish from '../src/i18n/dictionaries/es-es.json';
import german from '../src/i18n/dictionaries/de-de.json';

const episode = episodeSchema.parse({
  number: 2,
  title: 'Notre épisode publié',
  dek: "Les essais de l'équipe.",
  description: '',
  publishedAt: '2026-10-18T19:14:00.000Z',
  hosts: ['lou', 'loic', 'nicolas'],
  platforms: { youtubeId: '7KVqydbGow0' },
  cover: { tone: 0, kicker: 'SANDBOX #2' },
  status: 'published',
});

describe('contenus des six salles', () => {
  it('présente l’accroche et explique la visite des six salles en mode immersif', () => {
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'studio',
        episodes: [episode],
        projects: personalProjects,
        minimalStudio: true,
        heroCopy: {
          eyebrow: 'Repère absent',
          title: 'Notre phrase',
          description: 'Notre présentation',
        },
      }),
    );
    expect(html).toContain('Notre phrase');
    expect(html).toContain('Explore les six salles via le portail ou le bouton en haut à droite.');
    expect(html).toContain('data-studio-inscription="true"');
    expect(html).toContain('id="room-title-studio" tabindex="-1"');
    expect(html).not.toContain('Repère absent');
    expect(html).toContain('Notre présentation');
    expect(html).toMatch(
      /<a[^>]*href="https:\/\/www.youtube.com\/@SandboxFR\?sub_confirmation=1"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*data-studio-videos[^>]*>Nos vidéos/,
    );
    expect(html).toContain('data-analytics-event="youtube_open"');
    const link = /<a[^>]*data-studio-videos[^>]*>/u.exec(html)?.[0] ?? '';
    const action = analyticsActionFromDataset({
      analyticsEvent: /data-analytics-event="([^"]+)"/u.exec(link)?.[1],
      analyticsPlacement: /data-analytics-placement="([^"]+)"/u.exec(link)?.[1],
    });
    expect(action.success).toBe(true);
    if (action.success) expect(action.data).toEqual({ name: 'youtube_open', placement: 'home' });

    expect(html).not.toContain('<button');
  });

  it.each([
    ['en', english, 'Our videos'],
    ['es-es', spanish, 'Nuestros vídeos'],
    ['de-de', german, 'Unsere Videos'],
  ] as const)('traduit le bouton YouTube en %s même sans épisode', (locale, dictionary, label) => {
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale,
        dictionary,
        children: createElement(SandboxRoomContent, {
          roomId: 'studio',
          episodes: [],
          projects: [],
          minimalStudio: true,
        }),
      }),
    );
    expect(html).toContain(`>${label}<`);
    expect(html).toContain('href="https://www.youtube.com/@SandboxFR?sub_confirmation=1"');
  });

  it('présente les deux replays disponibles sans compléter le mur avec de fausses affiches', () => {
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'cinema',
        episodes: [episode, { ...episode, number: 1 }],
        projects: [],
      }),
    );
    expect(html.match(/href="\/episodes\/\d+"/g)).toHaveLength(2);
    expect(html).not.toContain('data-cinema-pagination');
    expect(html).not.toContain('Replays précédents');
    expect(html).not.toContain('Replays suivants');
    expect(html).toContain('id="room-title-cinema" tabindex="-1"');
  });

  it('affiche les trois épisodes ensemble dès la première page du cinéma', () => {
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'cinema',
        projects: [],
        episodes: [1, 2, 3].map((number) => ({ ...episode, number })),
      }),
    );
    for (const number of [1, 2, 3]) expect(html).toContain(`href="/episodes/${number}"`);
    expect(html).not.toContain('data-cinema-pagination');
  });

  it('parcourt trente replays dans les six cadres sans en perdre ni en dupliquer', () => {
    const collection = Array.from({ length: 30 }, (_, index) => ({
      ...episode,
      number: index + 1,
      title: `Émission ${String(index + 1)} avec son titre complet`,
    }));
    for (const size of [1, 2, 6]) {
      const visited: number[] = [];
      for (let index = 0; index < 30 / size; index++) {
        const page = cinemaReplayPage(collection, index, size);
        expect(page.items).toHaveLength(size);
        expect(page.from).toBe(index * size + 1);
        expect(page.to).toBe((index + 1) * size);
        expect(page.total).toBe(30);
        visited.push(...page.items.map(({ number }) => number));
      }
      expect(visited).toEqual(Array.from({ length: 30 }, (_, index) => 30 - index));
      expect(cinemaReplayPage(collection, 100, size).page).toBe(30 / size - 1);
      expect(cinemaReplayPage(collection, -1, size).page).toBe(0);
    }
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'cinema',
        episodes: collection,
        projects: [],
      }),
    );
    expect(html.match(/href="\/episodes\/\d+"/g)).toHaveLength(6);
    expect(html).toContain('Replays 1–6 sur 30');
    expect(html).toContain('data-cinema-pagination="true"');
    expect(html).toContain('Replays précédents</button>');
    expect(html).toContain('Replays suivants<span');
    expect(html).toContain('Émission 30 avec son titre complet');
    expect(html).not.toContain('href="/episodes/24"');
  });

  it('ne montre pas de navigation inactive lorsqu’un seul replay est publié', () => {
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'cinema',
        episodes: [episode],
        projects: [],
      }),
    );
    expect(html.match(/href="\/episodes\/\d+"/g)).toHaveLength(1);
    expect(html).not.toContain('data-cinema-pagination');
  });

  it('gère une dernière page incomplète, les valeurs invalides et une collection vide', () => {
    const collection = Array.from({ length: 8 }, (_, index) => ({
      ...episode,
      number: index + 1,
    }));
    expect(cinemaReplayPage(collection, 1).items.map(({ number }) => number)).toEqual([2, 1]);
    expect(cinemaReplayPage(collection.slice(0, 7), 1).items.map(({ number }) => number)).toEqual([
      1,
    ]);
    expect(cinemaReplayPage(collection, 0, 100).items).toHaveLength(6);
    expect(cinemaReplayPage(collection, Number.NaN, Number.NaN).page).toBe(0);
    expect(cinemaReplayPage([], 5)).toMatchObject({
      items: [],
      page: 0,
      pageCount: 0,
      from: 0,
      to: 0,
      total: 0,
    });
    const filtered = cinemaReplayPage(
      [
        ...collection,
        { ...episode, number: 90, status: 'draft' },
        { ...episode, number: 91, platforms: {} },
      ],
      0,
    );
    expect(filtered.total).toBe(8);
  });

  it('préserve les textes publics transmis depuis le serveur', () => {
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'studio',
        episodes: [],
        projects: [],
        heroCopy: {
          eyebrow: 'Mon repère publié',
          title: 'Mon titre publié',
          description: 'Mon introduction publiée',
        },
      }),
    );
    expect(html).toContain('Mon repère publié');
    expect(html).toContain('Mon titre publié');
    expect(html).toContain('Mon introduction publiée');
  });

  it('rend quatre terminaux vers les vraies familles des classements', () => {
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, { roomId: 'rankings', episodes: [], projects: [] }),
    );
    for (const terminal of SANDBOX_CHART_TERMINALS)
      expect(html).toContain(`href="${terminal.href}"`);
    expect(html).not.toContain('Top 1');
  });

  it('présente tout le corpus historique dans l’ordre sans réduire la frise à quelques jalons', () => {
    const data = timeMachineDataSchema.parse(historySource);
    const reversed = [...data.events].reverse();
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'history',
        episodes: [],
        projects: [],
        historyData: { ...data, events: reversed },
      }),
    );
    const ordered = sortHistory(data.events);
    const rail = html.slice(html.indexOf('<ol'), html.indexOf('</ol>'));
    expect([...rail.matchAll(/datetime="([^"]+)"/gi)].map((match) => match[1])).toEqual(
      ordered.map((event) => event.date),
    );
    expect(rail.match(/data-history-index="/g)).toHaveLength(data.events.length);
    expect(rail.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain(`href="/time-machine#ia-${ordered[0]?.id}"`);
    expect(html).toContain('événements documentés');
    expect(reversed).toEqual([...data.events].reverse());
    for (const era of HISTORY_ERAS) expect(html).toContain(`${era.from}–${era.to}`);
  });

  it('garde les années vides sans fabriquer d’événement pour remplir une période', () => {
    const data = timeMachineDataSchema.parse(historySource);
    const first = sortHistory(data.events)[0];
    if (!first) throw new Error('Le corpus de test doit contenir un événement.');
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'history',
        episodes: [],
        projects: [],
        historyData: { ...data, events: [first] },
      }),
    );
    const navigation = html.slice(html.indexOf('<nav'), html.indexOf('</nav>'));
    expect(navigation.match(/disabled=""/g)).toHaveLength(HISTORY_ERAS.length - 1);
    expect(html.match(/data-history-index="/g)).toHaveLength(1);
    expect(html).toContain(first.summary);
    const empty = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'history',
        episodes: [],
        projects: [],
        historyData: { ...data, events: [] },
      }),
    );
    expect(empty).toContain('La chronologie sera bientôt disponible.');
    expect(empty).not.toContain('data-history-index');
  });

  it('associe six salles distinctes à des destinations publiques du site', () => {
    expect(new Set(SANDBOX_ROOMS.map(({ id }) => id)).size).toBe(6);
    expect(SANDBOX_ROOMS.map(({ href }) => href)).toEqual([
      '/podcast',
      '/nos-projets',
      '/charts',
      '/time-machine',
      '/podcast',
      '/news',
    ]);
    expect(isSandboxRoomId('history')).toBe(true);
    expect(isSandboxRoomId('admin')).toBe(false);
    expect(sandboxRoom('news').href).toBe('/news');
  });

  it('expose les replays publiés avec vidéo, du plus récent au plus ancien', () => {
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'cinema',
        projects: [],
        episodes: [
          episode,
          { ...episode, number: 8, title: 'Le brouillon privé', status: 'draft' },
          { ...episode, number: 9, title: 'Sans vidéo', platforms: {} },
          { ...episode, number: 3, publishedAt: '2026-10-19T19:14:00.000Z' },
        ],
      }),
    );
    expect(html).toContain('href="/episodes/2"');
    expect(html).toContain('href="/episodes/3"');
    expect(html.indexOf('href="/episodes/3"')).toBeLessThan(html.indexOf('href="/episodes/2"'));
    expect(html).not.toContain('Le brouillon privé');
    expect(html).not.toContain('Sans vidéo');
    expect(html).not.toContain('href="/episodes/8"');
    expect(html).not.toContain('href="/episodes/9"');
  });

  it('rend de vraies fiches projet et représente les trois auteurs', () => {
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'projects',
        projects: personalProjects,
        episodes: [],
      }),
    );
    let visible = 0;
    for (const creator of ['lou', 'loic', 'nicolas'] as const) {
      const selections = personalProjects
        .filter((project) => project.creator === creator)
        .slice(0, 9);
      visible += selections.length;
      for (const project of selections)
        expect(html).toContain(`href="/nos-projets/${project.slug}"`);
    }
    expect(html.match(/class="[^"]*tape_/g)?.length).toBe(visible);
    expect(html).toContain('--tape-y:66%');
  });

  it('donne accès à tous les projets par auteur, sans perdre les rayons suivants', () => {
    const allSeen: string[] = [];
    for (const creator of ['lou', 'loic', 'nicolas'] as const) {
      const expected = personalProjects.filter((project) => project.creator === creator);
      const first = projectBayPage(personalProjects, creator, 0);
      expect(first.total).toBe(expected.length);
      const seen: string[] = [];
      for (let page = 0; page < first.pageCount; page++)
        seen.push(...projectBayPage(personalProjects, creator, page).items.map(({ slug }) => slug));
      expect(seen).toEqual(expected.map(({ slug }) => slug));
      expect(new Set(seen).size).toBe(expected.length);
      expect(projectBayPage(personalProjects, creator, 999).page).toBe(first.pageCount - 1);
      allSeen.push(...seen);
    }
    expect(allSeen).toHaveLength(personalProjects.length);
    expect(projectBayPage([], 'lou', 4)).toMatchObject({ page: 0, pageCount: 0, items: [] });
  });

  it('n’invente pas de contenu lorsque le catalogue ou les replays sont vides', () => {
    const cinema = renderToStaticMarkup(
      createElement(SandboxRoomContent, { roomId: 'cinema', episodes: [], projects: [] }),
    );
    const projects = renderToStaticMarkup(
      createElement(SandboxRoomContent, { roomId: 'projects', episodes: [], projects: [] }),
    );
    expect(cinema).toContain('Aucun replay disponible pour le moment.');
    expect(cinema).not.toContain('href="/episodes/');
    expect(projects).toContain('Les projets seront bientôt disponibles.');
  });

  it('ne propose pas de lien vers les actualités lorsqu’elles sont indisponibles', () => {
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, {
        roomId: 'news',
        projects: [],
        episodes: [],
        newsAvailable: false,
      }),
    );
    expect(html).toContain('Les actualités seront bientôt disponibles.');
    expect(html).not.toContain('href="/news"');
  });

  it.each([
    ['en', english, '/en'],
    ['es-ES', spanish, '/es-es'],
    ['de-DE', german, '/de-de'],
  ] as const)(
    'localise les six salles et leurs destinations en %s',
    (locale, dictionary, prefix) => {
      for (const room of SANDBOX_ROOMS) {
        for (const source of [room.title, room.subtitle, room.description, room.action]) {
          expect(dictionary).toHaveProperty(source);
        }
        const html = renderToStaticMarkup(
          createElement(LocalizationProvider, {
            locale,
            dictionary,
            children: createElement(SandboxRoomContent, {
              roomId: room.id,
              episodes: [],
              projects: [],
            }),
          }),
        );
        // La Time Machine reste française, selon son contrat de routage existant.
        const route = room.id === 'history' ? room.href : `${prefix}${room.href}`;
        expect(html).toContain(`href="${route}"`);
        if (room.id !== 'studio') expect(html).not.toContain(`>${room.description}<`);
      }
    },
  );
});
