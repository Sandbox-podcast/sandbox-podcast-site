import { scenes, sceneIndex } from './model.js';

const document = globalThis.document;
const window = globalThis.window;
const screen = document.getElementById('screen');
const topicSelect = document.getElementById('topics');
const counter = document.getElementById('counter');
const presentButton = document.getElementById('present');
const liveControls = document.getElementById('live-controls');
const status = document.getElementById('status');
const chapterLinks = document.querySelectorAll('[data-chapter]');
const escapeText = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

let current = sceneIndex(window.location.hash, scenes);

topicSelect.innerHTML = scenes
  .map(
    (slide, index) =>
      `<option value="${index}">${escapeText(slide.chapter)} : ${escapeText(slide.title)}</option>`,
  )
  .join('');

function render() {
  const slide = scenes[current];
  screen.className = slide.kind;
  const illustration = `<img class="slide-illustration" src="${escapeText(slide.illustration)}" alt="" aria-hidden="true" />`;

  if (slide.kind === 'lobby') {
    const sequence = String(slide.sequence).padStart(2, '0');
    screen.innerHTML = `
      ${illustration}
      <div class="lobby-copy">
        <p class="sequence-index">SÉQUENCE ${sequence} <span>/ 04</span></p>
        <h1>${escapeText(slide.title)}</h1>
      </div>`;
  } else if (slide.kind === 'talk-case') {
    screen.innerHTML = `
      ${illustration}
      <div class="content-copy talk-copy">
        <p class="eyebrow">LE TALK <span>·</span> CAS D’USAGE</p>
        <h1>${escapeText(slide.title)}</h1>
        <p class="question">${escapeText(slide.question)}</p>
      </div>`;
  } else {
    screen.innerHTML = `
      ${illustration}
      <div class="content-copy clash-copy">
        <p class="eyebrow">LE CLASH <span>·</span> LA QUESTION</p>
        <h1>${escapeText(slide.title)}</h1>
      </div>`;
  }

  topicSelect.value = String(current);
  counter.textContent = `${current + 1} / ${scenes.length}`;
  document.getElementById('previous').disabled = current === 0;
  document.getElementById('next').disabled = current === scenes.length - 1;
  for (const chapterLink of chapterLinks) {
    chapterLink.setAttribute(
      'aria-current',
      chapterLink.dataset.chapter === slide.chapter ? 'step' : 'false',
    );
  }
  window.history.replaceState(null, '', `#${slide.id}`);
  document.title = `${slide.title} | SANDBOX Épisode 003`;
}

function move(delta) {
  current = Math.max(0, Math.min(scenes.length - 1, current + delta));
  render();
}

function setPresentation(active) {
  document.body.classList.toggle('presenting', active);
  presentButton.setAttribute('aria-pressed', String(active));
  liveControls.hidden = !active;
  screen.focus({ preventScroll: true });
}

function togglePresentation() {
  setPresentation(!document.body.classList.contains('presenting'));
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      setPresentation(true);
      await document.documentElement.requestFullscreen();
    }
  } catch {
    status.textContent = 'Le navigateur refuse le plein écran. Utilisez sa commande plein écran.';
  }
}

document.getElementById('previous').addEventListener('click', () => move(-1));
document.getElementById('next').addEventListener('click', () => move(1));
topicSelect.addEventListener('change', () => {
  current = Number(topicSelect.value);
  render();
});
presentButton.addEventListener('click', togglePresentation);
document.getElementById('leave-live').addEventListener('click', togglePresentation);
document.getElementById('fullscreen').addEventListener('click', () => void toggleFullscreen());
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) setPresentation(false);
});
window.addEventListener('hashchange', () => {
  current = sceneIndex(window.location.hash, scenes);
  render();
});
document.addEventListener('keydown', (event) => {
  const target = event.target;
  const isElement = target && target.nodeType === 1;
  if (
    (isElement && target.closest('select, input, textarea')) ||
    (event.key === ' ' && isElement && target.closest('button, a')) ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return;
  }

  if (['ArrowRight', 'PageDown', ' '].includes(event.key)) {
    event.preventDefault();
    move(event.shiftKey ? -1 : 1);
  }
  if (['ArrowLeft', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    move(-1);
  }
  if (event.key === 'Home') {
    event.preventDefault();
    current = 0;
    render();
  }
  if (event.key === 'End') {
    event.preventDefault();
    current = scenes.length - 1;
    render();
  }
  if (event.key.toLowerCase() === 'f') void toggleFullscreen();
  if (event.key.toLowerCase() === 'p') togglePresentation();
  if (event.key === 'Escape') setPresentation(false);
});

render();
if (new window.URL(window.location.href).searchParams.get('live') === '1') {
  setPresentation(true);
}
