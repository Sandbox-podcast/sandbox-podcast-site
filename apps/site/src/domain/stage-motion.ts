/** Une profondeur légère, bornée à 6 px horizontalement et 4 px verticalement. */
export function stagePointerMotion(x: number, y: number, width: number, height: number) {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: Math.max(-1, Math.min(1, (x / width - 0.5) * 2)) * 6,
    y: Math.max(-1, Math.min(1, (y / height - 0.5) * 2)) * 4,
  };
}
