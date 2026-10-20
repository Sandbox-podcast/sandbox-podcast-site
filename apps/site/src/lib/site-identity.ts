import { siteConfig } from '@/config/site';
import { absoluteUrl } from './seo';

/** Profils déjà affichés dans le pied de page public. */
export function publicSiteProfiles(): string[] {
  return [
    siteConfig.platforms.youtube,
    siteConfig.platforms.spotify,
    'https://www.linkedin.com/company/sandbox-podcast-fr/',
    'https://x.com/SandboxTalkShow',
    'https://www.tiktok.com/@sandbox.talkshow',
    'https://www.instagram.com/Sandbox.TalkShow/',
  ];
}

/** Même identité institutionnelle dans chaque langue ; le texte du site reste localisé. */
export function siteIdentityLd(description: string, locale: string): Record<string, unknown>[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': absoluteUrl('/#website'),
      name: siteConfig.name,
      url: absoluteUrl('/'),
      description,
      inLanguage: locale,
      publisher: { '@id': absoluteUrl('/#organization') },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': absoluteUrl('/#organization'),
      name: siteConfig.name,
      url: absoluteUrl('/'),
      logo: absoluteUrl('/sandbox-logo.png'),
      sameAs: publicSiteProfiles(),
    },
  ];
}
