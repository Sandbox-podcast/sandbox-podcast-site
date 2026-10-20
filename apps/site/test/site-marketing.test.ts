import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import siteSettings from '../content/site.json';
import { resolvePublishedSiteSettings } from '../src/domain/site-marketing';
import { setSiteSettingsOverride, siteConfig } from '../src/config/site';
import { siteSettingsSchema } from '../src/domain/schema';
import { legacySiteSettings } from './fixtures/site-marketing';
import { StudioLanding } from '../src/components/studio-landing';

afterEach(() => {
  setSiteSettingsOverride(undefined);
});

describe('compatibilité des textes de marque déjà publiés', () => {
  it('actualise les anciens libellés connus en conservant le nom, les liens et le stockage source', () => {
    const input = Object.freeze({
      ...legacySiteSettings,
      platforms: Object.freeze({ ...legacySiteSettings.platforms }),
    });
    const before = JSON.stringify(input);
    const result = resolvePublishedSiteSettings(input, siteSettingsSchema.parse(siteSettings));
    expect(result.description).toBe(siteSettings.description);
    expect(result.heroTitle).toBe(siteSettings.heroTitle);
    expect(result.aboutIntro).toBe(siteSettings.aboutIntro);
    expect(result.name).toBe(input.name);
    expect(result.platforms).toEqual(input.platforms);
    expect(result.wordmark).toEqual(input.wordmark);
    expect(result).not.toBe(input);
    expect(JSON.stringify(input)).toBe(before);
  });
  it('ne remplace jamais un texte personnalisé, même dans un enregistrement partiellement ancien', () => {
    const input = {
      ...legacySiteSettings,
      heroTitle: 'Un titre choisi pour une émission spéciale.',
      aboutIntro: 'Une introduction écrite par le propriétaire.',
      description: 'Une description spécifique.',
      platforms: {
        ...legacySiteSettings.platforms,
        youtube: 'https://www.youtube.com/@CustomChannel',
      },
    };
    const result = resolvePublishedSiteSettings(input, siteSettingsSchema.parse(siteSettings));
    expect(result.heroTitle).toBe(input.heroTitle);
    expect(result.aboutIntro).toBe(input.aboutIntro);
    expect(result.description).toBe(input.description);
    expect(result.tagline).toBe(siteSettings.tagline);
    expect(result.aboutTitle).toBe(siteSettings.aboutTitle);
    expect(result.platforms.youtube).toBe(input.platforms.youtube);
  });
  it.each([
    ` ${legacySiteSettings.description}`,
    `${legacySiteSettings.description} `,
    legacySiteSettings.description.toUpperCase(),
    legacySiteSettings.description.replace('Talk Show', 'talkshow'),
  ])('garde intact un libellé différent de la valeur exacte : %s', (description) => {
    expect(
      resolvePublishedSiteSettings(
        { ...legacySiteSettings, description },
        siteSettingsSchema.parse(siteSettings),
      ).description,
    ).toBe(description);
  });
  it('actualise aussi les variantes exactes relevées dans la publication publique', () => {
    const result = resolvePublishedSiteSettings(
      {
        ...legacySiteSettings,
        description:
          'Explorez les podcasts vidéo Sandbox sur l’IA, le développement et l’open source. Retrouvez les sources de chaque épisode et nos classements tech hebdomadaires.',
        aboutIntro: 'Lou, Nicolas et Loïc. Les liens de l’équipe Sandbox, réunis ici.',
      },
      siteSettingsSchema.parse(siteSettings),
    );
    expect(result.description).toBe(siteSettings.description);
    expect(result.aboutIntro).toBe(siteSettings.aboutIntro);
  });
  it('reprend les nouveaux textes À propos lorsque les champs manquaient dans une ancienne publication', () => {
    const previous = siteSettingsSchema.parse({
      ...legacySiteSettings,
      aboutEyebrow: undefined,
      aboutTitle: undefined,
      aboutIntro: undefined,
    });
    const result = resolvePublishedSiteSettings(previous, siteSettingsSchema.parse(siteSettings));
    expect(result.aboutEyebrow).toBe(siteSettings.aboutEyebrow);
    expect(result.aboutTitle).toBe(siteSettings.aboutTitle);
    expect(result.aboutIntro).toBe(siteSettings.aboutIntro);
  });
  it('applique cette compatibilité au point d’entrée réellement utilisé par les publications admin', () => {
    setSiteSettingsOverride(legacySiteSettings);
    expect(siteConfig.description).toBe(siteSettings.description);
    expect(siteConfig.heroTitle).toBe(siteSettings.heroTitle);
    expect(siteConfig.aboutIntro).toBe(siteSettings.aboutIntro);
    setSiteSettingsOverride({ ...legacySiteSettings, heroTitle: 'Titre personnalisé' });
    expect(siteConfig.heroTitle).toBe('Titre personnalisé');
  });
  it('rend intégralement un titre et une introduction personnalisés dans le plateau', () => {
    setSiteSettingsOverride({
      ...legacySiteSettings,
      heroTitle: 'Un titre personnel pour le prochain direct.',
      heroDek: 'Une introduction choisie pour ce rendez-vous.',
    });
    const html = renderToStaticMarkup(
      createElement(StudioLanding, {
        episodes: [],
        newsAvailable: false,
        videoClubEnabled: false,
      }),
    );
    expect(html).toContain('Un titre personnel pour le prochain direct.');
    expect(html).toContain('Une introduction choisie pour ce rendez-vous.');
    expect(html).not.toContain('pour ceux qui construisent.');
  });
});
