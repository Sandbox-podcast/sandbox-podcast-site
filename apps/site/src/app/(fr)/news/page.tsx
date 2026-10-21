import { NewsScreen } from '@/components/news-screen';
import { absoluteUrl } from '@/lib/seo';
import { publicNewsPageMetadata } from '@/lib/news-metadata';
import { readNewsPageData } from '@/lib/news-page-data';

export const dynamic = 'force-dynamic';
export const generateMetadata = () => publicNewsPageMetadata();
export default async function NewsPage({ locale = 'fr-FR' }: { locale?: string }) {
  const data = await readNewsPageData(locale);
  if (data.status !== 'preview' && (data.status !== 'published' || data.feed.items.length === 0))
    notFound();
  return (
    <NewsScreen
      initialFeed={data.feed}
      isPreview={data.status === 'preview'}
      locale={locale}
      canonicalUrl={absoluteUrl(locale === 'fr-FR' ? '/news' : `/${locale.toLowerCase()}/news`)}
    />
  );
}
import { notFound } from 'next/navigation';
