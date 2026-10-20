import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { VHS_PROJECT_ARTWORK } from '../src/domain/vhs-project-artwork';
import { personalProjects } from '../src/lib/personal-projects';
import { SandboxRoomContent } from '../src/components/sandbox-room-content';
import { VideoClub } from '../src/components/video-club';

describe('jaquettes illustrées du vidéoclub', () => {
  it('couvre chaque projet publié avec une illustration distincte et exclut MindOdyssey', () => {
    expect(Object.keys(VHS_PROJECT_ARTWORK).sort()).toEqual(
      personalProjects.map(({ slug }) => slug).sort(),
    );
    expect(new Set(Object.values(VHS_PROJECT_ARTWORK)).size).toBe(personalProjects.length);
    expect(
      personalProjects.filter(({ creator }) => creator === 'lou').map(({ slug }) => slug),
    ).toEqual(['not-my-fault', 'okodukai', 'heros-de-la-classe', 'politiquizz']);
  });

  it('livre les 33 images verticales en WebP dans un budget de 100 Ko chacune', async () => {
    let totalBytes = 0;
    for (const src of Object.values(VHS_PROJECT_ARTWORK)) {
      const path = new URL(`../public${src}`, import.meta.url);
      const metadata = await sharp(fileURLToPath(path)).metadata();
      expect(metadata.format).toBe('webp');
      expect([metadata.width, metadata.height]).toEqual([480, 720]);
      const { size } = await stat(path);
      expect(size).toBeLessThan(100_000);
      totalBytes += size;
    }
    expect(totalBytes).toBeLessThan(2_500_000);
  });

  it('affiche les illustrations et les vrais noms dans les deux vidéoclubs', () => {
    const projects = personalProjects.filter(({ creator }) => creator === 'lou');
    for (const html of [
      renderToStaticMarkup(
        createElement(SandboxRoomContent, { roomId: 'projects', projects, episodes: [] }),
      ),
      renderToStaticMarkup(createElement(VideoClub, { projects })),
    ]) {
      for (const project of projects) {
        expect(html).toContain(encodeURIComponent(VHS_PROJECT_ARTWORK[project.slug] ?? ''));
        expect(html).toContain(project.name);
        expect(html).not.toContain(encodeURIComponent(project.cover?.src ?? 'unused-original'));
      }
      expect(html).not.toContain('MindOdyssey');
    }
  });
});
