import { OG_SIZE, OG_TYPE, siteCard } from '@/lib/og';
import { SITE_SHARE_IMAGE_ALT } from '@/lib/seo';

export const alt = SITE_SHARE_IMAGE_ALT;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return siteCard();
}
