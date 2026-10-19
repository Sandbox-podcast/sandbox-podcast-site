export function newsPlainText(value: string): string {
  const entities: Record<string, string> = {
    amp: '&',
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
    nbsp: ' ',
    rsquo: "'",
    lsquo: "'",
    ndash: '-',
    mdash: '-',
    hellip: '...',
  };
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity: string) => {
      if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? '';
      const code = entity.startsWith('#x')
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
export function newsHtmlAttributes(tag: string): Record<string, string> {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)].map((match) => [
      match[1]?.toLowerCase() ?? '',
      newsPlainText(match[2] ?? match[3] ?? match[4] ?? ''),
    ]),
  );
}
