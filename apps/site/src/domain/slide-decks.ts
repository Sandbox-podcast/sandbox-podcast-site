import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type SlideDeck = {
  slug: string;
  title: string;
  href: string;
};

const TITLE_RE = /<title[^>]*>([^<]*)<\/title>/i;

export function extractSlideTitle(html: string, fallback: string): string {
  const match = TITLE_RE.exec(html);
  const title = match?.[1]?.replace(/\s+/g, ' ').trim();
  return title && title.length > 0 ? title : fallback;
}

export function listSlideDecks(slidesRoot: string): SlideDeck[] {
  if (!existsSync(slidesRoot)) return [];

  return readdirSync(slidesRoot)
    .filter((name) => {
      const dir = join(slidesRoot, name);
      return statSync(dir).isDirectory() && existsSync(join(dir, 'index.html'));
    })
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((slug) => {
      const html = readFileSync(join(slidesRoot, slug, 'index.html'), 'utf8');
      return {
        slug,
        title: extractSlideTitle(html, slug),
        href: `/${slug}/`,
      };
    });
}

export function slidesPublicRoot(siteRoot: string): string {
  return join(siteRoot, 'public', 'slides');
}
