import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  portalWorldPosition,
  worldAnchorFromScreen,
  worldAnchorOnScreen,
  worldDestination,
  worldDestinationCamera,
  worldTravel,
  PORTAL_PLANE_Z,
} from '../src/domain/sandbox-world-motion';

const door = { x: 0.637, y: 0.35 };

describe('traversée des pièces sans chorégraphie au scroll', () => {
  it('part de la pose réelle du visiteur sans annuler sa parallaxe au clic', () => {
    const start = { x: 0.16, y: -0.1, z: 4 };
    expect(worldTravel(0, door, start)).toMatchObject({
      ...start,
      crossed: false,
      progress: 0,
      rotationProgress: 0,
    });
    const next = worldTravel(0.001, door, start);
    expect(Math.abs(next.x - start.x)).toBeLessThan(0.001);
    expect(Math.abs(next.y - start.y)).toBeLessThan(0.001);
    expect(Math.abs(next.z - start.z)).toBeLessThan(0.001);
  });

  it.each([
    { x: 0.5, y: 0.5 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ])('conserve pose et projection au changement de repère depuis $x, $y', (anchor) => {
    const destination = worldDestination();
    const direction = new Vector3(
      destination.direction.x,
      destination.direction.y,
      destination.direction.z,
    );
    expect(direction.length()).toBeCloseTo(1, 12);
    expect(direction.z).toBeLessThan(0);
    const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, -1), direction);
    const arrival = worldTravel(1, anchor, { x: -0.13, y: 0.08, z: 4 });
    const origin = new Vector3(destination.x, destination.y, destination.z);
    const relative = new Vector3(arrival.x, arrival.y, arrival.z)
      .sub(origin)
      .applyQuaternion(rotation.clone().invert());
    expect(relative.x).toBeCloseTo(0, 12);
    expect(relative.y).toBeCloseTo(0, 12);
    expect(relative.z).toBeCloseTo(4, 12);
    expect(arrival).toMatchObject({ crossed: true, progress: 1, rotationProgress: 1 });

    const beforeRebase = new PerspectiveCamera(52, 16 / 9, 0.03, 100);
    beforeRebase.position.set(arrival.x, arrival.y, arrival.z);
    beforeRebase.quaternion.copy(rotation);
    beforeRebase.updateMatrixWorld();
    const afterRebase = new PerspectiveCamera(52, 16 / 9, 0.03, 100);
    afterRebase.position.z = 4;
    afterRebase.updateMatrixWorld();
    // Plusieurs profondeurs détectent aussi un saut de perspective, pas seulement de position.
    for (const local of [new Vector3(0, 0, -5), new Vector3(2, 1, -3), new Vector3(-3, -1, -8)]) {
      const before = local.clone().applyQuaternion(rotation).add(origin).project(beforeRebase);
      const after = local.clone().project(afterRebase);
      expect(before.x).toBeCloseTo(after.x, 12);
      expect(before.y).toBeCloseTo(after.y, 12);
      expect(before.z).toBeCloseTo(after.z, 12);
    }
  });

  it('garde les mêmes points de la destination à l’écran quand seule l’ouverture bouge', () => {
    const camera = new PerspectiveCamera(52, 1672 / 941, 0.03, 100);
    const view = worldDestinationCamera();
    camera.position.set(view.x, view.y, view.z);
    camera.updateMatrixWorld();
    const samples = [new Vector3(-3, 1, -6), new Vector3(3, 1, -6), new Vector3(0, -2, 2)];
    const reference = samples.map((point) =>
      point
        .clone()
        .add(new Vector3(0, 0, -12))
        .project(camera),
    );
    for (const anchor of [door, { x: 0, y: 0 }, { x: 1, y: 1 }]) {
      const portal = portalWorldPosition(anchor);
      expect(Number.isFinite(portal.x)).toBe(true);
      const destination = worldDestination();
      expect(destination).toEqual({
        x: 0,
        y: 0,
        z: -12,
        direction: { x: 0, y: 0, z: -1 },
      });
      samples.forEach((point, index) => {
        const screen = point
          .clone()
          .add(new Vector3(destination.x, destination.y, destination.z))
          .project(camera);
        expect(screen.toArray()).toEqual(reference[index]?.toArray());
      });
    }
  });

  it('conserve le cadrage canonique entre aperçu, seuil et arrivée', () => {
    const preview = new PerspectiveCamera(52, 1672 / 941, 0.03, 100);
    const destinationView = worldDestinationCamera();
    preview.position.set(destinationView.x, destinationView.y, destinationView.z);
    preview.updateMatrixWorld();
    const arrived = new PerspectiveCamera(52, 1672 / 941, 0.03, 100);
    arrived.position.z = 4;
    arrived.updateMatrixWorld();
    for (const point of [new Vector3(-6, 3, -6), new Vector3(6, -2, -6), new Vector3(0, 0, -3)]) {
      const visibleThroughPortal = point
        .clone()
        .add(new Vector3(0, 0, -12))
        .project(preview);
      const visibleAfterArrival = point.clone().project(arrived);
      expect(visibleThroughPortal.x).toBeCloseTo(visibleAfterArrival.x, 12);
      expect(visibleThroughPortal.y).toBeCloseTo(visibleAfterArrival.y, 12);
      expect(visibleThroughPortal.z).toBeCloseTo(visibleAfterArrival.z, 12);
    }
  });

  it.each([door, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }])(
    'passe par le point cliqué sans dépasser ses coordonnées depuis $x, $y',
    (anchor) => {
      const start = { x: -0.13, y: 0.08, z: 4 };
      const portal = portalWorldPosition(anchor);
      let low = 0;
      let high = 1;
      for (let iteration = 0; iteration < 60; iteration++) {
        const middle = (low + high) / 2;
        if (worldTravel(middle, anchor, start).z > PORTAL_PLANE_Z) low = middle;
        else high = middle;
      }
      const crossing = worldTravel((low + high) / 2, anchor, start);
      expect(crossing.x).toBeCloseTo(portal.x, 10);
      expect(crossing.y).toBeCloseTo(portal.y, 10);
      expect(crossing.z).toBeCloseTo(portal.z, 10);
      let previousZ = start.z;
      for (let index = 0; index <= 1000; index++) {
        const pose = worldTravel(index / 1000, anchor, start);
        expect(pose.z).toBeLessThanOrEqual(previousZ);
        expect(pose.x).toBeGreaterThanOrEqual(Math.min(0, start.x, portal.x) - 1e-10);
        expect(pose.x).toBeLessThanOrEqual(Math.max(0, start.x, portal.x) + 1e-10);
        expect(pose.y).toBeGreaterThanOrEqual(Math.min(0, start.y, portal.y) - 1e-10);
        expect(pose.y).toBeLessThanOrEqual(Math.max(0, start.y, portal.y) + 1e-10);
        previousZ = pose.z;
      }
    },
  );

  it('avance sans recul, franchit le plan une seule fois et reste continue au seuil', () => {
    const samples = Array.from({ length: 1001 }, (_, index) => worldTravel(index / 1000, door));
    const crossing = samples.findIndex((pose) => pose.crossed);
    expect(crossing).toBeGreaterThan(0);
    expect(crossing).toBeLessThan(samples.length - 1);
    for (let index = 1; index < samples.length; index++) {
      const before = samples[index - 1];
      const after = samples[index];
      if (!before || !after) throw new Error('Échantillon de trajectoire absent.');
      expect(after.z).toBeLessThanOrEqual(before.z);
      expect(Math.abs(after.z - before.z)).toBeLessThan(0.02);
      expect(after.rotationProgress).toBeGreaterThanOrEqual(before.rotationProgress);
      expect(after.rotationProgress - before.rotationProgress).toBeLessThan(0.002);
      if (index >= crossing) expect(after.crossed).toBe(true);
    }
    const beforeCrossing = samples[crossing - 1];
    const afterCrossing = samples[crossing];
    if (!beforeCrossing || !afterCrossing) throw new Error('Franchissement du portail absent.');
    expect(beforeCrossing.z).toBeGreaterThanOrEqual(PORTAL_PLANE_Z + 0.03);
    expect(afterCrossing.z).toBeLessThan(PORTAL_PLANE_Z + 0.03);
  });

  it('borne la progression et ne conserve aucun état entre deux trajets', () => {
    for (const progress of [-1, NaN, Infinity, -Infinity])
      expect(worldTravel(progress, door)).toEqual(worldTravel(0, door));
    expect(worldTravel(2, door)).toEqual(worldTravel(1, door));
    const first = worldTravel(0.45, door);
    worldTravel(1, { x: 0.2, y: 0.4 });
    expect(worldTravel(0.45, door)).toEqual(first);
  });

  it.each([
    [1672, 941],
    [901, 640],
    [1920, 860],
    [1440, 760],
  ])('aligne les cibles HTML avec la caméra à %i × %i', (width, height) => {
    const camera = new PerspectiveCamera(52, width / height, 0.03, 100);
    camera.position.z = 4;
    // Un cadrage cover garde la largeur de référence sur les vues plus larges.
    if (width / height > 1672 / 941) {
      camera.fov =
        (Math.atan((Math.tan((26 * Math.PI) / 180) * (1672 / 941)) / (width / height)) * 360) /
        Math.PI;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
    for (const anchor of [door, { x: 0.76, y: 0.29 }, { x: 0.16, y: 0.39 }]) {
      const world = portalWorldPosition(anchor);
      const projected = new Vector3(world.x, world.y, world.z).project(camera);
      const screen = worldAnchorOnScreen(anchor, width, height);
      expect(screen.x).toBeCloseTo((projected.x + 1) / 2, 10);
      expect(screen.y).toBeCloseTo((1 - projected.y) / 2, 10);
    }
  });

  it('conserve le centre et corrige les cibles latérales lorsque le décor est recadré', () => {
    expect(worldAnchorOnScreen({ x: 0.5, y: 0.5 }, 901, 640)).toEqual({ x: 0.5, y: 0.5 });
    const history = worldAnchorOnScreen({ x: 0.76, y: 0.29 }, 901, 640);
    expect(history.x * 901).toBeCloseTo(746.165, 3);
    expect(history.y).toBeCloseTo(0.29, 12);
    expect(worldAnchorOnScreen(door, 1672, 941)).toEqual(door);
  });

  it.each([
    [1024, 768],
    [1440, 900],
    [1920, 1080],
  ])('retrouve le curseur après projection de toute la surface à %i × %i', (width, height) => {
    for (const point of [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0.5, y: 0.5 },
      { x: 0.12, y: 0.73 },
      { x: 0.91, y: 0.08 },
    ]) {
      const anchor = worldAnchorFromScreen(point, width, height);
      const projected = worldAnchorOnScreen(anchor, width, height);
      expect(projected.x).toBeCloseTo(point.x, 12);
      expect(projected.y).toBeCloseTo(point.y, 12);
    }
  });

  it('distingue le point écran et la photo lorsque le cover recadre les côtés', () => {
    const leftEdge = worldAnchorFromScreen({ x: 0, y: 0.5 }, 1024, 768);
    const rightEdge = worldAnchorFromScreen({ x: 1, y: 0.5 }, 1024, 768);
    expect(leftEdge.x).toBeGreaterThan(0);
    expect(rightEdge.x).toBeLessThan(1);
    expect(leftEdge.x + rightEdge.x).toBeCloseTo(1, 12);
    expect(leftEdge.y).toBe(0.5);
    expect(worldAnchorFromScreen(door, 1672, 941)).toEqual(door);
  });
});
