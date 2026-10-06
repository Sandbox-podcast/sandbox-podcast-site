import { siteConfig } from '@/config/site';
import { plainText } from '@/domain/markup';
import { feed } from '@/lib/graph';
import { absoluteUrl } from '@/lib/seo';
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';

export const revalidate = 3600;

const xml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Flux RSS des épisodes et des articles. Le contenu est échappé : aucun balisage ne passe. */
export async function GET(): Promise<Response> {
  await preparePublishedEditorialContent();
  const items = feed()
    .slice(0, 30)
    .map((item) => {
      const isEpisode = item.type === 'episode';
      const title = isEpisode
        ? `Épisode ${String(item.episode.number)} : ${item.episode.title}`
        : item.story.title;
      const path = isEpisode
        ? `/episodes/${String(item.episode.number)}`
        : `/stories/${item.story.slug}`;
      const description = isEpisode ? item.episode.dek : plainText(item.story.dek);
      return `<item><title>${xml(title)}</title><link>${xml(absoluteUrl(path))}</link><guid isPermaLink="true">${xml(absoluteUrl(path))}</guid><pubDate>${new Date(item.at).toUTCString()}</pubDate><description>${xml(description)}</description></item>`;
    })
    .join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(siteConfig.name)}</title><link>${xml(siteConfig.url)}</link><description>${xml(siteConfig.description)}</description><language>${siteConfig.language}</language>${items}</channel></rss>`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
