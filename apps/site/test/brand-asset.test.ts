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
