import siteSettingsSource from '../../content/site.json';
import { siteSettingsSchema, type SiteSettings } from '../domain/schema.ts';

export type DataMode = 'mock' | 'live';

const dataMode: DataMode = process.env['SITE_DATA_MODE'] === 'live' ? 'live' : 'mock';
const defaultSiteSettings = siteSettingsSchema.parse(siteSettingsSource);
let activeSiteSettings: SiteSettings = defaultSiteSettings;

export function setSiteSettingsOverride(settings: SiteSettings | undefined): void {
  activeSiteSettings = settings ?? defaultSiteSettings;
}

/** Le contenu éditorial de la marque peut être rechargé depuis le stockage privé en ISR. */
export const siteConfig = {
  get name(): string {
    return activeSiteSettings.name;
  },
  get wordmark(): SiteSettings['wordmark'] {
    return activeSiteSettings.wordmark;
  },
  get tagline(): string {
    return activeSiteSettings.tagline;
  },
  get strapline(): string {
    return activeSiteSettings.strapline;
  },
  get description(): string {
    return activeSiteSettings.description;
  },
  get heroEyebrow(): string {
    return activeSiteSettings.heroEyebrow;
  },
  get heroTitle(): string {
    return activeSiteSettings.heroTitle;
  },
  get heroDek(): string {
    return activeSiteSettings.heroDek;
  },
  get platforms(): SiteSettings['platforms'] {
    return activeSiteSettings.platforms;
  },
  url: process.env['SITE_URL'] ?? 'http://localhost:3000',
  locale: 'fr-FR',
  language: 'fr',
  /** Les classements restent explicitement présentés comme des données de démonstration. */
  dataMode,
  /** Connexion affichée uniquement dans /admin ; authentification requise en production. */
  adminEnabled: true,
} as const;

export const isMock = siteConfig.dataMode === 'mock';
