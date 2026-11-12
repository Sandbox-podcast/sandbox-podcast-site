import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { DiscoveryHome } from '../src/components/discovery-home';
import { latestVideoEpisode, episodeYoutubeUrl } from '../src/domain/home-discovery';
import { episodeSchema, siteSettingsSchema } from '../src/domain/schema';
import { setSiteSettingsOverride } from '../src/config/site';
import {
  HOME_STUDIO_WIDE_IMAGE,
  HOME_STUDIO_CLEAN_WALL,
  HOME_STUDIO_PEOPLE,
} from '../src/domain/home-studio';
import { StudioDoor } from '../src/components/studio-door';
import { stat } from 'node:fs/promises';
import siteSettings from '../content/site.json';

import { stagePointerMotion } from '../src/domain/stage-motion';
import { homeProfiles, homeProjects } from '../src/domain/home-story';
import { publicHosts } from '../src/lib/repository';
import { personalProjects } from '../src/lib/personal-projects';
import { HomeProjectSpotlight } from '../src/components/home-project-spotlight';
import { HOME_PROJECT_ARTWORK } from '../src/domain/home-project-artwork';
import { Footer } from '../src/components/shell';
import { LocalizationProvider } from '../src/components/localization';
import { SandboxRoomContent } from '../src/components/sandbox-room-content';

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
  it('ne garde que le vidéoclub dans les repères', () => {
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [] }));
    const section = html.slice(
      html.indexOf('data-home-section="explore"'),
      html.indexOf('</section>', html.indexOf('data-home-section="explore"')),
    );
    expect(section).toContain('href="/nos-projets"');
    expect(section).toContain('aria-labelledby="home-project-room-title"');
    expect(section).toContain('aria-describedby="home-project-room-description"');
    expect(section).toContain('/images/rooms/video-club-room-v2.webp');
    expect(section).toContain('data-analytics-destination="projects"');
    expect(section.match(/<a\b/g)).toHaveLength(1);
    for (const href of ['/charts', '/time-machine', '/news'])
      expect(section).not.toContain(`href="${href}"`);
  });
  it('retire les portraits du plateau et utilise les photos publiées dans la présentation de l’équipe', () => {
    const hosts = publicHosts().map((host) => ({
      ...host,
      photo: `/api/host-photos/${host.slug}-published.webp`,
    }));
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [], hosts }));
    const stage = html.slice(html.indexOf('data-sandbox-room='), html.indexOf('id="home-story"'));
    expect(stage).toContain('data-sandbox-room="studio"');
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
  it('sert le nouveau décor intégré dans un budget de 300 Ko', async () => {
    expect(
      (await stat(new URL(`../public${HOME_STUDIO_WIDE_IMAGE}`, import.meta.url))).size,
    ).toBeLessThan(300_000);
  });
  it('réserve le bas de scène au disclosure des pièces, sans liens éditoriaux dispersés', () => {
    for (const episodes of [[pilot], []]) {
      const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes }));
      const hero = html.slice(html.indexOf('<section'), html.indexOf('</section>'));
      expect(hero).not.toContain('Voir l&#x27;émission');
      expect(hero).not.toContain('href="/episodes/1"');
      expect(hero).toMatch(/<canvas\b[^>]*aria-hidden="true"/);
      const disclosure =
        /<details\b[^>]*data-world-explorer[\s\S]*?<\/details>/.exec(html)?.[0] ?? '';
      expect(disclosure).toContain('Explorer les pièces');
      expect(disclosure).not.toMatch(/<details\b[^>]*\sopen(?:=|\s|>)/);
      expect(disclosure).toContain('aria-label="Les pièces"');
      expect(disclosure).not.toContain('<a ');
      expect(html).not.toContain('Voir l&#x27;émission');
      expect(html).not.toContain('Rencontrer l&#x27;équipe');
    }
  });
  it('conserve les chaînes configurées dans le footer général sans les répéter sous la scène', () => {
    const spotify = 'https://open.spotify.com/show/2Wp6S4qgRqQaV01AjkDcMH';
    const html = renderToStaticMarkup(createElement(Footer));
    expect(html).toContain(
      'href="https://www.youtube.com/@SandboxFR?sub_confirmation=1" target="_blank" rel="noopener noreferrer"',
    );
    expect(html).toContain(`href="${spotify}" target="_blank" rel="noopener noreferrer"`);
    expect(html).not.toContain('/episode/4Dq1kMkrvdHlsp8gYfO1vJ');
    expect(html).not.toContain('utm_source');
    expect(html).not.toContain('disabled');
  });
  it('restaure la chaîne Spotify du pied de page avec les anciens réglages publiés', () => {
    setSiteSettingsOverride(
      siteSettingsSchema.parse({
        ...siteSettings,
        platforms: { ...siteSettings.platforms, spotify: 'https://open.spotify.com' },
      }),
    );
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [] }));
    const footer = renderToStaticMarkup(createElement(Footer));
    expect(footer).toContain(`href="${siteSettings.platforms.spotify}"`);
    expect(footer).not.toContain('href="https://open.spotify.com"');
    expect(html).not.toContain(`href="${siteSettings.platforms.spotify}"`);
    expect(html).not.toContain('title="Lien Spotify à venir"');
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
  it('présente l’accroche et le choix des pièces sans charger le cinéma dans le plateau', () => {
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [pilot] }));
    expect(html).not.toContain('Le podcast IA &amp; tech');
    const title = /<h1\b[^>]*>(.*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]*>/g, '');
    expect(title).toBe('Bienvenue dans l&#x27;univers de Sandbox.');
    expect(html).toContain('data-minimal-studio');
    expect(html).toContain('Explorer les pièces');
    expect(html).not.toContain('Découvrir nos projets');
    expect(html).not.toContain('href="/episodes/1"');
    expect(html).toContain(encodeURIComponent(HOME_STUDIO_WIDE_IMAGE));
    expect(html).toContain('<option value="cinema">');
    expect(html).not.toContain('data-room-content="cinema"');
    expect(html).not.toContain('/nos-projets/video-club');
    expect(html).not.toContain('studio-warm-video-club-v1.webp');
    expect(html).not.toContain('Décor provisoire');
    expect(html).not.toContain('De gauche à droite : Lou, Loïc et Nico.');
    expect(html).not.toContain('sandbox-trio-tv-v3.png');
    expect(html).not.toContain('<iframe');
    expect(html).toMatch(/<canvas\b[^>]*aria-hidden="true"/);
    expect(html).not.toContain('sc-chart-tabs');
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
  it('garde la pièce des projets disponible indépendamment de l’ancien drapeau du vidéoclub', () => {
    const enabled = renderToStaticMarkup(
      createElement(DiscoveryHome, { episodes: [], videoClubEnabled: true }),
    );
    const disabled = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [] }));
    for (const html of [enabled, disabled]) {
      expect(html).toContain('<option value="projects">');
      expect(html).toContain('href="/nos-projets"');
      expect(html).not.toContain('data-studio-scroll');
    }
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
    expect(html).toContain('Explorer les pièces');
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
    const html = renderToStaticMarkup(
      createElement(SandboxRoomContent, { roomId: 'cinema', episodes, projects: [] }),
    );
    expect(html).toContain('href="/episodes/1"');
    expect(html).toContain('data-room-content="cinema"');
    expect(html).not.toContain('href="/episodes/2"');
    expect(html).not.toContain('href="/episodes/3"');
  });
  it('réserve les affiches au cinéma et remplit les six cadres sans doublons', () => {
    const episodes = Array.from({ length: 10 }, (_, index) => ({ ...pilot, number: index + 1 }));
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes }));
    expect(html).toContain('<option value="cinema">');
    expect(html).not.toContain('data-room-content="cinema"');
    const cinema = renderToStaticMarkup(
      createElement(SandboxRoomContent, { roomId: 'cinema', episodes, projects: [] }),
    );
    const posters = [...cinema.matchAll(/href="\/episodes\/(\d+)"/g)].map((match) =>
      Number(match[1]),
    );
    expect(posters).toEqual([10, 9, 8, 7, 6, 5]);
    expect(cinema).toContain('Replays suivants');
    expect(cinema).not.toContain('href="/episodes/1"');
    expect(cinema).not.toContain('href="/episodes/2"');
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
