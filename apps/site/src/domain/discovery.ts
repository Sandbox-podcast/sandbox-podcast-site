export function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function matchesSearch(query: string, values: readonly (string | undefined)[]): boolean {
  const needle = normalizeSearch(query);
  return (
    needle.length === 0 || values.some((value) => value && normalizeSearch(value).includes(needle))
  );
}

export type EpisodeSort = 'newest' | 'oldest' | 'shortest';
export interface DiscoverableEpisode {
  number: number;
  publishedAt: string;
  durationSec: number;
  topics: readonly string[];
  searchable: readonly string[];
}

export function discoverEpisodes<T extends DiscoverableEpisode>(
  entries: readonly T[],
  {
    query = '',
    topic = 'all',
    sort = 'newest',
  }: { query?: string; topic?: string; sort?: EpisodeSort },
): T[] {
  return entries
    .filter(
      (entry) =>
        (topic === 'all' || entry.topics.includes(topic)) && matchesSearch(query, entry.searchable),
    )
    .sort((a, b) => {
      if (sort === 'shortest')
        return a.durationSec - b.durationSec || b.publishedAt.localeCompare(a.publishedAt);
      return sort === 'oldest'
        ? a.publishedAt.localeCompare(b.publishedAt)
        : b.publishedAt.localeCompare(a.publishedAt);
    });
}

export function episodeResourcePath(number: number, index: number): string {
  return `/episodes/${String(number)}#resource-${String(index)}`;
}
