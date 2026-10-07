import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import siteSettings from '../content/site.json';
import { canonicalSiteUrl } from '../src/config/site.ts';
import { siteSettingsSchema } from '../src/domain/schema.ts';

describe('réglages publics du site', () => {
  it('affiche les trois membres confirmés et uniquement les liens connus', () => {
    const site = siteSettingsSchema.parse(siteSettings);
    expect(site.team.map(({ name }) => name)).toEqual(['Lou', 'Nicolas', 'Loïc']);
    expect(site.team[0]?.socials).toEqual({
      github: 'https://github.com/loukan42',
      linkedin: 'https://linkedin.com/louhusson',
      x: 'https://x.com/loukan42',
    });
    expect(site.team[1]?.socials).toEqual({});
    expect(site.team[2]?.socials).toEqual({});
  });

  it('refuse les liens non sécurisés dans les cartes de l’équipe', () => {
    expect(
      siteSettingsSchema.safeParse({
        ...siteSettings,
        team: [{ name: 'Lou', socials: { github: 'http://github.com/loukan42' } }],
      }).success,
    ).toBe(false);
  });

  it('garde la compatibilité avec les anciens réglages sans cartes d’équipe', () => {
    const previousSettings: Record<string, unknown> = { ...siteSettings };
    delete previousSettings['team'];
    expect(siteSettingsSchema.parse(previousSettings).team).toEqual([]);
  });

  it('emploie le domaine de production pour les URL canoniques Vercel', () => {
    expect(canonicalSiteUrl(undefined, 'sandbox-podcast.example.vercel.app')).toBe(
      'https://sandbox-podcast.example.vercel.app',
    );
    expect(canonicalSiteUrl('https://sandbox.example', 'preview.example.vercel.app')).toBe(
      'https://sandbox.example',
    );
    expect(canonicalSiteUrl()).toBe('http://localhost:3000');
  });

  it('ne rend plus de bandeau de démonstration dans la structure publique', () => {
    const shell = readFileSync(join(process.cwd(), 'src/components/shell.tsx'), 'utf8');
    const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
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
