import { OG_SIZE, OG_TYPE, siteCard } from '@/lib/og';
import { siteConfig } from '@/config/site';

export const alt = `${siteConfig.name} : podcasts vidéo sur l’IA, le développement et l’open source`;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return siteCard();
}
