export function uniqueSitemapEntries<T extends { url: string }>(entries: readonly T[]): T[] {
  const byUrl = new Map<string, T>();
  for (const entry of entries) {
    if (!byUrl.has(entry.url)) byUrl.set(entry.url, entry);
  }
  return [...byUrl.values()];
}
