import siteSettingsSource from '../../content/site.json' with { type: 'json' };
import { siteSettingsSchema, type SiteSettings } from '../domain/schema.ts';

export type DataMode = 'mock' | 'live';

const dataMode: DataMode = process.env['SITE_DATA_MODE'] === 'live' ? 'live' : 'mock';
const PUBLIC_SITE_URL = 'https://www.sandboxpodcast.fr';
const OFFICIAL_YOUTUBE_CHANNEL = 'https://www.youtube.com/@SandboxFR';
const defaultSiteSettings = siteSettingsSchema.parse(siteSettingsSource);
let activeSiteSettings: SiteSettings = defaultSiteSettings;

export function setSiteSettingsOverride(settings: SiteSettings | undefined): void {
  activeSiteSettings = settings ?? defaultSiteSettings;
}

/** Le domaine public reste canonique, y compris quand Vercel fournit son sous-domaine par défaut. */
export function canonicalSiteUrl(explicit?: string, vercelProductionDomain?: string): string {
  if (explicit && URL.canParse(explicit)) {
    const url = new URL(explicit);
    if (!url.hostname.endsWith('.vercel.app')) return url.origin;
  }
  if (vercelProductionDomain || explicit) return PUBLIC_SITE_URL;
  return 'http://localhost:3000';
}

/** Une URL YouTube générique issue d'anciens réglages ne doit pas remplacer la chaîne du site. */
export function youtubeChannelUrl(configured: string): string {
  const url = new URL(configured);
  return /^(www\.|m\.)?youtube\.com$/i.test(url.hostname) && url.pathname === '/'
    ? OFFICIAL_YOUTUBE_CHANNEL
    : configured;
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
  get aboutEyebrow(): string {
    return activeSiteSettings.aboutEyebrow;
  },
  get aboutTitle(): string {
    return activeSiteSettings.aboutTitle;
  },
  get aboutIntro(): string {
    return activeSiteSettings.aboutIntro;
  },
  get platforms(): SiteSettings['platforms'] {
    return {
      ...activeSiteSettings.platforms,
      youtube: youtubeChannelUrl(activeSiteSettings.platforms.youtube),
    };
  },
  url: canonicalSiteUrl(process.env['SITE_URL'], process.env['VERCEL_PROJECT_PRODUCTION_URL']),
  locale: 'fr-FR',
  language: 'fr',
  /** Les classements restent explicitement présentés comme des données de démonstration. */
  dataMode,
  /** Connexion affichée uniquement dans /admin ; authentification toujours requise. */
  adminEnabled: true,
} as const;

export const isMock = siteConfig.dataMode === 'mock';
