import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AboutPage from '../src/app/(fr)/about/page';
import { hostSchema } from '../src/domain/schema';
import { loadContent, setEditorialOverride } from '../src/lib/load';

vi.mock('../src/lib/admin-persistence', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/admin-persistence')>();
  return { ...actual, preparePublishedEditorialContent: vi.fn(async () => undefined) };
});

afterEach(() => {
  setEditorialOverride(undefined);
});

describe('photos des animateurs', () => {
  it.each(['lou', 'loic'])(
    'associe %s à un portrait PNG présent dans les fichiers publics',
    (slug) => {
      const host = loadContent().hosts.find((item) => item.slug === slug);
      expect(host?.photo).toBe(`/team/${slug}.png`);
      const file = join(process.cwd(), 'public', host?.photo ?? '');
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file).subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
    },
  );

  it('restaure le portrait, le pseudo et les liens de Nicolas depuis la production', () => {
    const nicolas = loadContent().hosts.find((host) => host.slug === 'nicolas');
    expect(nicolas).toMatchObject({
      aka: 'MarlburroW',
      photo: '/team/nicolas-prod-2026-10-15.webp',
      socials: {
        github: 'https://github.com/MarlBurroW',
        linkedin: 'https://www.linkedin.com/in/nicolas-varrot-b6b05857/',
        x: 'https://x.com/MarlburroW38',
      },
    });
    const photo = readFileSync(join(process.cwd(), 'public/team/nicolas-prod-2026-10-15.webp'));
    expect(photo.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(photo.subarray(8, 12).toString('ascii')).toBe('WEBP');
    expect(createHash('sha256').update(photo).digest('hex')).toBe(
      'aea75f5d4a0c46079e5464a94bc5338a19a720c61063001e23e0e5e6b06b7fe7',
    );
    expect(loadContent().hosts.find((host) => host.slug === 'loic')?.socials.github).toBe(
      'https://github.com/azerothl',
    );
  });

  it('accepte les anciens profils sans photo et refuse les chemins externes ou traversants', () => {
    const profile = {
      slug: 'lea',
      name: 'Léa',
      handle: '@lea',
      role: 'Animatrice',
      bio: 'Présente le podcast.',
    };
    expect(hostSchema.parse(profile).photo).toBeUndefined();
    expect(hostSchema.parse({ ...profile, aka: 'lea' }).aka).toBe('lea');
    expect(hostSchema.parse({ ...profile, photo: '/team/lea.webp' }).photo).toBe('/team/lea.webp');
    for (const photo of [
      'https://example.org/lea.png',
      '//example.org/lea.png',
      '/team/../lea.png',
      '/team/lea.svg',
    ]) {
      expect(hostSchema.safeParse({ ...profile, photo }).success).toBe(false);
    }
  });

  it('complète les anciens profils publiés avec la photo Git en conservant leurs autres champs', () => {
    const content = loadContent();
    const hosts = content.hosts.map((host) => {
      const legacy = { ...host };
      delete legacy.photo;
      delete legacy.aka;
      return host.slug === 'lou' ? { ...legacy, handle: '@lou-publie' } : legacy;
    });
    setEditorialOverride({ ...content, hosts });
    expect(loadContent().hosts.find((host) => host.slug === 'lou')).toMatchObject({
      handle: '@lou-publie',
      photo: '/team/lou.png',
      aka: 'loukan42',
    });
    expect(loadContent().hosts.find((host) => host.slug === 'loic')?.photo).toBe('/team/loic.png');
    setEditorialOverride({
      ...content,
      hosts: hosts.map((host) =>
        host.slug === 'lou' ? { ...host, photo: '/team/lou-autre.webp' } : host,
      ),
    });
    expect(loadContent().hosts.find((host) => host.slug === 'lou')?.photo).toBe(
      '/team/lou-autre.webp',
    );
  });

  it('affiche les trois portraits, les pseudos et les liens publiés sur À propos', async () => {
    const html = renderToStaticMarkup(createElement('div', null, await AboutPage()));
    expect(html.match(/class="about-social-photo"/g)).toHaveLength(3);
    expect(html.match(/class="about-social-portrait" aria-hidden="true"/g)).toHaveLength(3);
    expect(html.match(/data-nimg="fill"/g)).toHaveLength(3);
    expect(html).toContain(encodeURIComponent('/team/lou.png'));
    expect(html).toContain(encodeURIComponent('/team/nicolas-prod-2026-10-15.webp'));
    expect(html).toContain(encodeURIComponent('/team/loic.png'));
    expect(html).not.toContain('class="about-social-monogram"');
    expect(html).toContain('MarlburroW');
    expect(html.match(/class="about-social-aka label"/g)).toHaveLength(2);
    expect(html).toContain('https://github.com/loukan42');
    expect(html).toContain('https://github.com/MarlBurroW');
    expect(html).toContain('https://github.com/azerothl');
    expect(html).not.toContain('Équipe Sandbox');
  });

  it('remplace uniquement l’ancienne photo de Lou dans un profil déjà publié', () => {
    const content = loadContent();
    setEditorialOverride({
      ...content,
      hosts: content.hosts.map((host) =>
        host.slug === 'lou' ? { ...host, photo: '/team/lou.jpg' } : host,
      ),
    });
    expect(loadContent().hosts.find((host) => host.slug === 'lou')?.photo).toBe('/team/lou.png');
  });

  it('garde une initiale pour un nouveau profil sans photo', async () => {
    const content = loadContent();
    const host = hostSchema.parse({
      slug: 'lea',
      name: 'Léa',
      handle: '@lea',
      role: 'Animatrice',
      bio: 'Présente le podcast.',
    });
    setEditorialOverride({ ...content, hosts: [...content.hosts, host] });
    const html = renderToStaticMarkup(createElement('div', null, await AboutPage()));
    expect(html.match(/class="about-social-monogram"/g)).toHaveLength(1);
    expect(html.match(/class="about-social-photo"/g)).toHaveLength(3);
  });
});
