import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { DiscoveryHome } from '../src/components/discovery-home';
import { GuideArticle } from '../src/components/guide-article';
import SearchPage from '../src/components/search-screen';
import { latestVideoEpisode, episodeYoutubeUrl } from '../src/domain/home-discovery';
import { historySelectionFromHash } from '../src/domain/history-sharing';
import { guideSchema, validateGuides } from '../src/domain/guides';
import { episodeSchema, siteSettingsSchema } from '../src/domain/schema';
import { setSiteSettingsOverride } from '../src/config/site';
import {
  HOME_STUDIO_WIDE_IMAGE,
  HOME_STUDIO_REVERSE_IMAGE,
  HOME_STUDIO_CLEAN_WALL,
  HOME_STUDIO_PEOPLE,
} from '../src/domain/home-studio';
import { StudioDoor } from '../src/components/studio-door';
import { StudioEasterEggs } from '../src/components/studio-easter-eggs';
import { stat } from 'node:fs/promises';
import siteSettings from '../content/site.json';

import { timeMachineData } from '../src/lib/time-machine';

import guideCatalog from '../content/guides.json';
import { stagePointerMotion } from '../src/domain/stage-motion';
import { homeProfiles, homeProjects } from '../src/domain/home-story';
import { publicHosts } from '../src/lib/repository';
import { personalProjects } from '../src/lib/personal-projects';
import { HomeProjectSpotlight } from '../src/components/home-project-spotlight';
import { HOME_PROJECT_ARTWORK } from '../src/domain/home-project-artwork';
import { Footer } from '../src/components/shell';
import { LocalizationProvider } from '../src/components/localization';

const pilot = episodeSchema.parse({
  number: 1,
  title: 'Pilote de test',
  dek: 'Un pilote destiné uniquement à vérifier les parcours de test.',
  publishedAt: '2026-10-12T12:00:00Z',
  durationSec: 3600,
  description: 'Description du pilote de test.',
  hosts: ['lou'],
  topics: ['agents'],
  platforms: { youtubeId: 'GgSiPkADCz4' },
  cover: { tone: 0, kicker: 'TEST' },
});

afterEach(() => {
  setSiteSettingsOverride(undefined);
});

describe('accueil du Talk Show', () => {
  it('retire les portraits du plateau et utilise les photos publiées dans la présentation de l’équipe', () => {
    const hosts = publicHosts().map((host) => ({
      ...host,
      photo: `/api/host-photos/${host.slug}-published.webp`,
    }));
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [], hosts }));
    const stage = html.slice(html.indexOf('<figure'), html.indexOf('</figure>'));
    for (const person of Object.values(HOME_STUDIO_PEOPLE)) {
      expect(stage).not.toContain(encodeURIComponent(person.photo));
    }
    expect(stage).not.toContain(encodeURIComponent('/api/host-photos/'));
    expect(html).toContain(encodeURIComponent('/api/host-photos/lou-published.webp'));
  });
  it('utilise les couvertures éditoriales à l’accueil et conserve les captures dans le catalogue', async () => {
    const html = renderToStaticMarkup(
      createElement(HomeProjectSpotlight, { projects: homeProjects(personalProjects) }),
    );
    for (const [slug, artwork] of Object.entries(HOME_PROJECT_ARTWORK)) {
      if (!artwork) throw new Error('Couverture absente');
      expect(html).toContain(encodeURIComponent(artwork));
      expect(personalProjects.find((project) => project.slug === slug)?.cover?.src).not.toBe(
        artwork,
      );
      expect((await stat(new URL(`../public${artwork}`, import.meta.url))).size).toBeLessThan(
        300_000,
      );
    }
  });
  it('présente les trois projets dans un carrousel manuel accessible sans masquer leurs liens natifs', () => {
    const projects = homeProjects(personalProjects);
    const html = renderToStaticMarkup(createElement(HomeProjectSpotlight, { projects }));
    expect(html).toContain('aria-roledescription="carrousel"');
    expect(html).toContain('aria-label="Projet précédent"');
    expect(html).toContain('aria-label="Projet suivant"');
    expect(html).toContain('aria-live="polite"');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    for (const project of projects) expect(html).toContain(`href="/nos-projets/${project.slug}"`);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(2);
    expect(renderToStaticMarkup(createElement(HomeProjectSpotlight, { projects: [] }))).toBe('');
  });
  it('relie les deux objets du plateau aux rubriques publiques, même sans vidéoclub', () => {
    const objects = renderToStaticMarkup(createElement(StudioEasterEggs));
    expect(objects).toContain('href="/charts"');
    expect(objects).toContain('aria-label="Classements"');
    expect(objects).toContain('href="/time-machine"');
    expect(objects).toContain('aria-label="Time Machine"');
    const home = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [] }));
    const stage = home.slice(home.indexOf('<figure'), home.indexOf('</figure>'));
    expect(stage).toContain('aria-label="Classements"');
    expect(stage).toContain('aria-label="Time Machine"');
    expect(stage).toContain('href="/charts"');
    expect(stage).toContain('href="/time-machine"');
    expect(stage).not.toContain('Entrer dans le vidéoclub');
    expect(stage).not.toContain('<iframe');
    expect(stage).not.toContain('<video');
  });
  it('sert le nouveau décor intégré dans un budget de 300 Ko', async () => {
    expect(
      (await stat(new URL(`../public${HOME_STUDIO_WIDE_IMAGE}`, import.meta.url))).size,
    ).toBeLessThan(300_000);
  });
  it('ouvre le replay disponible ou le catalogue depuis le bouton principal', () => {
    for (const episodes of [[pilot], []]) {
      const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes }));
      const hero = html.slice(html.indexOf('<section'), html.indexOf('</section>'));
      expect(hero).toContain(episodes.length ? 'href="/episodes/1"' : 'href="/podcast"');
      expect(hero).toContain('Voir l&#x27;émission');
      expect(hero).not.toContain('<canvas');
    }
  });
  it('relie les petits boutons aux chaînes configurées dans un nouvel onglet', () => {
    const spotify = 'https://open.spotify.com/show/2Wp6S4qgRqQaV01AjkDcMH';
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [] }));
    expect(html).toContain(
      'href="https://www.youtube.com/@SandboxFR" target="_blank" rel="noopener noreferrer"',
    );
    expect(html).toContain(`href="${spotify}" target="_blank" rel="noopener noreferrer"`);
    expect(html).not.toContain('/episode/4Dq1kMkrvdHlsp8gYfO1vJ');
    expect(html).not.toContain('utm_source');
    expect(html).not.toContain('disabled');
  });
  it('restaure la chaîne Spotify sur l’accueil et le pied de page avec les anciens réglages publiés', () => {
    setSiteSettingsOverride(
      siteSettingsSchema.parse({
        ...siteSettings,
        platforms: { ...siteSettings.platforms, spotify: 'https://open.spotify.com' },
      }),
    );
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [] }));
    const footer = renderToStaticMarkup(createElement(Footer));
    for (const rendered of [html, footer]) {
      expect(rendered).toContain(`href="${siteSettings.platforms.spotify}"`);
      expect(rendered).not.toContain('href="https://open.spotify.com"');
    }
    expect(html).not.toContain('title="Lien Spotify à venir"');
  });
  it('présente les replays sur le plateau puis l’équipe, les projets et les rubriques', () => {
    const html = renderToStaticMarkup(
      createElement(DiscoveryHome, {
        episodes: [pilot],
        hosts: publicHosts(),
        projects: personalProjects,
      }),
    );
    const sections = [
      'id="discovery-title"',
      'id="home-replays-title"',
      'id="home-team-title"',
      'id="home-projects-title"',
      'id="home-explore-title"',
    ];
    const positions = sections.map((section) => html.indexOf(section));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(new Set(positions).size).toBe(sections.length);
    expect(html).toContain('href="#home-story"');
    expect(html).toContain('href="/nos-projets/okodukai"');
    expect(html).not.toContain('href="/nos-projets/not-my-fault"');
    expect(html).toContain('href="/nos-projets/song-maker"');
    expect(html).toContain('href="/nos-projets/sillage"');
    expect(html).toContain('href="/time-machine"');
    expect(html).toContain('href="/charts"');
    expect(html).not.toContain('Présentation à compléter');
    expect(html).not.toContain('Équipe Sandbox');
  });
  it('privilégie les biographies publiées, ignore les profils absents et les signatures fictives', () => {
    const hosts = publicHosts();
    expect(homeProfiles(hosts).map((host) => host.slug)).toEqual(['lou', 'loic', 'nicolas']);
    const lou = hosts.find((host) => host.slug === 'lou');
    if (!lou) throw new Error('Le profil de Lou est requis pour ce test.');
    expect(homeProfiles([{ ...lou, bio: 'Biographie éditoriale publiée.' }])[0]?.bio).toBe(
      'Biographie éditoriale publiée.',
    );
    expect(homeProfiles([{ ...lou, placeholder: true }])).toEqual([]);
    expect(homeProjects([])).toEqual([]);
    expect(homeProjects(personalProjects).map((project) => project.creator)).toEqual([
      'lou',
      'loic',
      'nicolas',
    ]);
  });
  it('présente une promesse et un accès direct au replay sans charger les autres expériences', () => {
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [pilot] }));
    expect(html).not.toContain('Le podcast IA &amp; tech');
    const title = /<h1\b[^>]*>(.*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]*>/g, '');
    expect(title).toBe('Ce que l&#x27;IA change pour ceux qui construisent.');
    expect(html).toContain('Deux développeurs et un Product Manager');
    expect(html).toContain('Voir l&#x27;émission');
    expect(html).toContain('Découvrir nos projets');
    expect(html).toContain('href="/episodes/1"');
    expect(html).toContain(encodeURIComponent(HOME_STUDIO_WIDE_IMAGE));
    expect(html).toContain(encodeURIComponent(HOME_STUDIO_REVERSE_IMAGE));
    expect(html).not.toContain('/nos-projets/video-club');
    expect(html).not.toContain('studio-warm-video-club-v1.webp');
    expect(html).not.toContain('Décor provisoire');
    expect(html).not.toContain('De gauche à droite : Lou, Loïc et Nico.');
    expect(html).not.toContain('sandbox-trio-tv-v3.png');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('sc-chart-tabs');
  });
  it('rend les destinations du décor explicites et conserve le radar conditionnel', () => {
    const html = renderToStaticMarkup(
      createElement(DiscoveryHome, {
        episodes: [pilot],
        videoClubEnabled: true,
        newsAvailable: true,
      }),
    );
    expect(html).toContain(encodeURIComponent(HOME_STUDIO_WIDE_IMAGE));
    expect(html).toContain('href="/nos-projets/video-club?from=studio"');
    expect(html).toContain('aria-label="Découvrir le vidéoclub des projets"');
    expect(html).toContain('aria-label="Actualités"');
    const stage = html.slice(html.indexOf('<figure'), html.indexOf('</figure>'));
    expect(stage).not.toContain('Nos projets');
    expect(stage).not.toContain('↗');
    expect(html).not.toContain('Décor provisoire');
  });
  it('garde la porte comme lien natif sans charger le magasin avant le clic', () => {
    const html = renderToStaticMarkup(createElement(StudioDoor));
    expect(html).toContain('data-opening="false"');
    expect(html).not.toContain('>Entrer</span>');
    expect(html).toContain('href="/nos-projets/video-club?from=studio"');
    expect(html).not.toContain('room-photoreal-v1.webp');
    expect(html).not.toContain('<video');
    expect(html).not.toContain('<iframe');
  });
  it('garde la langue choisie dans la destination de la porte', () => {
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary: {},
        children: createElement(StudioDoor),
      }),
    );
    expect(html).toContain('href="/en/nos-projets/video-club?from=studio"');
  });
  it('affiche le lien vers les projets uniquement lorsque le vidéoclub est activé', () => {
    const enabled = renderToStaticMarkup(
      createElement(DiscoveryHome, { episodes: [], videoClubEnabled: true }),
    );
    const disabled = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [] }));
    expect(enabled).toContain('aria-label="Découvrir le vidéoclub des projets"');
    expect(disabled).not.toContain('aria-label="Découvrir le vidéoclub des projets"');
    expect(enabled).not.toContain('entrance-cinematic-v2.webp');
  });
  it('reprend les vrais portraits du À propos et retire les illustrations de collection', () => {
    const hosts = publicHosts();
    const page = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [], hosts }));
    const html = page.slice(page.indexOf('id="home-story"'));
    for (const host of hosts) {
      if (!host.placeholder && host.photo) expect(html).toContain(encodeURIComponent(host.photo));
    }
    expect(html).not.toContain('body-no-mic');
    expect(html).not.toContain(encodeURIComponent(HOME_STUDIO_CLEAN_WALL));
    expect(html).not.toContain('/images/home/hosts/');
    expect(html).not.toContain('data-host-card');
    expect(html).toContain('href="/about"');
  });

  it('reprend la biographie publiée par Lou sans la reformuler', () => {
    const hosts = publicHosts();
    const lou = homeProfiles(hosts).find((host) => host.slug === 'lou');
    if (!lou) throw new Error('Le profil de Lou est requis pour ce test.');
    expect(lou.focus).toBe('Créateur de quêtes du quotidien');
    expect(lou.bio).toBe(hosts.find((host) => host.slug === 'lou')?.bio);
    expect(lou.bio).toContain(
      "J'aime les jeux vidéo et je cherche comment leurs mécaniques peuvent aider à apprendre.",
    );
    expect(lou.bio).toContain('Avec Héros de la classe, Okodukai et Not My Fault');
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [], hosts }));
    const article = html.slice(html.indexOf('<h3>Lou</h3>'), html.indexOf('<h3>Loïc</h3>'));
    expect(article).toMatch(/<p[^>]*>J&#x27;aime les jeux vidéo/);
    expect(article).toContain('Héros de la classe, Okodukai et Not My Fault');
    expect(article).not.toContain('Lou construit des applications');
  });
  it('présente les titres choisis et des biographies complètes', () => {
    const team = homeProfiles(publicHosts());
    expect(team.map((host) => host.focus)).toEqual([
      'Créateur de quêtes du quotidien',
      'Inventeur, même sans Wi-Fi',
      "Chef d'orchestre des agents",
    ]);
    expect(team.every((host) => host.bio.trim().length > 0 && host.bio.length < 400)).toBe(true);
  });
  it('reste utilisable sans épisode et ne présente pas un replay fictif', () => {
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [] }));
    expect(html).toContain('href="/podcast"');
    expect(html).toContain('Voir l&#x27;émission');
    expect(html).not.toContain('<article');
    expect(html).not.toContain('Dernier épisode');
    expect(html).not.toContain('youtube.com/watch');
    expect(html).not.toContain('href="#home-episode-title"');
  });
  it('choisit le dernier replay publié et exclut les brouillons et épisodes sans vidéo', () => {
    const draft = {
      ...pilot,
      number: 2,
      status: 'draft' as const,
      publishedAt: '2026-10-16T12:00:00Z',
    };
    const audioOnly = { ...pilot, number: 3, platforms: {}, publishedAt: '2026-10-17T12:00:00Z' };
    const episodes = [audioOnly, pilot, draft];
    expect(latestVideoEpisode(episodes)?.number).toBe(1);
    expect(episodeYoutubeUrl(pilot)).toBe('https://www.youtube.com/watch?v=GgSiPkADCz4');
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes }));
    expect([...html.matchAll(/data-analytics-episode="1"/g)]).toHaveLength(1);
    expect(html).not.toContain('href="/episodes/2"');
    expect(html).not.toContain('href="/episodes/3"');
  });
  it('limite le mur aux huit dernières émissions sans répéter les affiches', () => {
    const episodes = Array.from({ length: 10 }, (_, index) => ({ ...pilot, number: index + 1 }));
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes }));
    const wall = html.slice(html.indexOf('data-studio-wall="true"'));
    const posters = [...wall.matchAll(/data-analytics-episode="(\d+)"/g)].map((match) =>
      Number(match[1]),
    );
    expect(posters).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);
    expect(html).not.toContain('href="/episodes/1"');
    expect(html).not.toContain('href="/episodes/2"');
  });
});

describe('mouvement du plateau', () => {
  it('garde le décor immobile au centre et borne sa profondeur même hors du cadre', () => {
    expect(stagePointerMotion(600, 400, 1200, 800)).toEqual({ x: 0, y: 0 });
    expect(stagePointerMotion(0, 0, 1200, 800)).toEqual({ x: -6, y: -4 });
    expect(stagePointerMotion(1200, 800, 1200, 800)).toEqual({ x: 6, y: 4 });
    expect(stagePointerMotion(-500, 2000, 1200, 800)).toEqual({ x: -6, y: 4 });
    expect(stagePointerMotion(2000, -500, 1200, 800)).toEqual({ x: 6, y: -4 });
  });
  it('revient à une profondeur nulle si les coordonnées ou dimensions sont invalides', () => {
    for (const [x, y, width, height] of [
      [NaN, 400, 1200, 800],
      [600, Infinity, 1200, 800],
      [600, 400, 0, 800],
      [600, 400, 1200, 0],
      [600, 400, -1, 800],
      [600, 400, 1200, -1],
      [600, 400, Infinity, 800],
      [600, 400, 1200, NaN],
    ] as const)
      expect(stagePointerMotion(x, y, width, height)).toEqual({ x: 0, y: 0 });
  });
  it('reconstruit la même profondeur sans dépendre de la trajectoire du pointeur', () => {
    const initial = stagePointerMotion(900, 600, 1200, 800);
    stagePointerMotion(0, 0, 1200, 800);
    expect(stagePointerMotion(900, 600, 1200, 800)).toEqual(initial);
    expect(initial).toEqual({ x: 3, y: 2 });
  });
});

describe('histoire partageable et recherche', () => {
  it('ouvre uniquement les événements et les années réellement présents', () => {
    const data = timeMachineData();
    expect(historySelectionFromHash('#ia-transformer', data)).toEqual({
      kind: 'event',
      id: 'transformer',
    });
    expect(historySelectionFromHash('#wrapped-2022', data)).toEqual({ kind: 'year', year: 2022 });
    for (const hash of [
      '#ia-invented',
      '#wrapped-1800',
      '#wrapped-2022<script>',
      '#wrapped-3000',
      '#ia-%3Cscript%3E',
    ])
      expect(historySelectionFromHash(hash, data)).toBeUndefined();
  });
  it('retrouve un événement sans ressortir une ancienne fiche de démonstration', async () => {
    const html = renderToStaticMarkup(
      await SearchPage({ searchParams: Promise.resolve({ q: 'Transformer', type: 'history' }) }),
    );
    expect(html).toContain('href="/time-machine#ia-transformer"');
    const demo = renderToStaticMarkup(
      await SearchPage({
        searchParams: Promise.resolve({ q: 'anthropic-skills', type: 'entities' }),
      }),
    );
    expect(demo).not.toContain('href="/projects/anthropic-skills"');
  });
});

describe('préparation des guides sans publication fictive', () => {
  const guide = {
    slug: 'guide-test',
    title: 'Un guide de test',
    outcome: 'Un résultat explicite pour cette seule fixture de test.',
    audience: 'Débutants',
    level: 'beginner',
    publishedAt: '2026-10-15',
    updatedAt: '2026-10-15',
    episodeNumber: 1,
    youtubeId: 'GgSiPkADCz4',
    steps: [
      { title: 'Première étape', text: 'Une instruction concrète de plus de vingt caractères.' },
    ],
    resources: [{ label: 'Source de test', url: 'https://example.com' }],
  };
  it('garde le catalogue vide et valide le lien vers un épisode publié', () => {
    expect(validateGuides(guideCatalog, [pilot])).toEqual([]);
    expect(validateGuides([guide], [pilot])).toHaveLength(1);
    expect(() => validateGuides([guide], [])).toThrow('Épisode publié absent');
    expect(() => validateGuides([guide, guide], [pilot])).toThrow('Guide dupliqué');
    expect(
      guideSchema.safeParse({
        ...guide,
        resources: [{ label: 'Lien', url: 'javascript:alert(1)' }],
      }).success,
    ).toBe(false);
  });
  it('rend un clip à la demande, des étapes, des sources et le retour vers l’épisode', () => {
    const html = renderToStaticMarkup(
      createElement(GuideArticle, { guide: guideSchema.parse(guide) }),
    );
    expect(html).toContain('href="/episodes/1"');
    expect(html).toContain('Première étape');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('Charger la vidéo YouTube');
    expect(html).not.toContain('<iframe');
  });
});
