export const WORLD_TRAVEL_MS = 1800;
export const ROOM_DEPTH = 12;
export const PORTAL_PLANE_Z = -5.85;
export interface WorldAnchor {
  x: number;
  y: number;
}

/** Coordonnées de la photographie de référence, indépendantes de la taille de fenêtre. */
export function portalWorldPosition(anchor: WorldAnchor) {
  const halfHeight = (4 - PORTAL_PLANE_Z) * Math.tan((52 * Math.PI) / 360);
  return {
    x: (anchor.x - 0.5) * 2 * halfHeight * (1672 / 941),
    y: (0.5 - anchor.y) * 2 * halfHeight,
    z: PORTAL_PLANE_Z,
  };
}

export function worldAnchorOnScreen(anchor: WorldAnchor, width: number, height: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const scale = Math.max(safeWidth / 1672, safeHeight / 941);
  return {
    x: 0.5 + ((anchor.x - 0.5) * 1672 * scale) / safeWidth,
    y: 0.5 + ((anchor.y - 0.5) * 941 * scale) / safeHeight,
  };
}

/** Position du curseur dans la photographie recadrée en cover. */
export function worldAnchorFromScreen(point: WorldAnchor, width: number, height: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const scale = Math.max(safeWidth / 1672, safeHeight / 941);
  return {
    x: 0.5 + ((point.x - 0.5) * safeWidth) / (1672 * scale),
    y: 0.5 + ((point.y - 0.5) * safeHeight) / (941 * scale),
  };
}

/** La pièce reste immobile derrière le mur ; seul le masque suit le curseur. */
export function worldDestination() {
  return {
    x: 0,
    y: 0,
    z: -ROOM_DEPTH,
    direction: { x: 0, y: 0, z: -1 },
  };
}

/** Le décor révélé garde son cadrage canonique, indépendant de l'ouverture et du trajet. */
export function worldDestinationCamera() {
  const destination = worldDestination();
  return { x: destination.x, y: destination.y, z: destination.z + 4 };
}

export function worldTravel(progress: number, anchor: WorldAnchor, start = { x: 0, y: 0, z: 4 }) {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const ease = p * p * (3 - 2 * p);
  const end = worldDestinationCamera();
  const portal = portalWorldPosition(anchor);
  // La profondeur reste monotone ; sa progression détermine le raccord au seuil.
  const crossing = (portal.z - start.z) / (end.z - start.z);
  const z = start.z + (end.z - start.z) * ease;
  // Le déplacement latéral atteint le point cliqué sans le dépasser, puis se recentre.
  // Les dérivées latérales valent zéro au raccord pour éviter un changement brutal.
  const beforePortal = ease <= crossing;
  const phase = beforePortal ? ease / crossing : (ease - crossing) / (1 - crossing);
  const lateral = phase * phase * (3 - 2 * phase);
  const from = beforePortal ? start : portal;
  const to = beforePortal ? portal : end;
  return {
    x: from.x + (to.x - from.x) * lateral,
    y: from.y + (to.y - from.y) * lateral,
    z,
    crossed: z < PORTAL_PLANE_Z + 0.03,
    progress: p,
    rotationProgress: ease,
  };
}
