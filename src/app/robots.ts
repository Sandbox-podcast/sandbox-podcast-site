import type { MetadataRoute } from 'next';
import { isMock } from '@/config/site';
import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  if (isMock) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin'] },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
