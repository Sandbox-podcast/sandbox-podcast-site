import { sourceMedia } from './media.js';
export const escapeText = (value = '') =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
const e = escapeText;
export const useCases = [
  {
    sector: 'Boutique',
    title: 'Carte de fidélité + SMS',
    action:
      "Une carte sur téléphone, reliée à une base clients : achats, points et dernier passage. L'IA prépare les SMS de relance des clients qui ne sont pas revenus. Vous validez l'envoi.",
    gain: 'Faire revenir vos clients avec une offre qui leur correspond.',
    note: "Créer avec l'IA une application de fidélité : inscription par QR code, fiche client, achats, solde de points et récompenses. Les règles calculent les points et repèrent les clients à recontacter ; l'IA aide à rédiger les SMS. Une base de données et un service d'envoi SMS sont nécessaires. Prévoir l'accord aux SMS, la désinscription et une validation avant envoi. Mesurer les retours et la marge après remise et coût SMS.",
  },
  {
    sector: 'Agence immobilière',
    title: 'Un bien à explorer en 3D',
    action:
      "Une vitrine où l'acheteur explore les pièces et compare plusieurs aménagements. L'IA propose des versions meublées ; le site affiche le bien en 3D à partir de plans et de relevés.",
    gain: 'Aider les acheteurs à se projeter avant de se déplacer.',
    note: "Créer une page par bien avec visite 3D, plans, photos réelles et propositions d'aménagement. L'IA peut aider à coder la vitrine et produire des visuels de décoration. La géométrie fidèle nécessite des plans, un relevé ou un modèle 3D vérifié ; une simple image générée ne garantit ni dimensions ni conformité du bien. Distinguer l'état réel des simulations de décoration. Mesurer la qualité des demandes de visite.",
  },
  {
    sector: 'Restaurant',
    title: 'Le menu en 3D',
    action:
      "Le client scanne un QR code et découvre les plats en 3D avant de commander. Vous créez la carte avec l'IA et y intégrez les modèles de vos vrais plats.",
    gain: 'Montrer les portions et donner envie de découvrir vos spécialités.',
    note: "Créer une carte mobile avec vues 3D des plats, descriptions traduites et informations vérifiées par le restaurant. Les modèles doivent être produits à partir des plats réels, puis vérifiés ; ils ne sont pas fournis par le lecteur 3D. L'IA aide à créer le site et les descriptions. Ne pas lui confier la détermination des allergènes. Vérifier les temps de chargement sur téléphone. Mesurer les commandes des spécialités mises en avant.",
  },
  {
    sector: 'Menuisier',
    title: 'Son meuble, chez lui',
    action:
      "Un configurateur créé avec l'IA : le client choisit les dimensions, le bois et les rangements. Il visualise le meuble dans sa pièce et vous transmet son projet.",
    gain: 'Un projet précis à discuter, sans multiplier les croquis et les allers-retours.',
    note: "Construire un configurateur à partir d'un catalogue de matériaux, dimensions et assemblages réalisables. Le rendu peut être une scène 3D ou une simulation sur photo. L'IA aide à développer l'interface et transforme les choix du client en brief. Les règles métier, dimensions, prix et faisabilité restent validés par le menuisier. Mesurer le temps pour parvenir à un projet accepté.",
  },
  {
    sector: 'Garage',
    title: 'La réparation expliquée',
    action:
      "Vous photographiez la pièce usée et dictez votre diagnostic. L'IA prépare une explication illustrée. Le client consulte les photos, comprend le travail et valide l'intervention depuis son téléphone.",
    gain: 'Moins de temps au téléphone pour expliquer et faire accepter le travail.',
    note: "Créer un espace client avec photos de l'intervention, explications simples, prix et accord du client. L'IA reformule le diagnostic dicté par le mécanicien ; elle ne pose pas le diagnostic et ne décide pas des réparations. Les photos authentiques restent consultables. Le garagiste valide le texte et le montant avant partage. Mesurer les délais d'accord et le temps passé en explications.",
  },
  {
    sector: 'Fleuriste',
    title: 'Son bouquet sur mesure',
    action:
      "Le client indique l'occasion, les couleurs et son budget. À partir de vos fleurs disponibles, l'IA propose des compositions avec un aperçu. Vous confirmez le bouquet avant la commande.",
    gain: 'Vendre du sur-mesure en ligne, même quand la boutique est fermée.',
    note: "Créer un assistant de commande relié à un catalogue de fleurs disponibles et à leurs prix. L'IA propose une composition selon l'occasion et le budget, avec un aperçu identifié comme une simulation. Le stock, les substitutions et la composition finale sont confirmés par le fleuriste. Le site peut recueillir les demandes hors horaires d'ouverture. Mesurer les commandes qualifiées et le temps de préparation du brief.",
  },
  {
    sector: 'Boulangerie',
    title: 'Le plan de cuisson du jour',
    action:
      "L'outil croise vos ventes, vos invendus, la météo et le calendrier. Il propose combien de pains et de viennoiseries préparer, et à quelles heures lancer les fournées. Vous ajustez.",
    gain: 'Moins de produits jetés, sans vider les rayons trop tôt.',
    note: "Créer avec l'IA un outil de prévision par produit et créneau à partir de l'historique de caisse, des invendus et du calendrier. La prévision nécessite des données fiables et une évaluation face aux habitudes du boulanger. Les capacités du four, les temps de préparation et les contraintes de travail bornent les propositions. Le boulanger valide le plan. Le gain est un objectif à mesurer, pas un résultat garanti : suivre invendus, ruptures et charge de travail.",
  },
  {
    sector: 'Salon de coiffure',
    title: 'Essayer avant de couper',
    action:
      "Avec une photo, le client essaie plusieurs coupes et couleurs générées par l'IA. Il enregistre son choix et vous l'envoie avec sa demande de rendez-vous.",
    gain: "Se mettre d'accord sur le résultat souhaité avant de commencer.",
    note: "Créer un essayage visuel sur photo avec un modèle de génération ou d'édition d'image. L'aperçu est une simulation, pas une garantie de résultat : texture du cheveu, coupe possible et coloration sont discutées avec le professionnel. Prévoir l'accord pour utiliser la photo, sa suppression et une réservation associée au choix du client. Mesurer la préparation de la consultation et les demandes de rendez-vous.",
  },
];
const svg = (body, label) =>
  `<svg viewBox="0 0 600 480" role="img" aria-label="${e(label)}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="surface" x2="1" y2="1"><stop stop-color="#1c3643"/><stop offset="1" stop-color="#09131a"/></linearGradient></defs>${body}</svg>`;
const label = (x, y, text, size = 16, fill = 'currentColor') =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" text-anchor="middle" font-family="Archivo, sans-serif">${e(text)}</text>`;
const frame = (x, y, w, h) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="url(#surface)" stroke="currentColor" stroke-opacity=".4"/>`;

export function visualFor(scene, step) {
  switch (scene.kind) {
    case 'orbit':
      return `<div class="agent-orbit"><div class="orbital-path path-one"></div><div class="orbital-path path-two"></div><div class="agent-core"><small>META</small><strong>Muse<br/>Wonder</strong></div>${['Planifier', 'Coder', 'Agir'].map((name, i) => `<div class="satellite satellite-${i} ${step === i ? 'selected' : ''}"><span>0${i + 1}</span>${name}</div>`).join('')}<span class="diagram-caption">TÂCHES LONGUES / SOUS-AGENTS / OUTILS</span></div>`;
    case 'context':
      return `<div class="context-stack">${Array.from({ length: 6 }, (_, i) => `<div class="document-sheet" style="--i:${i}"><span>${['CODE', 'DOCUMENTS', 'CONTEXTE', 'RAISONNEMENT', 'OUTILS', 'GEMINI 4 ARGON'][i]}</span><i></i><i></i><i></i></div>`).join('')}<div class="context-number"><strong>1 M</strong><span>tokens annoncés</span></div></div>`;
    case 'network':
      return svg(
        `<g stroke="currentColor" stroke-opacity=".35" stroke-width="2">${[
          [120, 90],
          [300, 60],
          [480, 90],
          [90, 230],
          [510, 230],
          [120, 380],
          [300, 410],
          [480, 380],
        ]
          .map(([x, y]) => `<path class="network-line" d="M300 230 L${x} ${y}"/>`)
          .join('')}</g>${[
          [120, 90],
          [300, 60],
          [480, 90],
          [90, 230],
          [510, 230],
          [120, 380],
          [300, 410],
          [480, 380],
        ]
          .map(
            ([x, y], i) =>
              `<g class="network-node" style="--i:${i}">${frame(x - 37, y - 28, 74, 56)}${label(x, y + 6, ['PC', 'BOX', 'TV', 'NAS', 'IoT', 'PC', 'IoT', 'NAS'][i], 17)}</g>`,
          )
          .join(
            '',
          )}<circle cx="300" cy="230" r="76" fill="#102732" stroke="currentColor" stroke-width="2"/>${label(300, 220, '9 Md', 38)}${label(300, 250, 'paramètres', 16)}${label(300, 470, 'SCHÉMA DU RISQUE ÉTUDIÉ', 12)}`,
        'Modèle relié à huit appareils, schéma du risque étudié en laboratoire',
      );
    case 'terminal':
      return `<div class="terminal"><div class="terminal-bar"><i></i><i></i><i></i><span>AGENT / ÉVALUATION</span></div><div class="terminal-body"><p class="muted">&gt; Objectif : terminer la tâche</p><p>Vérification des permissions<span class="code-status">ACCÈS REFUSÉ</span></p><div class="terminal-barrier">RESTRICTION</div><div class="detour"><span></span>Autre voie empruntée</div><p class="terminal-result">${['Exécution de commandes', 'Accès à des données protégées', 'Persistance malgré le blocage'][step]}</p><small>Illustration des cas rapportés par Anthropic</small></div></div>`;
    case 'chip':
      return `<div class="chip-board"><div class="chip-traces">${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div><div class="chip"><small>MICROSOFT / AZURE</small><strong>MAIA<br/><em>300</em></strong><span>INFÉRENCE</span></div><div class="chip-year">2027 <span>FEUILLE DE ROUTE</span></div></div>`;
    case 'glasses':
      return svg(
        `<path d="M65 185 Q90 150 245 175 Q300 195 355 175 Q510 150 535 185 L515 285 Q500 325 375 305 L335 230 Q300 210 265 230 L225 305 Q100 325 85 285 Z" fill="url(#surface)" stroke="#b1d7df" stroke-width="10"/><path d="M84 194 L35 128 M516 194 L565 128" stroke="#b1d7df" stroke-width="14"/><path d="M105 200 Q160 180 242 200 L215 277 Q160 301 105 277 Z M358 200 Q440 180 495 200 L495 277 Q440 301 385 277 Z" fill="#47d7f4" opacity=".12"/><circle cx="505" cy="182" r="10" fill="#ff725e" class="record-dot"/><path d="M505 160 V85 H350" stroke="#ff725e" fill="none"/>${label(412, 70, 'CAMÉRA PORTÉE', 17, '#ff9f90')}${label(300, 382, ['Qui est filmé ?', 'Soins / écoles / vestiaires', 'Comment rendre la captation visible ?'][step], 24)}`,
        'Lunettes avec caméra et témoin de captation',
      );
    case 'reverse':
      return `<div class="reverse-lab"><div class="mini-game"><span>DX-BALL / ORIGINAL</span><div class="bricks">${'<i></i>'.repeat(15)}</div><b class="game-ball"></b><i class="paddle"></i></div><div class="reverse-link"><span>OBSERVER</span><i></i><span>RECONSTRUIRE</span></div><div class="mini-game rebuilt"><span>FONCTION RECONSTRUITE</span><div class="bricks">${'<i></i>'.repeat(15)}</div><b class="game-ball"></b><i class="paddle"></i></div><small>Schéma illustratif du principe. Pas une capture de REA.</small></div>`;
    case 'film':
      return `<div class="film-desk"><div class="clapper"><div class="clapper-top"></div><span>CLAUDE CODE × RUNWAY</span><strong>PLAN <em>0${step + 1}</em></strong><div>GÉNÉRER / SÉLECTIONNER / MONTER</div></div><div class="film-strip">${['API + SKILLS', 'MCP CLAUDE', 'STUDIO RUNWAY'].map((s, i) => `<div class="film-frame ${step === i ? 'selected' : ''}"><i></i><span>${s}</span></div>`).join('')}</div></div>`;
    case 'fridge':
      return svg(
        `${frame(125, 50, 350, 365)}<rect x="149" y="78" width="302" height="78" rx="7" fill="#080d10"/>${label(300, 137, '50 °C', 62, '#ff725e')}<g fill="#071720" stroke="#3d7d8c"><rect x="148" y="180" width="143" height="200" rx="4"/><rect x="307" y="180" width="143" height="200" rx="4"/></g><g stroke="#7a9ba7" stroke-width="3">${[230, 290, 350].map((y) => `<path d="M160 ${y} H280 M320 ${y} H438"/>`).join('')}<path d="M277 250 V278 M320 250 V278"/></g><g stroke="#ff725e" stroke-width="3" fill="none" class="heat">${[200, 300, 400].map((x) => `<path d="M${x} 345 Q${x - 30} 315 ${x} 280 Q${x + 30} 245 ${x} 210"/>`).join('')}</g>${label(300, 459, 'TEMPÉRATURE RAPPORTÉE, PAS UNE TÉLÉMÉTRIE', 12)}`,
        'Chambre froide et température rapportée de 50 degrés',
      );
    case 'conversation':
      return `<div class="conversation"><div class="speech human"><small>UNE PERSONNE</small><strong>Sa théorie.<br/>Ses arguments.</strong></div><div class="speech ai"><small>GPT-4 TURBO</small><strong>Une réponse<br/>personnalisée.</strong></div><div class="study-result"><strong>~20<span>%</span></strong><div>Baisse moyenne rapportée<br/><b>Étude sous examen éditorial</b></div></div></div>`;
    default:
      return '';
  }
}

export function shopVisual() {
  return `<div class="shop"><div class="awning">${'<i></i>'.repeat(9)}</div><div class="shop-sign">VOTRE COMMERCE</div><div class="shop-front"><div class="shop-window"><span>Un besoin<br/>concret.</span><i></i><i></i><i></i></div><div class="shop-door"><div>OUVERT</div><i></i></div></div><div class="shop-base"></div><span class="shop-caption">UNE TÂCHE RÉPÉTITIVE / UN OUTIL UTILE</span></div>`;
}

export function renderScene(scene, state, episode, chapter) {
  const source = episode.original.slides.find((s) => s.n === scene.originalNumber);
  const originalTitle = source?.title ?? scene.title;
  if (scene.kind === 'opener')
    return `<div class="opener opener-${scene.chapter}"><img class="chapter-art" src="./assets/${e(chapter.image)}" alt=""/><div class="opener-shade"></div><div class="opener-copy"><p class="eyebrow">SÉQUENCE 0${['radar', 'build', 'clash', 'beta'].indexOf(scene.chapter) + 1}</p><h1>${e(chapter.label).replace(' ', '<br/>')}</h1><p>${e(chapter.cue)}</p><div class="opener-line"></div></div><div class="chapter-index">0${['radar', 'build', 'clash', 'beta'].indexOf(scene.chapter) + 1}</div><div class="opener-bottom"><span>LOU / LOÏC / NICO</span><span>${scene.chapter === 'radar' ? '10 SUJETS À EXPLORER' : scene.chapter === 'build' ? 'OUTILS / CAS D’USAGE / MÉTHODE' : scene.chapter === 'clash' ? 'TICKETS / LEGACY / CODE / MÉTIER' : 'VOS IDÉES / VOS PROCHAINS ESSAIS'}</span></div></div>`;
  if (scene.kind === 'debate')
    return `<div class="debate-scene"><div class="debate-background" aria-hidden="true">?</div><p class="eyebrow">QUESTION 0${scene.originalNumber - 18} / 04</p><h1>${e(originalTitle)}</h1><div class="host-positions">${['Lou', 'Loïc', 'Nico'].map((host) => `<div class="host-position ${state.speaker === host ? 'speaking' : ''}"><span class="host-initial">${host === 'Loïc' ? 'Lo' : host[0]}</span><div><strong>${host}</strong><span class="position ${state.positions[scene.id]?.[host] ? 'chosen' : ''}">${e(state.positions[scene.id]?.[host] || 'À vous de répondre')}</span></div></div>`).join('')}</div><div class="debate-footer"><span>LES POSITIONS SE CONSTRUISENT EN DIRECT</span><span id="debate-timer"></span></div></div>`;
  if (scene.kind === 'shop')
    return `<div class="shop-scene"><div class="shop-copy"><p class="eyebrow">ARTISANS / COMMERÇANTS</p><h1>L'IA, dans<br/>votre quotidien.</h1><p>${e(originalTitle)}</p><span class="minimal-rule">Une tâche répétitive.<br/>Un premier essai en local.</span></div>${shopVisual()}</div>`;
  if (scene.kind === 'uses') {
    const item = useCases[state.step];
    return `<div class="uses-scene"><div class="uses-list"><p class="eyebrow">8 MÉTIERS / 8 IDÉES À CRÉER</p><h1>Où l'IA<br/>vous aide.</h1>${useCases.map((it, i) => `<button class="use-option ${i === state.step ? 'active' : ''}" data-step="${i}"><span>0${i + 1}</span>${e(it.sector)}</button>`).join('')}</div><div class="use-detail"><span class="big-index">0${state.step + 1}</span><div class="use-detail-copy"><p class="eyebrow">${e(item.sector)} / À CRÉER AVEC L'IA</p><h2>${e(item.title)}</h2><p class="use-action">${e(item.action)}</p><div class="measure"><span>CE QUE VOUS GAGNEZ</span><strong>${e(item.gain)}</strong></div></div></div></div>`;
  }
  if (scene.kind === 'tools') {
    const item = source.items[state.step];
    return `<div class="tools-scene"><p class="eyebrow">LES OUTILS POUR CRÉER SON APPLICATION</p><div class="tool-focus"><span class="tool-number">0${state.step + 1}</span><div><h1>${e(item[0])}</h1><h2>${e(item[1])}</h2><p>${e(item[2])}</p></div></div><div class="tool-track">${source.items.map((item, i) => `<button data-step="${i}" class="${i === state.step ? 'active' : ''}"><span>0${i + 1}</span><strong>${e(item[0])}</strong><small>${e(item[1])}</small></button>`).join('')}</div><p class="tool-caveat">Un besoin simple, une première version locale. Données clients et accès viennent ensuite.</p></div>`;
  }
  if (scene.kind === 'method') {
    const phases = [
      [
        'Décrire.',
        'ChatGPT : préparer le brief',
        'Je suis fleuriste. Pose-moi les questions utiles, puis rédige un brief pour créer mon application.',
        'Métier, utilisateurs, tâche, règles, limites et résultat attendu.',
      ],
      [
        'Montrer.',
        'Donner des références',
        "Joignez une capture, nommez ce qu'il faut reprendre et fournissez votre vrai logo.",
        'Mobbin : applications. Landbook : sites web.',
      ],
      [
        'Tester.',
        'Codex : construire en local',
        'Vous cliquez. Vous vérifiez. Vous ajustez.',
        'Ouvrir un dossier, coller le brief, joindre les exemples. Corriger une chose à la fois.',
      ],
    ];
    const p = phases[state.step];
    return `<div class="method-scene"><div><p class="eyebrow">LA MÉTHODE / 0${state.step + 1}</p><h1>${e(p[0])}</h1><h2>${e(p[1])}</h2><p>${e(p[3])}</p></div><div class="prompt-paper"><span>EXEMPLE / À ADAPTER À VOTRE MÉTIER</span><blockquote>${e(p[2])}</blockquote><div>APPLICATION : ÉCRANS ET PARCOURS<br/>VISUEL : FORMAT, STYLE ET TEXTE<br/>VIDÉO : DURÉE, SCÈNES ET RYTHME</div></div><div class="method-track">${phases.map((p, i) => `<button data-step="${i}" class="${i === state.step ? 'active' : ''}">0${i + 1} ${e(p[0])}</button>`).join('')}</div></div>`;
  }
  if (scene.kind === 'comments')
    return `<div class="comments-scene"><p class="eyebrow">ON CONTINUE EN COMMENTAIRE</p><h1>Votre métier.<br/>Votre idée.<br/><em>Votre question.</em></h1><div class="comment-box"><span>VOTRE PROCHAIN MESSAGE</span><p>Je suis <b>[votre métier]</b>,<br/>j'aimerais automatiser <b>[votre tâche]</b>.</p><div>Posez vos questions en commentaire.</div></div><p class="comments-foot">On vous aide à créer votre propre application.</p></div>`;
  const item = source.items[state.step];
  const media = sourceMedia[scene.id];
  if (media) {
    const detail = state.view === 'zoom' && media.detail;
    return `<div class="source-scene ${state.view === 'zoom' ? 'source-zoom' : ''} ${state.view === 'fact' ? 'source-fact' : ''}"><div class="source-window"><div class="source-address"><span class="source-light"></span><span>${e(media.publisher)}</span><span>${e((detail ? media.detailUrl : media.url).replace('https://', ''))}</span></div><div class="source-image"><img src="./assets/sources/${e(detail || scene.id + '.jpg')}" alt="Capture réelle : ${e(media.title)}" style="--focus:${e(media.focus)}" class="${detail ? 'detail-capture' : ''}"/><div class="source-number"><strong>${e(scene.figure)}</strong><span>${e(scene.unit)}</span></div></div><div class="source-credit"><span>CAPTURE DU 16.10.2026</span><span>${detail ? 'AVIS ÉDITORIAL' : 'SOURCE DU SUJET'}</span></div></div><div class="source-caption"><p class="eyebrow">RADAR / ${String(scene.originalNumber - 1).padStart(2, '0')}</p><h1>${e(scene.title)}</h1><div class="source-caption-rule"></div><span class="eyebrow">POINT 0${state.step + 1}</span><h2>${e(item?.[0])}</h2><p>${e(item?.[1])}</p></div><div class="news-context"><span class="context-tag">LE CONTEXTE</span><p>${e(scene.caution)}</p><div class="point-dots">${source.items.map((_, i) => `<button data-step="${i}" aria-label="Afficher le point ${i + 1}" aria-pressed="${i === state.step}" class="${i === state.step ? 'active' : ''}"></button>`).join('')}</div></div></div>`;
  }
  return `<div class="news-scene kind-${scene.kind} ${state.view === 'fact' ? 'fact-view' : ''}"><div class="news-copy"><p class="eyebrow">${e(scene.mark)} <span> / ${String(scene.originalNumber - 1).padStart(2, '0')}</span></p><h1>${e(scene.headline)}</h1><div class="active-point" key="${state.step}"><span class="point-number">0${state.step + 1}</span><div><h2>${e(item?.[0])}</h2><p>${e(item?.[1])}</p></div></div></div><div class="news-visual">${visualFor(scene, state.step)}<div class="fact-overlay"><strong>${e(scene.figure)}</strong><span>${e(scene.unit)}</span></div></div><div class="news-context"><span class="context-tag">LE CONTEXTE</span><p>${e(scene.caution)}</p><div class="point-dots">${source.items.map((_, i) => `<button data-step="${i}" aria-label="Afficher le point ${i + 1}" aria-pressed="${i === state.step}" class="${i === state.step ? 'active' : ''}"></button>`).join('')}</div></div></div>`;
}
