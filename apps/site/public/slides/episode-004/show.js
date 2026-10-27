import { scenes, sceneIndex } from './model.js';

const document = globalThis.document;
const window = globalThis.window;
const screen = document.getElementById('screen');
const topics = document.getElementById('topics');
const notes = document.getElementById('notes');
const notesToggle = document.getElementById('notes-toggle');
const escapeText = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
let current = sceneIndex(window.location.hash);

const visuals = {
  'radar-context': `<div class="radar-context-visual">
    <div class="adoption-pair"><div><strong>94<span>%</span></strong><p>des responsables engineering <br> déclarent que leur équipe utilise l'IA</p></div><div><strong>6<span>%</span></strong><p>disposent des systèmes <br> pour la déployer et la gouverner à l'échelle</p></div></div>
    <div class="context-explanation"><div class="context-definition"><h2>Donner à l'agent le contexte du projet</h2><p><strong>Teamwork Graph</strong> relie les tickets, documents et décisions de GitHub, Jira, Confluence, Slack et plus de 80 sources tierces.</p><p><strong>Code Context</strong> y ajoute la compréhension du code et de ses relations.</p></div><div class="context-evidence"><h2>Avec Teamwork Graph</h2><p class="evidence-label">Atlassian annonce, dans ses tests internes, jusqu'à :</p><div class="context-gains"><div><strong>+44 %</strong><p>de qualité des réponses</p></div><div><strong>-48 %</strong><p>de tokens consommés</p></div></div></div></div>
  </div>`,
  'radar-workflow': `<ol class="sdlc-seven" aria-label="Les sept étapes du SDLC et ce qui change avec l'IA">
    <li><span class="step-number">01</span><h2>Contexte</h2><p>L'IA comprend le code, les décisions, les tickets et la documentation.</p></li>
    <li><span class="step-number">02</span><h2>Planning</h2><p>L'IA transforme une idée en spécifications et en tickets exploitables.</p></li>
    <li><span class="step-number">03</span><h2>Design</h2><p>Une vidéo de démonstration ou de feedback devient une instruction pour l'agent.</p></li>
    <li><span class="step-number">04</span><h2>Développement</h2><p>Les agents prennent en charge les tickets Jira et ouvrent des pull requests.</p></li>
    <li><span class="step-number">05</span><h2>Review</h2><p>L'IA analyse les PR et peut générer une vidéo expliquant les modifications.</p></li>
    <li><span class="step-number">06</span><h2>Maintenance</h2><p>Des agents diagnostiquent les problèmes et automatisent certaines corrections.</p></li>
    <li><span class="step-number">07</span><h2>Mesure</h2><p>L'entreprise mesure la valeur de l'IA au-delà du nombre de lignes de code.</p></li>
  </ol>`,
  'radar-results': `<div class="radar-results-visual"><div class="explained-results">
    <div class="result-line"><span>Vélocité estimée</span><p>Les ingénieurs d'Atlassian estiment une vélocité <strong>plus de 7 fois supérieure</strong> sur certains développements dans du code existant.</p></div>
    <div class="result-line"><span>Un pilote</span><p>Une équipe a réalisé <strong>plusieurs mois de roadmap en quelques semaines</strong> en développant à partir de spécifications.</p></div>
    <div class="result-line"><span>Maintenance</span><p>Chez Atlassian, les agents nettoient automatiquement <strong>près de 50 % des feature flags</strong>, ces mécanismes qui activent ou désactivent une fonctionnalité.</p></div>
    </div><div class="measurement-explained"><h2>Mesurer ce que l'IA apporte à l'équipe</h2><p><strong>DX AI Measurement</strong> suit les effets de l'IA sur la productivité et la qualité. Il aide à comparer le retour sur investissement et à repérer les modèles trop coûteux pour les tâches confiées.</p></div>
    <p class="results-caveat">Résultats rapportés par Atlassian. Gains non universellement démontrés.</p><p class="release-summary">Bêta : Code Context, Record for Agent. Accès anticipé : Planner, AI Review, Agent Sessions, vidéos de PR.</p>
  </div>`,
  opening: `<div class="opening-space" aria-hidden="true"></div>`,
  prototype: `<div class="talk-narrative"><p>Le PO utilise un agent pour construire <strong>les écrans, les parcours et les règles métier</strong> dans une application de démonstration.</p><p>Les utilisateurs et les équipes commerciales l'essaient. Le PO corrige le fonctionnement à partir de leurs retours.</p><p>Le développeur reçoit <strong>un prototype déjà confronté au terrain, avec son code</strong>.</p></div>`,
  handoff: `<div class="talk-narrative"><p>Le développeur et ses agents peuvent examiner <strong>le fonctionnement réel et le code du prototype</strong>. Le PO répond aux questions métier encore ouvertes.</p><p>Le développeur définit l'architecture, la sécurité et l'intégration au produit existant. Il garde la maîtrise des engagements clients.</p><p>Les agents déclinent ces choix en travail de réalisation, exécutent les tests et préparent la documentation.</p></div>`,
  agents: `<div class="agent-work" aria-label="Les agents prennent en charge le plan technique, les vérifications, les tests de panne et les supports utilisateurs.">
    <div class="agent-row"><span class="agent-index">01</span><h2>Préparer</h2><p>Plan, découpage technique, critères d'acceptation</p><span class="agent-tool">Spec Kit</span></div>
    <div class="agent-row"><span class="agent-index">02</span><h2>Vérifier</h2><p>Tests, reproduction des bugs, diagnostic</p><span class="agent-tool">QA Wolf</span></div>
    <div class="agent-row"><span class="agent-index">03</span><h2>Éprouver</h2><p>Scénarios de panne, résilience, nouveaux essais</p><span class="agent-tool">Gremlin</span></div>
    <div class="agent-row"><span class="agent-index">04</span><h2>Expliquer</h2><p>Guides utilisateurs, GIF et démonstrations</p><span class="agent-tool vision-label">Workflow envisagé</span></div>
  </div>`,
  tickets: `<div class="talk-narrative"><p>Le binôme fixe le résultat attendu et tranche les décisions. <strong>Les agents peuvent produire et ajuster le découpage technique.</strong></p><p>Atlassian prévoit de créer un ticket à partir d'une session déjà commencée. Le suivi peut donc se construire à partir du travail réalisé.</p><p>Linear remet lui aussi en cause l'organisation fondée sur les passages de relais. <strong>Quel découpage devons-nous encore imposer avant de commencer ?</strong></p><small class="availability">Agent Sessions d'Atlassian est en accès anticipé fermé.</small></div>`,
  debate: `<div class="talk-narrative"><p>Le PO peut concevoir les parcours avec ses agents. Le développeur peut leur confier la réalisation et une partie des vérifications.</p><p><strong>L'hypothèse : un binôme produit-développeur pourrait couvrir tout le cycle</strong>, sans designer ni QA dédiés à chaque fonctionnalité.</p><p>Sur nos propres produits, quelles responsabilités pourrions-nous regrouper et lesquelles exigeraient encore un spécialiste ?</p><small class="hypothesis">Une organisation à débattre. Les sources ne démontrent pas la disparition de ces métiers.</small></div>`,
};

topics.innerHTML = scenes
  .map(
    (slide, index) => `<option value="${index}">${index + 1}. ${escapeText(slide.label)}</option>`,
  )
  .join('');

function render() {
  const slide = scenes[current];
  const visual =
    slide.kind === 'radar-brief'
      ? `<div class="radar-brief-content"><dl class="brief-facts">${slide.facts.map((fact) => `<div><dt>${escapeText(fact.label)}</dt><dd>${escapeText(fact.text)}</dd></div>`).join('')}</dl><p class="brief-takeaway">${escapeText(slide.takeaway)}</p></div>`
      : visuals[slide.kind];
  const chapterScenes = scenes.filter((item) => item.chapter === slide.chapter);
  const chapterIndex = chapterScenes.findIndex((item) => item.id === slide.id);
  const illustration = slide.chapter === 'Radar' ? 'radar-v1.webp' : 'talk-lobby-v1.webp';
  screen.className = slide.kind;
  screen.innerHTML = `<img class="slide-illustration" src="../episode-003/assets/${illustration}" alt="" aria-hidden="true" />
    <article class="talk-slide"><div class="slide-heading"><p class="eyebrow">LE ${escapeText(slide.chapter.toUpperCase())} <span>${String(chapterIndex + 1).padStart(2, '0')} / ${String(chapterScenes.length).padStart(2, '0')}</span></p><h1>${escapeText(slide.title)}</h1><p class="subtitle">${escapeText(slide.subtitle)}</p></div>
    ${visual}
    <nav class="sources" aria-label="Sources de la diapositive">${slide.sources.map((source) => `<a href="${escapeText(source.url)}" target="_blank" rel="noopener noreferrer">${escapeText(source.label)}</a>`).join('')}</nav></article>`;
  document.getElementById('notes-content').innerHTML =
    `<h3>${escapeText(slide.title)}</h3>${slide.notes.map((note) => `<p>${escapeText(note)}</p>`).join('')}<h3>Sources</h3><ul>${slide.sources.map((source) => `<li><a href="${escapeText(source.url)}" target="_blank" rel="noopener noreferrer">${escapeText(source.title)}</a> (${escapeText(source.label)})</li>`).join('')}</ul>`;
  topics.value = String(current);
  document.getElementById('counter').textContent = `${current + 1} / ${scenes.length}`;
  document.getElementById('previous').disabled = current === 0;
  document.getElementById('next').disabled = current === scenes.length - 1;
  for (const link of document.querySelectorAll('[data-chapter]'))
    link.setAttribute('aria-current', link.dataset.chapter === slide.chapter ? 'step' : 'false');
  window.history.replaceState(null, '', `#${slide.id}`);
  document.title = `${slide.title} | SANDBOX Épisode 004`;
  screen.scrollTop = 0;
}

function move(delta) {
  current = Math.max(0, Math.min(scenes.length - 1, current + delta));
  render();
}

function setNotes(active) {
  notes.hidden = !active;
  notesToggle.setAttribute('aria-expanded', String(active));
  if (active) document.getElementById('close-notes').focus();
  else if (!document.body.classList.contains('presenting')) notesToggle.focus();
  else screen.focus({ preventScroll: true });
}

function setPresentation(active) {
  setNotes(false);
  document.body.classList.toggle('presenting', active);
  document.getElementById('present').setAttribute('aria-pressed', String(active));
  document.getElementById('live-controls').hidden = !active;
  screen.focus({ preventScroll: true });
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      setPresentation(true);
      await document.documentElement.requestFullscreen();
    }
  } catch {
    document.getElementById('status').textContent =
      'Le mode live reste actif. Le navigateur refuse le plein écran.';
  }
}

document.getElementById('previous').addEventListener('click', () => move(-1));
document.getElementById('next').addEventListener('click', () => move(1));
topics.addEventListener('change', () => {
  current = Number(topics.value);
  render();
});
notesToggle.addEventListener('click', () => setNotes(notes.hidden));
document.getElementById('close-notes').addEventListener('click', () => setNotes(false));
document
  .getElementById('present')
  .addEventListener('click', () =>
    setPresentation(!document.body.classList.contains('presenting')),
  );
document.getElementById('leave-live').addEventListener('click', () => setPresentation(false));
document.getElementById('fullscreen').addEventListener('click', () => void toggleFullscreen());
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) setPresentation(false);
});
window.addEventListener('hashchange', () => {
  current = sceneIndex(window.location.hash);
  render();
});
document.addEventListener('keydown', (event) => {
  const target = event.target;
  if (target?.nodeType === 1 && target.closest('select, input, textarea')) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'Escape') {
    if (!notes.hidden) setNotes(false);
    else setPresentation(false);
    return;
  }
  if (event.key.toLowerCase() === 'n') {
    setNotes(notes.hidden);
    return;
  }
  if (!notes.hidden) return;
  if (event.key === ' ' && target?.nodeType === 1 && target.closest('button, a')) return;
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
  if (event.key.toLowerCase() === 'p')
    setPresentation(!document.body.classList.contains('presenting'));
  if (event.key.toLowerCase() === 'f') void toggleFullscreen();
});

let touchStart = null;
screen.addEventListener(
  'touchstart',
  (event) => {
    if (event.touches.length !== 1 || !notes.hidden) {
      touchStart = null;
      return;
    }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  },
  { passive: true },
);
screen.addEventListener(
  'touchend',
  (event) => {
    if (!touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
  },
  { passive: true },
);
screen.addEventListener(
  'touchcancel',
  () => {
    touchStart = null;
  },
  { passive: true },
);

render();
if (new window.URL(window.location.href).searchParams.get('live') === '1') setPresentation(true);
