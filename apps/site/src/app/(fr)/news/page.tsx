import { notFound } from 'next/navigation';
import { NewsScreen } from '@/components/news-screen';
import { newsPreviewEnabled, readNewsPreview } from '@/lib/news-preview-store';
import { absoluteUrl } from '@/lib/seo';
import { newsPageMetadata } from '@/lib/news-metadata';
import { newsPublicEnabled, readPublishedNews } from '@/lib/news-store';

export const dynamic = 'force-dynamic';
export const generateMetadata = () => newsPageMetadata();
export default async function NewsPage({ locale = 'fr-FR' }: { locale?: string }) {
  if (newsPreviewEnabled()) {
    return (
      <NewsScreen
        initialFeed={await readNewsPreview()}
        locale={locale}
        isPreview
        canonicalUrl={absoluteUrl(locale === 'fr-FR' ? '/news' : `/${locale.toLowerCase()}/news`)}
      />
    );
  }
  if (!newsPublicEnabled()) notFound();
  const feed = await readPublishedNews();
  if (!feed.items.length) notFound();
  return (
    <NewsScreen
      initialFeed={feed}
      locale={locale}
      canonicalUrl={absoluteUrl(locale === 'fr-FR' ? '/news' : `/${locale.toLowerCase()}/news`)}
    />
  );
}
