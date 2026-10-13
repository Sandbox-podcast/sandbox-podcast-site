import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('logotype du site', () => {
  it('publie la version 2 fournie avec ses dimensions intrinsèques', async () => {
    const [source, published] = await Promise.all([
      readFile(new URL('../../../logov2.png', import.meta.url)),
      readFile(new URL('../public/sandbox-logo.png', import.meta.url)),
    ]);

    expect(published.equals(source)).toBe(true);
    expect(published.readUInt32BE(16)).toBe(2172);
    expect(published.readUInt32BE(20)).toBe(724);
  });
});

describe('identité YouTube Sandbox', () => {
  it('relie le site à la chaîne publique vérifiée', async () => {
    const site = JSON.parse(
      await readFile(new URL('../content/site.json', import.meta.url), 'utf8'),
    ) as { platforms: { youtube: string } };

    expect(site.platforms.youtube).toBe('https://www.youtube.com/@SandboxFR');
  });

  it.each([
    ['channel-banner-v2.png', 2560, 1440, 6 * 1024 * 1024],
    ['channel-avatar-v2.png', 800, 800, 4 * 1024 * 1024],
    ['video-watermark-v2.png', 150, 150, 1024 * 1024],
    ['episode-thumbnail-template-v2.png', 1280, 720, 6 * 1024 * 1024],
  ])(
    'fournit %s aux dimensions et à la taille attendues',
    async (filename, width, height, maxBytes) => {
      const asset = await readFile(new URL(`../../../brand/youtube/${filename}`, import.meta.url));

      expect(asset.subarray(1, 4).toString()).toBe('PNG');
      expect(asset.readUInt32BE(16)).toBe(width);
      expect(asset.readUInt32BE(20)).toBe(height);
      expect(asset.byteLength).toBeLessThan(maxBytes);
    },
  );
});
