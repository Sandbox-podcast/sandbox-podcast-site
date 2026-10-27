import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('logotype du site', () => {
  it('conserve la source de la version publiée avec ses dimensions intrinsèques', async () => {
    const [source, published] = await Promise.all([
      readFile(new URL('../assets/brand/sandbox-logo-source-v2.png', import.meta.url)),
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

    expect(site.platforms.youtube).toBe('https://www.youtube.com/@SandboxFR?sub_confirmation=1');
  });
});
