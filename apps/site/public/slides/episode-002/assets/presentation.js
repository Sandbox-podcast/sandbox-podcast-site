/* global document, window, history, location, Element, HTMLElement, setTimeout, clearTimeout */
(() => {
  'use strict';

  const data = JSON.parse(document.getElementById('deckData').textContent);
  const deck = document.querySelector('.deck');
  const counter = document.querySelector('.counter');
  const progress = document.querySelector('.progress-value');
  const overview = document.getElementById('slide-overview');
  const notes = document.getElementById('speaker-notes');
  const demo = document.getElementById('beta-demo-modal');
  const demoFrame = document.getElementById('beta-demo-frame');
  const demoClose = document.getElementById('beta-demo-close');
  const status = document.getElementById('status-message');
  let slides = Array.from(deck.querySelectorAll('.slide'));
  let current = 0;
  let annexesMounted = false;
  let demoTrigger = null;
  let presenter = null;
  let statusTimeout;
  let touchStart = null;

  const escape = (value = '') =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
    );

  const notify = (message) => {
    status.textContent = message;
    status.hidden = false;
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      status.hidden = true;
    }, 4000);
  };

  const noteMarkup = (slide) => {
    const sources = slide.sources
      .map((key) => data.sources[key])
      .filter(Boolean)
      .map(
        (source) =>
          `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>`,
      )
      .join('');
    return `<p class="small">Notes visibles uniquement dans cette vue.</p><h2>${escape(slide.title.replace(/\n/g, ' '))}</h2><p>${escape(slide.note).replace(/\n/g, '<br />')}</p>${slide.action ? `<h3>À faire</h3><p>${escape(slide.action)}</p>` : ''}${slide.transition ? `<h3>Transition</h3><p>${escape(slide.transition)}</p>` : ''}${sources ? `<h3>Sources</h3>${sources}` : ''}`;
  };

  const syncNotes = () => {
    const slide = data.slides[current];
    notes.innerHTML = noteMarkup(slide);
    if (presenter && !presenter.closed) {
      const body = presenter.document.getElementById('presenter-notes');
      if (body) body.innerHTML = noteMarkup(slide);
      const position = presenter.document.getElementById('presenter-position');
      if (position) position.textContent = counter.textContent;
    }
  };

  const mountAnnexes = () => {
    if (annexesMounted) return;
    deck.append(document.getElementById('annexes').content.cloneNode(true));
    slides = Array.from(deck.querySelectorAll('.slide'));
    annexesMounted = true;
  };

  const show = (index, updateHash = true) => {
    current = Math.max(0, Math.min(index, data.slides.length - 1));
    if (current >= data.meta.main) mountAnnexes();
    slides.forEach((slide, index) => {
      const active = index === current;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
    });
    counter.textContent =
      current < data.meta.main
        ? `${String(current + 1).padStart(2, '0')} / ${data.meta.main}`
        : `A${current - data.meta.main + 1} / ${data.meta.annexes}`;
    progress.style.width = `${(Math.min(current + 1, data.meta.main) / data.meta.main) * 100}%`;
    if (updateHash) history.replaceState(null, '', `#${current + 1}`);
    syncNotes();
  };

  const next = () => {
    if (current === data.meta.main - 1) {
      notify('Fin du support. O : toutes les slides.');
      return;
    }
    show(current + 1);
  };

  const fromHash = () => {
    const match = location.hash.match(/^#(?:slide-)?(\d+)$/);
    show(match ? Number(match[1]) - 1 : 0, false);
  };

  const openDemo = (trigger = document.activeElement) => {
    demoTrigger = trigger;
    if (!demoFrame.src) demoFrame.src = demoFrame.dataset.src;
    demo.hidden = false;
    demoClose.focus();
  };

  const closeDemo = () => {
    if (demo.hidden) return;
    demo.hidden = true;
    if (demoTrigger instanceof HTMLElement && demoTrigger.isConnected) demoTrigger.focus();
  };

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
      else await document.documentElement.requestFullscreen?.();
    } catch {
      notify('Le plein écran est indisponible. Utilise celui du navigateur.');
    }
  };

  const openPresenter = () => {
    if (presenter && !presenter.closed) {
      presenter.focus();
      return;
    }
    presenter = window.open('', 'sandbox-episode-002-notes', 'popup,width=850,height=800');
    if (!presenter) {
      notify('Fenêtre présentateur bloquée. N affiche les notes sur cet écran.');
      return;
    }
    presenter.document.write(
      '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Notes / Sandbox / Épisode 002</title><style>body{margin:0;padding:2rem;background:#05090d;color:#f4f7fa;font:18px/1.6 "Segoe UI",sans-serif}h2{line-height:1.15}h3,a{color:#ade9f9}a{display:block;margin-top:1rem}nav{position:sticky;top:0;padding:1rem;background:#05090d;border-bottom:1px solid #294457}button{padding:.6rem 1rem;margin-right:1rem;background:#0f1c26;color:#f4f7fa;border:1px solid #294457;cursor:pointer}</style></head><body><nav><button id="presenter-prev">Précédente</button><button id="presenter-next">Suivante</button><span id="presenter-position"></span></nav><main id="presenter-notes"></main></body></html>',
    );
    presenter.document.close();
    presenter.document.getElementById('presenter-prev').addEventListener('click', () => {
      show(current - 1);
    });
    presenter.document.getElementById('presenter-next').addEventListener('click', next);
    syncNotes();
  };

  document.querySelector('[data-action="previous"]').addEventListener('click', () => {
    show(current - 1);
  });
  document.querySelector('[data-action="next"]').addEventListener('click', next);
  document.querySelector('[data-action="fullscreen"]').addEventListener('click', fullscreen);
  document.querySelector('[data-action="close-overview"]').addEventListener('click', () => {
    overview.close();
  });
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest('[data-action="demo"]');
    if (trigger) openDemo(trigger);
    const link = event.target.closest('[data-go]');
    if (link) {
      show(Number(link.dataset.go));
      overview.close();
    }
  });
  demoClose.addEventListener('click', closeDemo);
  demo.addEventListener('click', (event) => {
    if (event.target === demo) closeDemo();
  });

  window.addEventListener('keydown', (event) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      closeDemo();
      overview.close();
      notes.hidden = true;
      return;
    }
    if (!demo.hidden || overview.open) return;
    if (key === ' ' && event.target.closest('button, a')) return;
    if (['arrowright', 'pagedown', ' '].includes(key)) {
      event.preventDefault();
      next();
    } else if (['arrowleft', 'pageup'].includes(key)) {
      event.preventDefault();
      show(current - 1);
    } else if (key === 'home') show(0);
    else if (key === 'end') show(data.meta.main - 1);
    else if (key === 'f') fullscreen();
    else if (key === 'd') openDemo();
    else if (key === 'o') overview.showModal();
    else if (key === 'a' && data.meta.annexes > 0)
      show(current < data.meta.main ? data.meta.main : data.meta.main - 1);
    else if (key === 'n') {
      notes.hidden = !notes.hidden;
      if (!notes.hidden) notify('Ces notes seront visibles si cet écran est partagé.');
    } else if (key === 'p') openPresenter();
  });
  window.addEventListener('hashchange', fromHash);
  window.addEventListener(
    'touchstart',
    (event) => {
      if (event.target.closest('button, a, input, dialog, iframe') || !demo.hidden) return;
      const touch = event.changedTouches[0];
      touchStart = { x: touch.clientX, y: touch.clientY };
    },
    { passive: true },
  );
  window.addEventListener(
    'touchend',
    (event) => {
      if (!touchStart) return;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(deltaX) < 75 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      if (deltaX < 0) next();
      else show(current - 1);
    },
    { passive: true },
  );
  fromHash();
})();
