import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // Le noindex des pages non publiables doit rester lisible par les robots.
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/admin'] },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
