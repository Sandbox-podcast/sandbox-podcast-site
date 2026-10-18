import {
  buildEpisodeScenes,
  buildScenes,
  buildShortScenes,
  isSelectable,
  sceneIndex,
  restoreChoices,
} from './model.js';

const document = globalThis.document;
const window = globalThis.window;
const screen = document.getElementById('screen');
const notes = document.getElementById('notes');
const topicSelect = document.getElementById('topics');
const decisionSelect = document.getElementById('decision');
const presentButton = document.getElementById('present');
const imageButton = document.getElementById('image-only');
const storageStatus = document.getElementById('storage-status');
const storageKey = 'sandbox-episode-003-choices-v1';
const labels = { pending: 'À trier', keep: 'Garder', reserve: 'En réserve', drop: 'Écarter' };
const escapeText = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
const link = (source) =>
  `<a href="${escapeText(source.url)}" target="_blank" rel="noopener noreferrer">${escapeText(source.title)}</a>`;
const paragraphs = (values) => values.map((value) => `<p>${escapeText(value)}</p>`).join('');

async function start() {
  const responses = await Promise.all([
    window.fetch('./content.json'),
    window.fetch('./shorts.json'),
    window.fetch('./rundown.json'),
  ]);
  for (const response of responses) {
    if (!response.ok) throw new Error(`Contenu indisponible (${response.status}).`);
  }
  const [episode, shorts, rundown] = await Promise.all(
    responses.map((response) => response.json()),
  );
  const scenes = buildEpisodeScenes(episode, rundown);
  const choiceScenes = [...buildScenes(episode), ...buildShortScenes(shorts)];
  document.querySelector('header small').textContent =
    `${rundown.targetMinutes} min visées / ${rundown.maxMinutes} min maximum`;
  const presentationUrl = new window.URL(window.location.href);
  presentationUrl.searchParams.delete('view');
  window.history.replaceState(null, '', presentationUrl);
  const chapterLinks = document.querySelectorAll('[data-chapter]');
  let current = sceneIndex(window.location.hash, scenes);
  let choices = {};
  try {
    choices = restoreChoices(JSON.parse(window.localStorage.getItem(storageKey)), choiceScenes);
  } catch {
    storageStatus.textContent =
      'Sauvegarde locale indisponible. Exportez vos choix avant de fermer.';
  }

  topicSelect.innerHTML = scenes
    .map(
      (scene, index) =>
        `<option value="${index}">${escapeText(scene.chapter)} : ${escapeText(scene.title)}</option>`,
    )
    .join('');

  function render() {
    const scene = scenes[current];
    const selectable = isSelectable(scene);
    screen.className = scene.kind;
    if (scene.kind !== 'news') document.body.classList.remove('image-only');
    imageButton.disabled = scene.kind !== 'news';
    const eyebrow = `<p class="eyebrow">${escapeText(scene.chapter)} / ${scene.kind === 'news' ? escapeText(scene.date.split('-').reverse().join('/')) : 'Épisode 003'}</p>`;
    const heading = `<h1>${escapeText(scene.title)}</h1>`;
    if (scene.kind === 'section') {
      screen.innerHTML = `<img class="chapter-art" src="../episode-002-bis/assets/${scene.image}-hero.png" alt="" /><div class="section-copy">${eyebrow}${heading}<p class="section-timing">${scene.durationMinutes} min${scene.id === 'build' ? ' maximum' : scene.id === 'radar' ? ' visées' : ''}</p><p>${escapeText(scene.subtitle)}</p></div>`;
      notes.innerHTML = `<h2>Cette séquence</h2>${paragraphs(scene.notes)}<h2>Conducteur : ${rundown.targetMinutes} minutes</h2>${paragraphs(rundown.segments.map((segment) => `${segment.title} : ${segment.minutes} min`))}<p>Durée totale : ${rundown.minMinutes} à ${rundown.maxMinutes} minutes selon le tri du Radar. Intro et transitions comprises.</p>`;
    } else if (scene.kind === 'build-step') {
      const skill = episode.skills.find((item) => item.id === scene.topicId);
      screen.innerHTML = `<div class="build-copy">${eyebrow}<p class="build-timing">${escapeText(scene.label)} / ${scene.durationMinutes} min</p>${heading}<div class="points">${paragraphs(scene.points)}</div><p class="credit">Cas proposé : ${escapeText(skill.name)}. Comparaison à préparer.</p></div>`;
      notes.innerHTML = `<h2>À expliquer et à préparer</h2>${paragraphs(scene.notes)}<h2>Sources du sujet</h2>${rundown.build.sources.map(link).join('<br />')}<p>Les deux pages de comparaison ne sont pas encore réalisées.</p>`;
    } else if (scene.kind === 'news') {
      const imagePath = `./assets/sources/${escapeText(scene.image)}`;
      screen.innerHTML = `<figure><img class="image-backdrop" src="${imagePath}" alt="" aria-hidden="true" /><button class="image-toggle" type="button" aria-pressed="false"><img class="source-image" src="${imagePath}" alt="Capture de la source ${escapeText(scene.publisher)}" /></button><figcaption>${escapeText(scene.sources[0].title)}</figcaption></figure><div class="copy">${eyebrow}${heading}<div class="points">${paragraphs(scene.points)}</div><p class="credit">${escapeText(scene.publisher)}<br />${link(scene.sources[0])}</p></div>`;
      screen.querySelector('.image-toggle').addEventListener('click', toggleImage);
      notes.innerHTML = `<h2>Accroche de short proposée</h2><p>${escapeText(scene.hook)}</p><h2>Pour la discussion</h2><p>${escapeText(scene.question)}</p><h2>À préciser à l'oral</h2><p>${escapeText(scene.caution)}</p><h2>Date et sources</h2><p>${escapeText(scene.dateEvidence)}</p>${scene.sources.map(link).join('<br />')}`;
    } else if (scene.kind === 'skill') {
      screen.innerHTML = `<div class="skill-copy">${eyebrow}<p class="skill-name">${escapeText(scene.name)}</p>${heading}<p class="hook">${escapeText(scene.hook)}</p><p class="demo">${escapeText(scene.demo)}</p><p class="metric">N° ${scene.rank} / ${escapeText(scene.installs)} installations</p><p class="credit">skills.sh, cumul relevé le 18/10/2026. Usage actif non mesuré.</p></div>`;
      notes.innerHTML = `<h2>Essai proposé</h2><p>${escapeText(scene.priority)}</p><p>${escapeText(scene.prompt)}</p><h2>Limites</h2><p>${escapeText(scene.caution)}</p><p>Aucun résultat de démonstration n'est annoncé avant l'essai.</p><h2>Source</h2>${link({ title: `${scene.owner} / ${scene.name}`, url: scene.url })}`;
    } else if (scene.kind === 'leaderboard') {
      screen.innerHTML = `${eyebrow}${heading}<ol class="ranking">${episode.leaderboard.top.map((item) => `<li><span>${escapeText(item.name)}</span><strong>${escapeText(item.installs)}</strong></li>`).join('')}</ol><p class="credit">skills.sh, relevé du 18/10/2026. Installations cumulées, pas utilisateurs actifs.</p>`;
      notes.innerHTML = `<p>${escapeText(episode.leaderboard.metric)}</p><p>La sélection de démonstrations privilégie aussi les résultats visibles et l'intérêt pour le public. Elle ne reprend pas simplement les huit premiers rangs.</p>${link({ title: 'Classement consulté', url: episode.leaderboard.url })}`;
    } else if (scene.kind === 'social') {
      screen.innerHTML = `${eyebrow}${heading}<div class="social-lessons">${paragraphs(["Montrer le résultat avant d'expliquer les réglages.", 'Un problème concret, un essai visible, une limite expliquée.', "Les listes attirent. L'avant/après donne de quoi discuter."])}</div><p class="credit">Pistes éditoriales issues d'un échantillon Instagram et YouTube. Pas un classement de viralité.</p>`;
      notes.innerHTML =
        '<h2>Échantillon consulté le 18 octobre</h2>' +
        episode.social
          .map(
            (item) =>
              `<h3>${escapeText(item.platform)} / ${escapeText(item.author)}</h3><p>${escapeText(item.observation)}</p><p>${escapeText(item.scope)}</p>${link({ title: 'Ouvrir la publication', url: item.url })}`,
          )
          .join('');
    } else if (scene.kind === 'angle') {
      screen.innerHTML = `<div class="angle-copy">${eyebrow}<p class="series-name">${escapeText(scene.series)}</p>${heading}<p class="angle-subtitle">${escapeText(scene.subtitle)}</p><div class="angle-promise">${scene.promise.map((item, index) => `<span><b>0${index + 1}</b>${escapeText(item)}</span>`).join('')}</div><p class="credit">${escapeText(scene.status)}</p></div>`;
      notes.innerHTML = `<h2>Angle du prochain épisode</h2>${paragraphs(scene.notes)}<h2>Commencer par ces trois essais</h2>${paragraphs(shorts.pitches.slice(0, 3).map((pitch) => pitch.title))}`;
    } else if (scene.kind === 'pattern' || scene.kind === 'measurement') {
      screen.innerHTML = `${eyebrow}${heading}<div class="pattern-steps">${scene.steps.map((step) => `<article><span>${escapeText(step.label)}</span><h2>${escapeText(step.title)}</h2><p>${escapeText(step.text)}</p></article>`).join('')}</div><p class="credit">${escapeText(scene.caution)}</p>`;
      notes.innerHTML = `${paragraphs(scene.notes)}<h2>Sources</h2>${scene.sources.map(link).join('<br />')}`;
    } else if (scene.kind === 'evidence') {
      screen.innerHTML = `${eyebrow}${heading}<div class="evidence-grid">${shorts.comparisons.map((item) => `<article><p>${escapeText(item.author)}</p><h2>${escapeText(item.result)}</h2><p>${escapeText(item.winner)}</p><div class="comparison-low"><strong>${escapeText(item.comparison)}</strong><span>${escapeText(item.other)}</span></div></article>`).join('')}</div><p class="credit">${escapeText(shorts.evidenceCaution)}</p>`;
      notes.innerHTML = `<h2>Comparaisons publiques</h2>${shorts.comparisons.map((item) => `<h3>${escapeText(item.author)}</h3><p>${escapeText(item.scope)}</p>${item.sources.map(link).join('<br />')}`).join('')}<h2>Périmètre</h2>${paragraphs(shorts.scope)}`;
    } else if (scene.kind === 'short') {
      screen.innerHTML = `<div class="short-copy">${eyebrow}<p class="series-name">${escapeText(scene.series)} / ${escapeText(scene.priority)}</p>${heading}<p class="short-hook">${escapeText(scene.hook)}</p><div class="short-proof"><span>À montrer</span><p>${escapeText(scene.visual)}</p></div><p class="short-follow"><span>La suite</span>${escapeText(scene.follow)}</p><p class="credit">${escapeText(scene.status)}</p></div>`;
      notes.innerHTML = `<h2>Pourquoi ce sujet</h2><p>${escapeText(scene.rationale)}</p><h2>Déroulé proposé</h2>${scene.beats.map((beat) => `<h3>${escapeText(beat.time)}</h3><p>${escapeText(beat.text)}</p>`).join('')}<h2>Deux accroches à comparer</h2>${paragraphs(scene.alternatives)}<h2>Conditions avant tournage</h2><p>${escapeText(scene.requirements)}</p><h2>Limite à conserver</h2><p>${escapeText(scene.caution)}</p><h2>Références</h2>${scene.sources.map(link).join('<br />')}`;
    } else {
      screen.innerHTML = `<div class="debate-copy">${eyebrow}<p class="debate-theme">${escapeText(scene.theme)} / ${scene.durationMinutes} min</p>${heading}<p class="debate-context">${escapeText(scene.context)}</p><div class="debate-positions">${scene.positions.map((position) => `<article><h2>${escapeText(position.title)}</h2><p>${escapeText(position.argument)}</p></article>`).join('')}</div><p class="debate-followup">${escapeText(scene.followUp)}</p></div>`;
      notes.innerHTML = `<h2>Pourquoi ce débat en octobre</h2><p>${escapeText(scene.relevance)}</p><h2>Relance</h2><p>${escapeText(scene.followUp)}</p><h2>À ne pas déformer</h2><p>${escapeText(scene.caution)}</p><h2>Sources</h2>${scene.sources.map(link).join('<br />')}<p>Arguments proposés, pas citations. Lou, Loïc et Nico choisissent leurs positions. Sélection éditoriale, pas classement exhaustif des controverses.</p>`;
    }
    topicSelect.value = String(current);
    for (const chapterLink of chapterLinks) {
      chapterLink.setAttribute(
        'aria-current',
        chapterLink.dataset.chapter === scene.chapter ? 'step' : 'false',
      );
    }
    decisionSelect.disabled = !selectable;
    decisionSelect.value = choices[scene.id] || 'pending';
    document.getElementById('counter').textContent = `${current + 1} / ${scenes.length}`;
    document.getElementById('previous').disabled = current === 0;
    document.getElementById('next').disabled = current === scenes.length - 1;
    window.history.replaceState(null, '', `#${scene.id}`);
    document.title = `${scene.title} | SANDBOX 003`;
    updateImageControls();
  }

  function updateImageControls() {
    const imageOnly = document.body.classList.contains('image-only');
    imageButton.setAttribute('aria-pressed', String(imageOnly));
    imageButton.textContent = imageOnly ? 'Image et texte' : 'Image seule';
    const imageToggle = screen.querySelector('.image-toggle');
    if (imageToggle) {
      imageToggle.setAttribute('aria-pressed', String(imageOnly));
      imageToggle.setAttribute(
        'aria-label',
        imageOnly ? 'Réafficher le texte' : "Agrandir l'image",
      );
    }
  }

  function toggleImage() {
    if (scenes[current].kind !== 'news') return;
    document.body.classList.toggle('image-only');
    updateImageControls();
  }

  function setPresentation(active) {
    document.body.classList.toggle('presenting', active);
    presentButton.setAttribute('aria-pressed', String(active));
    document.getElementById('live-controls').hidden = !active;
    notes.hidden = true;
    document.getElementById('notes-toggle').setAttribute('aria-expanded', 'false');
    screen.focus({ preventScroll: true });
  }

  async function togglePresentation() {
    const active = !document.body.classList.contains('presenting');
    setPresentation(active);
    if (!active && document.fullscreenElement) await fullscreen();
  }

  function move(delta) {
    current = Math.max(0, Math.min(scenes.length - 1, current + delta));
    render();
  }

  document.getElementById('previous').addEventListener('click', () => move(-1));
  document.getElementById('next').addEventListener('click', () => move(1));
  topicSelect.addEventListener('change', () => {
    current = Number(topicSelect.value);
    render();
  });
  decisionSelect.addEventListener('change', () => {
    choices = restoreChoices(
      { ...choices, [scenes[current].id]: decisionSelect.value },
      choiceScenes,
    );
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(choices));
      storageStatus.textContent = 'Choix enregistré dans ce navigateur.';
    } catch {
      storageStatus.textContent = 'Choix conservé pour cette session. Exportez-le avant de fermer.';
    }
  });
  document.getElementById('export').addEventListener('click', () => {
    const selected = scenes.filter(isSelectable).map((scene) => ({
      id: scene.id,
      title: scene.title,
      decision: labels[choices[scene.id] || 'pending'],
    }));
    const downloadUrl = window.URL.createObjectURL(
      new window.Blob(
        [JSON.stringify({ episode: 3, view: 'episode', choices: selected }, null, 2)],
        {
          type: 'application/json',
        },
      ),
    );
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = 'sandbox-episode-003-choix.json';
    anchor.click();
    window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
  });
  function toggleNotes() {
    notes.hidden = !notes.hidden;
    document.getElementById('notes-toggle').setAttribute('aria-expanded', String(!notes.hidden));
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        setPresentation(true);
        await document.documentElement.requestFullscreen();
      }
    } catch {
      storageStatus.textContent =
        'Le navigateur refuse le plein écran. Utilisez sa commande plein écran.';
    }
  }
  document.getElementById('notes-toggle').addEventListener('click', toggleNotes);
  document.getElementById('fullscreen').addEventListener('click', fullscreen);
  presentButton.addEventListener('click', togglePresentation);
  document.getElementById('leave-live').addEventListener('click', togglePresentation);
  imageButton.addEventListener('click', toggleImage);
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) setPresentation(false);
  });
  document.addEventListener('keydown', (event) => {
    if (
      event.target.closest('select, input, textarea') ||
      (event.key === ' ' && event.target.closest('button, a')) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
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
    if (event.key.toLowerCase() === 'n') toggleNotes();
    if (event.key.toLowerCase() === 'f') void fullscreen();
    if (event.key.toLowerCase() === 'p') void togglePresentation();
    if (event.key.toLowerCase() === 'i') toggleImage();
    if (event.key === 'Escape') {
      setPresentation(false);
      notes.hidden = true;
      document.getElementById('notes-toggle').setAttribute('aria-expanded', 'false');
    }
  });
  window.addEventListener('hashchange', () => {
    current = sceneIndex(window.location.hash, scenes);
    render();
  });
  render();
  if (presentationUrl.searchParams.get('live') === '1') setPresentation(true);
}

start().catch((error) => {
  screen.textContent = `Le support n'a pas pu être chargé. Rechargez la page depuis le serveur local. ${error.message}`;
  screen.setAttribute('role', 'alert');
});
