import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import siteSettings from '../content/site.json';
import {
  canonicalSiteUrl,
  youtubeChannelUrl,
  spotifyChannelUrl,
  mediaDisplayName,
} from '../src/config/site.ts';
import { siteSettingsSchema } from '../src/domain/schema.ts';

describe('réglages publics du site', () => {
  it('utilise Sandbox TalkShow même avec les anciens noms publiés', () => {
    expect(siteSettings.name).toBe('Sandbox TalkShow');
    for (const previous of ['Sandbox', 'Sandbox Podcast', ' SANDBOX PODCAST '])
      expect(mediaDisplayName(previous)).toBe('Sandbox TalkShow');
    expect(mediaDisplayName('Sandbox TalkShow')).toBe('Sandbox TalkShow');
    expect(mediaDisplayName('Autre émission')).toBe('Autre émission');
  });
  it('corrige le lien Spotify générique sans remplacer une destination éditoriale précise', () => {
    for (const generic of ['https://open.spotify.com', 'https://open.spotify.com/?si=old'])
      expect(spotifyChannelUrl(generic)).toBe(siteSettings.platforms.spotify);
    for (const configured of [
      siteSettings.platforms.spotify,
      'https://open.spotify.com/show/another-show',
      'https://open.spotify.com/episode/specific-episode',
      'https://example.com/',
    ])
      expect(spotifyChannelUrl(configured)).toBe(configured);
  });
  it('ignore les anciennes cartes de l’équipe dans les réglages', () => {
    const settings = siteSettingsSchema.parse({
      ...siteSettings,
      team: [{ name: 'Loïc', socials: { github: 'https://github.com/azerothl' } }],
    });
    expect(Object.hasOwn(settings, 'team')).toBe(false);
  });

  it('garde la compatibilité avec les anciens réglages sans texte À propos', () => {
    const previousSettings: Record<string, unknown> = { ...siteSettings };
    delete previousSettings['aboutEyebrow'];
    delete previousSettings['aboutTitle'];
    delete previousSettings['aboutIntro'];
    const site = siteSettingsSchema.parse(previousSettings);
    expect(site.aboutEyebrow).toBe('L’équipe');
    expect(site.aboutTitle).toBe("L'équipe Sandbox.");
    expect(site.aboutIntro).toBe(
      'Lou, Nicolas et Loïc animent Sandbox. Retrouve leurs profils et leurs projets.',
    );
  });

  it('emploie le domaine public pour les URL canoniques Vercel', () => {
    expect(canonicalSiteUrl(undefined, 'sandbox-podcast.example.vercel.app')).toBe(
      'https://www.sandboxpodcast.fr',
    );
    expect(canonicalSiteUrl('https://sandbox.example', 'preview.example.vercel.app')).toBe(
      'https://sandbox.example',
    );
    expect(canonicalSiteUrl('https://sandbox-podcast.vercel.app')).toBe(
      'https://www.sandboxpodcast.fr',
    );
    expect(canonicalSiteUrl()).toBe('http://localhost:3000');
  });

  it('remplace une ancienne URL YouTube générique par la chaîne officielle', () => {
    expect(youtubeChannelUrl('https://www.youtube.com/')).toBe(
      'https://www.youtube.com/@SandboxFR',
    );
    expect(youtubeChannelUrl('https://www.youtube.com/@SandboxFR')).toBe(
      'https://www.youtube.com/@SandboxFR',
    );
  });

  it('ne rend plus de bandeau de démonstration dans la structure publique', () => {
    const shell = readFileSync(join(process.cwd(), 'src/components/shell.tsx'), 'utf8');
    const layout = readFileSync(join(process.cwd(), 'src/app/(fr)/layout.tsx'), 'utf8');
    expect(`${shell}\n${layout}`).not.toMatch(
      /donn[ée]es de d[ée]monstration|mode d[ée]monstration/i,
    );
  });

  it('place le choix de semaine dans chaque classement plutôt que dans le header général', () => {
    const shell = readFileSync(join(process.cwd(), 'src/components/shell.tsx'), 'utf8');
    const masthead = shell.split('export function Footer')[0];
    const chart = readFileSync(join(process.cwd(), 'src/components/chart-screen.tsx'), 'utf8');
    expect(masthead).not.toContain('/charts/history');
    expect(chart).toContain('<ChartWeekSelect');
  });

  it('ne propose plus les onglets séparés pour fiches, avis et méthodes dans l’admin', () => {
    const admin = readFileSync(join(process.cwd(), 'src/components/admin-console.tsx'), 'utf8');
    const navigation = admin.split('const collections:')[1]?.split('const storyTypes:')[0] ?? '';
    expect(navigation).toContain("label: 'Classements'");
    expect(navigation).not.toMatch(/label: '(Projets et modèles|Avis|Méthodes)'/);
  });
});
