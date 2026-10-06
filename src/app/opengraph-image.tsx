import { OG_SIZE, OG_TYPE, siteCard } from '@/lib/og';
import { siteConfig } from '@/config/site';

export const alt = `${siteConfig.name} : ${siteConfig.tagline}`;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return siteCard();
}
