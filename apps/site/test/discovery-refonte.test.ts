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
  HOME_STUDIO_IMAGE,
  HOME_STUDIO_DOOR_IMAGE,
  HOME_STUDIO_CLEAN_WALL,
  HOME_STUDIO_PEOPLE,
} from '../src/domain/home-studio';
import { StudioDoor } from '../src/components/studio-door';
import { StudioEasterEggs } from '../src/components/studio-easter-eggs';
import { stat } from 'node:fs/promises';
import siteSettings from '../content/site.json';

import { timeMachineData } from '../src/lib/time-machine';

import guideCatalog from '../content/guides.json';
import { stageMotion } from '../src/domain/stage-motion';
import { homeProfiles, homeProjects } from '../src/domain/home-story';
import { publicHosts } from '../src/lib/repository';
import { personalProjects } from '../src/lib/personal-projects';
import { HomeProjectSpotlight } from '../src/components/home-project-spotlight';
import { HOME_PROJECT_ARTWORK } from '../src/domain/home-project-artwork';
import { HOME_HOST_ARTWORK } from '../src/domain/home-host-artwork';
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
  it('conserve les détourages du plateau quand les photos des profils viennent de l’administration', () => {
    const hosts = publicHosts().map((host) => ({
      ...host,
      photo: `/api/host-photos/${host.slug}-published.webp`,
    }));
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [], hosts }));
    const stage = html.slice(html.indexOf('<figure'), html.indexOf('</figure>'));
    for (const person of Object.values(HOME_STUDIO_PEOPLE)) {
      expect(stage).toContain(encodeURIComponent(person.photo));
    }
    expect(stage).not.toContain(encodeURIComponent('/api/host-photos/'));
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
    expect(stage).toContain(objects);
    expect(stage).not.toContain('Entrer dans le vidéoclub');
    expect(stage).not.toContain('<iframe');
    expect(stage).not.toContain('<video');
  });
  it('sert le nouveau décor intégré dans un budget de 300 Ko', async () => {
    expect(
      (await stat(new URL(`../public${HOME_STUDIO_IMAGE}`, import.meta.url))).size,
    ).toBeLessThan(300_000);
  });
  it('ouvre le replay disponible ou le catalogue depuis le bouton principal', () => {
    for (const episodes of [[pilot], []]) {
      const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes }));
      const hero = html.slice(html.indexOf('<section'), html.indexOf('</section>'));
      expect(hero).toContain(episodes.length ? 'href="/episodes/1"' : 'href="/podcast"');
      expect(hero).toContain(
        episodes.length ? 'Regarder le dernier épisode' : 'Découvrir l&#x27;émission',
      );
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
  it('présente les animateurs puis leurs projets avant les rubriques et le replay', () => {
    const html = renderToStaticMarkup(
      createElement(DiscoveryHome, {
        episodes: [pilot],
        hosts: publicHosts(),
        projects: personalProjects,
      }),
    );
    const sections = [
      'id="discovery-title"',
      'id="home-team-title"',
      'id="home-projects-title"',
      'id="home-explore-title"',
      'id="home-episode-title"',
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
    expect(html).toContain('Gardez une longueur d&#x27;avance sur la tech.');
    expect(html).toContain('Chaque semaine, retrouvez Lou, Loïc et Nico pour décrypter');
    expect(html).toContain('Regarder le dernier épisode');
    expect(html).toContain('href="/episodes/1"');
    expect(html).toContain(encodeURIComponent(HOME_STUDIO_IMAGE));
    expect(html).not.toContain('/nos-projets/video-club');
    expect(html).not.toContain('studio-warm-video-club-v1.webp');
    expect(html).not.toContain('Décor provisoire');
    expect(html).not.toContain('De gauche à droite : Lou, Loïc et Nico.');
    expect(html).not.toContain('sandbox-trio-tv-v3.png');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('sc-chart-tabs');
  });
  it('conserve la porte cachée du plateau et un accès séparé pour le mobile', () => {
    const html = renderToStaticMarkup(
      createElement(DiscoveryHome, { episodes: [pilot], videoClubEnabled: true }),
    );
    expect(html).toContain(encodeURIComponent(HOME_STUDIO_DOOR_IMAGE));
    expect(html).toContain('href="/nos-projets/video-club?from=studio"');
    expect(html).toContain('aria-label="Découvrir le vidéoclub des projets"');
    expect(html).toContain('aria-label="Entrer dans le vidéoclub"');
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
  it('place la vignette mobile du vidéoclub après les plateformes uniquement lorsque le club est activé', () => {
    const enabled = renderToStaticMarkup(
      createElement(DiscoveryHome, { episodes: [], videoClubEnabled: true }),
    );
    const disabled = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [] }));
    const label = 'aria-label="Découvrir le vidéoclub des projets"';
    const spotifyPosition = enabled.indexOf('href="https://open.spotify.com/');
    expect(spotifyPosition).toBeGreaterThan(0);
    expect(enabled.indexOf(label)).toBeGreaterThan(spotifyPosition);
    const cardLink = enabled.match(/<a\b[^>]*>/g)?.find((tag) => tag.includes(label));
    expect(cardLink).toContain('href="/nos-projets/video-club?from=studio"');
    expect(disabled).not.toContain(label);
    expect(enabled).toContain(encodeURIComponent('/video-club/entrance-cinematic-v2.webp'));
    expect(disabled).not.toContain('entrance-cinematic-v2.webp');
    expect(enabled).not.toContain('room-photoreal-v1.webp');
  });
  it('réserve les illustrations fantastiques aux cartes de l’accueil sans réutiliser les bustes du plateau', () => {
    const hosts = publicHosts();
    const page = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [], hosts }));
    const html = page.slice(page.indexOf('id="home-story"'));
    for (const host of hosts) {
      const illustration = HOME_HOST_ARTWORK[host.slug] ?? host.photo;
      if (!host.placeholder && illustration)
        expect(html).toContain(encodeURIComponent(illustration));
    }
    expect(html).not.toContain('body-no-mic');
    expect(html).not.toContain(encodeURIComponent(HOME_STUDIO_CLEAN_WALL));
    expect(html).not.toContain('cutout-mask');
  });

  it('reprend la biographie fournie par Lou et conserve ses deux paragraphes', () => {
    const hosts = publicHosts();
    const lou = homeProfiles(hosts).find((host) => host.slug === 'lou');
    if (!lou) throw new Error('Le profil de Lou est requis pour ce test.');
    expect(lou.focus).toBe('Créateur de quêtes du quotidien');
    expect(lou.bio).toBe(hosts.find((host) => host.slug === 'lou')?.bio);
    const paragraphs = lou.bio.split('\n\n');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toContain('Passionné par les jeux vidéo et les nouvelles technologies');
    expect(paragraphs[1]).toContain('Héros de la classe, Okodukai ou Not My Fault');
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [], hosts }));
    const article = html.slice(html.indexOf('<h3>Lou</h3>'), html.indexOf('<h3>Loïc</h3>'));
    expect(article).toMatch(/<p[^>]*>Passionné par les jeux vidéo/);
    expect(article).toMatch(/<p[^>]*>À travers des projets comme Héros de la classe/);
    expect(article).not.toContain('Lou construit des applications');
  });
  it('présente trois titres humoristiques et des biographies de longueur comparable', () => {
    const team = homeProfiles(publicHosts());
    expect(team.map((host) => host.focus)).toEqual([
      'Créateur de quêtes du quotidien',
      'Inventeur, même sans Wi-Fi',
      "Chef d'orchestre des agents",
    ]);
    expect(team.every((host) => host.bio.split('\n\n').length === 2)).toBe(true);
    const lengths = team.map((host) => host.bio.length);
    expect(Math.max(...lengths) / Math.min(...lengths)).toBeLessThan(1.1);
  });
  it('reste utilisable sans épisode et ne présente pas un replay fictif', () => {
    const html = renderToStaticMarkup(createElement(DiscoveryHome, { episodes: [] }));
    expect(html).toContain('href="/podcast"');
    expect(html).toContain('Découvrir l&#x27;émission');
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
    expect([...html.matchAll(/<article\b/g)]).toHaveLength(1);
    expect(html).not.toContain('href="/episodes/2"');
    expect(html).not.toContain('href="/episodes/3"');
  });
});

describe('mouvement du plateau', () => {
  it('borne la caméra avant et après la scène et ignore une géométrie invalide', () => {
    expect(stageMotion(200, 600).progress).toBe(0);
    expect(stageMotion(-900, 600)).toMatchObject({ progress: 1, scale: 1.12 });
    for (const [top, travel] of [
      [NaN, 600],
      [-20, 0],
      [-20, Infinity],
      [-20, -1],
    ] as const)
      expect(stageMotion(top, travel).progress).toBe(0);
  });
  it('reconstruit le même cadrage au retour sans dépendre de la vitesse de scroll', () => {
    const outbound = stageMotion(-300, 600);
    stageMotion(-600, 600);
    expect(stageMotion(-300, 600)).toEqual(outbound);
    expect(outbound).toMatchObject({ progress: 0.5, scale: 1.06, titleOpacity: 0.675 });
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
