/** Utilitaires déterministes des données de démonstration : même entrée, même sortie, partout. */

/** Hachage FNV-1a ramené à [0, 1). */
export function hashUnit(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x1_0000_0000;
}

/** Multiplicateur de bruit dans [1 − amplitude, 1 + amplitude]. */
export function noise(seed: string, index: number, amplitude: number): number {
  return 1 + (hashUnit(`${seed}:${String(index)}`) * 2 - 1) * amplitude;
}

/** Interpolation linéaire entre des points [x, y] triés par x ; valeurs extrêmes prolongées. */
export function interp(points: readonly (readonly [number, number])[], x: number): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return 1;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b && x <= b[0]) {
      const t = (x - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return last[1];
}
