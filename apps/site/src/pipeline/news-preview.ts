import { z } from 'zod';
import { readLimitedBody } from '../lib/limited-body.ts';
import {
  newsItemSchema,
  uniqueNews,
  type NewsFeed,
  type NewsItem,
} from '../domain/news-preview.ts';

export const NEWS_PREVIEW_SOURCES = [
  { name: 'Next.js', repository: 'vercel/next.js', category: 'development' },
  { name: 'Vite', repository: 'vitejs/vite', category: 'development' },
  { name: 'Visual Studio Code', repository: 'microsoft/vscode', category: 'development' },
  { name: 'Claude Code', repository: 'anthropics/claude-code', category: 'agents' },
  { name: 'Codex', repository: 'openai/codex', category: 'agents' },
  { name: 'Transformers', repository: 'huggingface/transformers', category: 'models' },
  { name: 'Ollama', repository: 'ollama/ollama', category: 'open-source' },
  { name: 'LangChain', repository: 'langchain-ai/langchain', category: 'open-source' },
] as const;
const releasesSchema = z.array(
  z.object({
    id: z.number().int(),
    tag_name: z.string().min(1).max(100),
    html_url: z.url(),
    published_at: z.iso.datetime().nullable(),
    draft: z.boolean(),
    prerelease: z.boolean(),
  }),
);

/** Collecte bornée de sources primaires, sans jeton, ni modèle, ni écriture en base. */
export async function collectNewsPreview(
  previous: NewsFeed,
  transport: typeof fetch = fetch,
  now = new Date(),
): Promise<NewsFeed> {
  const results = await Promise.allSettled(
    NEWS_PREVIEW_SOURCES.map(async (source) => {
      const response = await transport(
        `https://api.github.com/repos/${source.repository}/releases?per_page=6`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'SANDBOX-News-Local',
            'X-GitHub-Api-Version': '2026-03-10',
          },
          redirect: 'error',
          cache: 'no-store',
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
      const body = await readLimitedBody(response.body, 2_000_000);
      if (!body) throw new Error('Réponse GitHub absente ou trop grande.');
      return releasesSchema
        .parse(JSON.parse(body.toString('utf8')) as unknown)
        .filter(
          (release) =>
            !release.draft &&
            release.published_at &&
            Date.parse(release.published_at) <= now.getTime(),
        )
        .slice(0, 4)
        .map((release) => {
          const item = newsItemSchema.parse({
            id: `${source.repository}:${release.id}`,
            project: source.name,
            repository: source.repository,
            version: release.tag_name,
            url: release.html_url,
            publishedAt: release.published_at,
            category: source.category,
            prerelease: release.prerelease,
          });
          if (!new URL(item.url).pathname.startsWith(`/${source.repository}/releases/tag/`))
            throw new Error('Source de publication incohérente.');
          return item;
        });
    }),
  );
  const items: NewsItem[] = [...previous.items];
  const sources = results.map((result, index) => {
    if (result.status === 'fulfilled') items.push(...result.value);
    return {
      name: NEWS_PREVIEW_SOURCES[index]?.name ?? 'GitHub',
      ok: result.status === 'fulfilled',
    };
  });
  return { checkedAt: now.toISOString(), sources, items: uniqueNews(items).slice(0, 200) };
}
