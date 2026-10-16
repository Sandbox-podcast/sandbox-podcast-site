import { createElement } from 'react';
import { access, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VideoClubPage, { metadata } from '../src/app/(fr)/nos-projets/video-club/page';
import { VideoClubDossier } from '../src/components/video-club-dossier';
import {
  VIDEO_CLUB_ROOM_IMAGE,
  VIDEO_CLUB_VHS_CLOSED_IMAGE,
  VIDEO_CLUB_VHS_OPEN_IMAGE,
  videoClubCamera,
  videoClubRoomFit,
  videoClubShelves,
} from '../src/domain/video-club';
import { personalProjects } from '../src/lib/personal-projects';

afterEach(() => vi.unstubAllEnvs());

describe('vidéoclub local', () => {
  it('garde le décor derrière tout le cadre, y compris sur les rayons latéraux', () => {
    for (const [width, height] of [
      [366, 630],
      [1392, 654],
      [1872, 834],
      [812, 198],
    ] as const) {
      for (const creator of [null, 'lou', 'loic', 'nicolas'] as const) {
        const fit = videoClubRoomFit(width, height, creator);
        const camera = videoClubCamera(creator, true);
        const projection = 1200 / (1200 - camera.z);
        expect((-750 + camera.x) * fit * projection).toBeLessThanOrEqual(-width / 2);
        expect((750 + camera.x) * fit * projection).toBeGreaterThanOrEqual(width / 2);
        expect(850 * fit * projection).toBeGreaterThanOrEqual(height);
      }
    }
  });
  it("ouvre davantage le cadrage d'ensemble tout en gardant une marge pour les rayons latéraux", () => {
    expect(videoClubRoomFit(1440, 760)).toBeLessThan(videoClubRoomFit(1440, 760, 'nicolas'));
    expect(videoClubRoomFit(390, 768)).toBe(videoClubRoomFit(390, 768, 'lou'));
  });
  it('range chaque projet une seule fois, sous son vrai créateur, sans modifier le catalogue', () => {
    const snapshot = JSON.stringify(personalProjects);
    const shelves = videoClubShelves(personalProjects);
    const titles = shelves.flatMap((shelf) => shelf.rows.flat());
    expect(titles.map((p) => p.slug).sort()).toEqual(personalProjects.map((p) => p.slug).sort());
    expect(new Set(titles.map((p) => p.slug)).size).toBe(personalProjects.length);
    for (const shelf of shelves) {
      expect(shelf.rows.flat().every((p) => p.creator === shelf.creator)).toBe(true);
      expect(shelf.rows.every((row) => row.length <= 6)).toBe(true);
    }
    expect(JSON.stringify(personalProjects)).toBe(snapshot);
    expect(videoClubShelves([]).flatMap((shelf) => shelf.rows)).toEqual([]);
  });

  it('avance depuis la porte et place les rayons de gauche à droite', () => {
    const door = videoClubCamera(null, false);
    const room = videoClubCamera(null, true);
    expect(room.z).toBeGreaterThan(door.z);
    expect(videoClubCamera('loic', true).z).toBeGreaterThan(room.z);
    expect(videoClubCamera('lou', true).x).toBeGreaterThan(room.x);
    expect(videoClubCamera('nicolas', true).x).toBeLessThan(room.x);
    expect(videoClubCamera('nicolas', true, false).x).toBeLessThan(
      videoClubCamera('nicolas', true).x,
    );
    expect(videoClubCamera(null, false, false).z).toBeLessThan(door.z);
  });

  it('sert un décor local optimisé, sans dépendre du fichier de génération', async () => {
    const asset = new URL(`../public${VIDEO_CLUB_ROOM_IMAGE}`, import.meta.url);
    await expect(access(asset)).resolves.toBeUndefined();
    expect((await stat(asset)).size).toBeLessThan(500_000);
    vi.stubEnv('NODE_ENV', 'development');
    const html = renderToStaticMarkup(await VideoClubPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain(encodeURIComponent(VIDEO_CLUB_ROOM_IMAGE));
    expect(html).not.toContain('generated_images');
  });
  it("sert l'entrée mobile en WebP dans un budget de 200 Ko", async () => {
    const asset = new URL('../public/video-club/entrance-cinematic-v2.webp', import.meta.url);
    expect((await stat(asset)).size).toBeLessThan(200_000);
    expect(await sharp(fileURLToPath(asset)).metadata()).toMatchObject({
      width: 1672,
      height: 941,
      format: 'webp',
    });
  });

  it("expose les titres et les commandes sans charger de lecteur vidéo à l'entrée", async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const html = renderToStaticMarkup(await VideoClubPage({ searchParams: Promise.resolve({}) }));
    for (const project of personalProjects)
      expect(html).toContain(`aria-label="Ramasser la cassette ${project.name}"`);
    expect(html).toContain('Entrer dans le vidéoclub');
    expect(html).toContain('Catalogue classique');
    expect(html).toContain('Se déplacer dans le vidéoclub');
    expect(html).not.toContain('<video');
    expect(html).not.toContain('<iframe');
  });
  it('sert des boîtes VHS photographiques détourées dans le budget prévu', async () => {
    for (const [path, width, height, budget] of [
      [VIDEO_CLUB_VHS_CLOSED_IMAGE, 640, 1051, 100_000],
      [VIDEO_CLUB_VHS_OPEN_IMAGE, 1000, 685, 250_000],
    ] as const) {
      const asset = new URL(`../public${path}`, import.meta.url);
      expect((await stat(asset)).size).toBeLessThan(budget);
      expect(await sharp(fileURLToPath(asset)).metadata()).toMatchObject({
        width,
        height,
        hasAlpha: true,
        format: 'webp',
      });
    }
    vi.stubEnv('NODE_ENV', 'development');
    const html = renderToStaticMarkup(await VideoClubPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain(encodeURIComponent(VIDEO_CLUB_VHS_CLOSED_IMAGE));
    expect(html).not.toContain('cassetteLabel');
  });

  it('entre directement depuis le plateau et permet de revenir au décor', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const html = renderToStaticMarkup(
      await VideoClubPage({ searchParams: Promise.resolve({ from: 'studio' }) }),
    );
    expect(html).toContain('data-entered="true"');
    expect(html).toContain('href="/"');
    expect(html).toContain('Retour au plateau');
    expect(html).not.toContain('Entrer dans le vidéoclub');
    expect(html).not.toContain('<video');
    expect(html).not.toContain('<iframe');
    for (const from of ['other', ['studio']]) {
      const direct = renderToStaticMarkup(
        await VideoClubPage({ searchParams: Promise.resolve({ from }) }),
      );
      expect(direct).toContain('data-entered="false"');
      expect(direct).toContain('Catalogue classique');
    }
  });

  it('reste non indexable et répond 404 hors du serveur de développement', async () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    vi.stubEnv('NODE_ENV', 'production');
    await expect(VideoClubPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404',
    );
    vi.stubEnv('NODE_ENV', 'test');
    await expect(VideoClubPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404',
    );
  });

  it('reprend les informations et sources du catalogue avec les vidéos chargées au clic', () => {
    for (const project of personalProjects) {
      const html = renderToStaticMarkup(createElement(VideoClubDossier, { project }));
      expect(html).toContain(project.name);
      expect(html).toContain(`href="/nos-projets/${project.slug}"`);
      expect(html).toContain(`href="${project.url}"`);
      expect(html).toContain('Sources de cette fiche');
      for (const source of project.sources) expect(html).toContain(`href="${source.url}"`);
      if (project.videos.length) expect(html).toContain('Lire la vidéo');
      expect(html).not.toContain('<video');
    }
  });
});
