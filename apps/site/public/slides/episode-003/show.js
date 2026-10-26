import { scenes, sceneIndex } from './model.js';

const document = globalThis.document;
const window = globalThis.window;
const screen = document.getElementById('screen');
const topicSelect = document.getElementById('topics');
const counter = document.getElementById('counter');
const presentButton = document.getElementById('present');
const liveControls = document.getElementById('live-controls');
const status = document.getElementById('status');
const notesButton = document.getElementById('speaker-notes-button');
const notesPanel = document.getElementById('speaker-notes');
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
  } else if (slide.kind === 'radar-story') {
    screen.innerHTML = slide.sourceImage
      ? `
      ${illustration}
      <article class="radar-copy">
        <p class="eyebrow">LE RADAR <span>·</span> ${escapeText(slide.date)}</p>
        <h1>${escapeText(slide.title)}</h1>
        <figure class="radar-visual">
          <img src="${escapeText(slide.sourceImage)}" alt="${escapeText(slide.sourceImageAlt)}" />
          <figcaption>${escapeText(slide.figureCaption ?? '')} <span>${escapeText(slide.figureAside ?? '')}</span></figcaption>
        </figure>
        ${slide.question ? `<p class="radar-question">${escapeText(slide.question)}</p>` : ''}
        <nav class="radar-sources" aria-label="Sources de l’actualité">${slide.sources.map(({ label, url }) => `<a href="${escapeText(url)}" target="_blank" rel="noopener noreferrer">${escapeText(label)} ↗</a>`).join('')}</nav>
      </article>`
      : `
      ${illustration}
      <article class="content-copy">
        <h1>${escapeText(slide.title)}</h1>
        <p class="question">${escapeText(slide.subtitle)}</p>
      </article>`;
  } else if (slide.kind === 'talk-trend') {
    screen.innerHTML = `
      ${illustration}
      <article class="talk-trend-copy">
        <p class="eyebrow">LE TALK <span>·</span> INTERFACES EN MUTATION</p>
        <h1>${escapeText(slide.title)}</h1>
        <p class="talk-trend-intro">${escapeText(slide.subtitle ?? '')}</p>
        <div class="talk-trend-grid">
          ${(slide.points ?? [])
            .map(
              ([label, detail]) => `
                <section class="talk-trend-point">
                  <h2>${escapeText(label)}</h2>
                  <p>${escapeText(detail)}</p>
                </section>`,
            )
            .join('')}
        </div>
        ${slide.takeaway ? `<p class="talk-trend-takeaway">${escapeText(slide.takeaway)}</p>` : ''}
        ${slide.question ? `<p class="talk-trend-question">${escapeText(slide.question)}</p>` : ''}
        <nav class="radar-sources talk-trend-sources" aria-label="Sources du talk">${(
          slide.sources ?? []
        )
          .map(
            ({ label, url }) =>
              `<a href="${escapeText(url)}" target="_blank" rel="noopener noreferrer">${escapeText(label)} ↗</a>`,
          )
          .join('')}</nav>
      </article>`;
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
  notesButton.hidden = !slide.notes?.length;
  notesButton.setAttribute('aria-expanded', 'false');
  notesPanel.hidden = true;
  document.getElementById('speaker-notes-content').innerHTML =
    (slide.notes ?? [])
      .map(
        ({ title, text }) =>
          `<section><h3>${escapeText(title)}</h3><p>${escapeText(text)}</p></section>`,
      )
      .join('') +
    (slide.notes?.length
      ? `<nav class="radar-sources" aria-label="Sources de l’actualité">${(slide.sources ?? []).map(({ label, url }) => `<a href="${escapeText(url)}" target="_blank" rel="noopener noreferrer">${escapeText(label)} ↗</a>`).join('')}</nav>`
      : '');
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
  notesPanel.hidden = true;
  notesButton.setAttribute('aria-expanded', 'false');
  document.body.classList.toggle('presenting', active);
  presentButton.setAttribute('aria-pressed', String(active));
  liveControls.hidden = !active;
  screen.focus({ preventScroll: true });
}

function toggleNotes() {
  if (!scenes[current].notes?.length || document.body.classList.contains('presenting')) return;
  notesPanel.hidden = !notesPanel.hidden;
  notesButton.setAttribute('aria-expanded', String(!notesPanel.hidden));
  if (!notesPanel.hidden) document.getElementById('close-speaker-notes').focus();
  else notesButton.focus();
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
notesButton.addEventListener('click', toggleNotes);
document.getElementById('close-speaker-notes').addEventListener('click', toggleNotes);
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
  if (event.key.toLowerCase() === 'n') toggleNotes();
  if (event.key === 'Escape') setPresentation(false);
});

render();
if (new window.URL(window.location.href).searchParams.get('live') === '1') {
  setPresentation(true);
}
