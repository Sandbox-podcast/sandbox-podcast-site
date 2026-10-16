export interface SignalPoint {
  x: number;
  y: number;
}
export interface SignalSegment {
  top: number;
  height: number;
  path: string;
}
export interface SignalLayoutOffset<Node> extends SignalPoint {
  borderX: number;
  borderY: number;
  parent: Node | null;
}

/** Les offsets de mise en page excluent les transformations des révélations. */
export function homeSignalLayoutPoint<Node>(
  node: Node,
  read: (node: Node) => SignalLayoutOffset<Node>,
): SignalPoint {
  let current: Node | null = node;
  let x = 0;
  let y = 0;
  let first = true;
  while (current !== null) {
    const offset = read(current);
    x += offset.x + (first ? 0 : offset.borderX);
    y += offset.y + (first ? 0 : offset.borderY);
    first = false;
    current = offset.parent;
  }
  return { x, y };
}

export function homeSignalContact(
  point: SignalPoint,
  height: number,
  viewportWidth: number,
): SignalPoint {
  return {
    x: viewportWidth <= 900 ? 12 : Math.max(12, point.x - 24),
    y: point.y + height / 2,
  };
}

/** Un segment par chapitre limite la surface de dessin à sa seule hauteur. */
export function homeSignalSegments(start: SignalPoint, contacts: readonly SignalPoint[]) {
  if (![start.x, start.y].every(Number.isFinite)) return [];
  const segments: SignalSegment[] = [];
  let previous = start;
  for (const contact of contacts) {
    if (![contact.x, contact.y].every(Number.isFinite) || contact.y <= previous.y) continue;
    const height = contact.y - previous.y;
    const bend = Math.min(height * 0.6, 120);
    segments.push({
      top: previous.y,
      height,
      path: `M ${previous.x} 0 C ${previous.x} ${bend}, ${contact.x} ${height - bend}, ${contact.x} ${height}`,
    });
    previous = contact;
  }
  return segments;
}

export function homeSignalProgress(segment: SignalSegment, readingLine: number) {
  if (![segment.top, segment.height, readingLine].every(Number.isFinite) || segment.height <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, (readingLine - segment.top) / segment.height));
}
