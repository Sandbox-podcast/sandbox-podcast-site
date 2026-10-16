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

export function episodeResourcePath(number: number, index: number): string {
  return `/episodes/${String(number)}#resource-${String(index)}`;
}
