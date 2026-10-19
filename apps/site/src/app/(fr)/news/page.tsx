import { notFound } from 'next/navigation';
import { NewsScreen } from '@/components/news-screen';
import { absoluteUrl } from '@/lib/seo';
import { publicNewsPageMetadata } from '@/lib/news-metadata';
import { readNewsPageData } from '@/lib/news-page-data';

export const dynamic = 'force-dynamic';
export const generateMetadata = () => publicNewsPageMetadata();
export default async function NewsPage({ locale = 'fr-FR' }: { locale?: string }) {
  const data = await readNewsPageData();
  if (data.status === 'disabled') notFound();
  return (
    <NewsScreen
      initialFeed={
        data.status === 'unavailable' ? { checkedAt: null, sources: [], items: [] } : data.feed
      }
      isPreview={data.status === 'preview'}
      isUnavailable={data.status === 'unavailable'}
      locale={locale}
      canonicalUrl={absoluteUrl(locale === 'fr-FR' ? '/news' : `/${locale.toLowerCase()}/news`)}
    />
  );
}
