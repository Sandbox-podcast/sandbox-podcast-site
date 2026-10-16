/* global document, window */
import assert from 'node:assert/strict';

/** Lecture seule, utilisable avec page.evaluate ou le navigateur de Codex. */
export function measureHomeStage() {
  const rect = (element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height, bottom: box.bottom };
  };
  const car = document.querySelector('a[aria-label="Time Machine"]');
  const box = car.getBoundingClientRect();
  const hits = [];
  if (box.width) {
    for (const y of [0.1, 0.5, 0.9]) {
      for (const x of [0.1, 0.5, 0.9]) {
        const px = box.x + box.width * x;
        const py = box.y + box.height * y;
        if (px < 0 || px >= document.documentElement.clientWidth || py < 0) continue;
        const target = document.elementFromPoint(px, py);
        // Le sélecteur de langue conserve la priorité dans le coin du cadre.
        if (target?.closest('.locale-switcher')) continue;
        hits.push(target?.closest('a') === car);
      }
    }
  }
  return {
    viewport: [window.innerWidth, window.innerHeight],
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    title: rect(document.querySelector('h1')),
    person: rect(document.querySelector('[data-person="loic"]')),
    scene: rect(document.querySelector('[aria-labelledby="discovery-title"]')),
    heroPosition: window.getComputedStyle(
      document.querySelector('[aria-labelledby="discovery-title"] > div'),
    ).position,
    action: rect(document.querySelector('a[data-analytics-destination="podcast"]')),
    carHits: hits,
    headerPointerEvents: window.getComputedStyle(document.querySelector('.site-header'))
      .pointerEvents,
  };
}

export function assertHomeStage(result) {
  const label = result.viewport.join(' × ');
  assert.equal(result.overflow, false, `${label} : débordement horizontal`);
  assert.notEqual(result.heroPosition, 'sticky', `${label} : défilement retenu`);
  if (result.person.width) {
    assert.ok(
      result.title.y >= result.person.bottom + 16 || result.person.y >= result.title.bottom + 16,
      `${label} : titre sur le visage`,
    );
    assert.ok(
      result.action.bottom <= result.scene.bottom,
      `${label} : action coupée par le plateau`,
    );
    assert.ok(result.carHits.length >= 3, `${label} : voiture inaccessible`);
    assert.ok(result.carHits.every(Boolean), `${label} : clic intercepté sur la voiture`);
    assert.equal(result.headerPointerEvents, 'none', `${label} : en-tête transparent interceptant`);
  }
}
