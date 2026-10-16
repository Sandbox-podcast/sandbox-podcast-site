/** Une courte avancée de caméra, déterministe dans les deux sens du défilement. */
export function stageMotion(top: number, travel: number) {
  const progress =
    Number.isFinite(top) && Number.isFinite(travel) && travel > 0
      ? Math.min(1, Math.max(0, -top / travel))
      : 0;
  const smooth = progress * progress * (3 - 2 * progress);
  return {
    progress,
    scale: 1 + smooth * 0.12,
    shift: -smooth * 28,
    titleShift: -smooth * 46,
    titleOpacity: 1 - smooth * 0.65,
    inset: smooth * 2.4,
  };
}
