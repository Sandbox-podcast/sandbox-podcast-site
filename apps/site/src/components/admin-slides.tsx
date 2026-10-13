'use client';

import { useState } from 'react';

/** Consultation des supports statiques dans l'admin ; leur JavaScript reste isolé. */
export function AdminSlides() {
  const [indexRevision, setIndexRevision] = useState(0);

  return (
    <>
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow">Supports des épisodes</span>
          <h2 id="admin-section-title">Slides</h2>
        </div>
        <a className="btn" href="/slides/index.html" target="_blank" rel="noopener noreferrer">
          Ouvrir en grand ↗
        </a>
      </div>
      <p className="admin-slides-guide">
        Choisissez une présentation dans la liste ci-dessous. Elle s’ouvre dans cet aperçu ;
        utilisez les flèches du clavier pour avancer ou revenir.
      </p>
      <button
        className="btn admin-slides-reset"
        type="button"
        onClick={() => {
          setIndexRevision((revision) => revision + 1);
        }}
      >
        Revenir à la liste des présentations
      </button>
      <div className="admin-slides-frame">
        <iframe
          key={indexRevision}
          title="Aperçu des présentations des épisodes"
          src="/slides/index.html"
          sandbox="allow-scripts"
          loading="lazy"
          allow="fullscreen"
        />
      </div>
    </>
  );
}
