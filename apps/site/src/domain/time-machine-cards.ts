/** Fenêtre chronologique contiguë, bornée, avec la sélection toujours visible. */
export function historyCardWindow(total: number, selectedIndex: number, size = 5): number[] {
  const count = Math.min(Math.max(0, Math.trunc(total)), Math.max(1, Math.trunc(size)));
  if (count === 0) return [];
  const selected = Math.min(total - 1, Math.max(0, Math.trunc(selectedIndex)));
  const start = Math.max(0, Math.min(total - count, selected - Math.floor(count / 2)));
  return Array.from({ length: count }, (_, offset) => start + offset);
}
