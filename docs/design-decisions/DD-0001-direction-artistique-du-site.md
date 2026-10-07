# DD-0001 — Direction artistique, nom et langue du site média

- Statut : partiellement remplacée par [DD-0002](DD-0002-charte-sandbox-bleu-nuit-cyan.md) pour l’identité visuelle
- Date : 2026-10-06
- Décidée par l'agent sur délégation (PD-0003)

## Contexte

Le site doit ressembler à un média tech indépendant, pas à une landing page ni à un blog. Public : développeurs, CTO, fondateurs, product managers, AI engineers, 25 à 55 ans. Interdits : dégradés violet/bleu génériques, boules 3D, glassmorphism, illustrations d'IA, robots, cerveaux à circuits, grilles futuristes, néons, phrases marketing creuses. Le numéro de classement doit devenir un élément graphique.

## Décisions

### Nom de la section : CHARTS

Candidats : CHARTS, RANKINGS, INDEX, TOP, RADAR. **CHARTS** est retenu : « les charts » est déjà le mot du public pour un classement hebdomadaire qui vit (Billboard), il est court, il se prononce, et il rend naturelle la question « il est combien cette semaine dans les charts ? ». Chaque classement garde un nom descriptif (« GitHub Top 10 », « AI Models Top 10 ») pour le SEO. Les URL des classements sont sous `/charts` ; les URL du prompt d'origine (`/rankings/…`) redirigent de façon permanente. Alternative écartée : INDEX, plus sérieux mais ambigu en français et moins évocateur du rythme hebdomadaire.

### Nom du site : « Hot Reload » (PLACEHOLDER)

Court, geek, et il dit ce que fait le site : tout se recharge chaque semaine. À remplacer sans effort : le nom, le logotype et les liens de diffusion sont dans `apps/site/src/config/site.ts`. Aucune vérification de disponibilité (marque, domaine, chaîne YouTube) n'a été faite. Les premiers contenus simulés utilisaient trois profils fictifs (Alex, Sam, Noa). Ils ont été retirés du backoffice le 2026-10-07 : Lou, Nicolas et Loïc sont les trois profils d'animation, et une signature « Équipe Sandbox » reste liée aux seuls contenus de démonstration pour éviter une attribution erronée.

### Langue : contenu en français, vocabulaire de structure en anglais

Le prompt mélange les deux (LATEST EPISODE, THIS WEEK, OUR TAKE, « Voir le Top 10 », « Dernière mise à jour : 6 octobre 2026 »). On en fait une règle : les libellés de structure (Latest, Charts, Episodes, THIS WEEK, OUR TAKE, DATA) restent en anglais, comme dans la presse tech, et tous les textes lus (descriptions, articles, avis, méthodologie, dates) sont en français (`lang="fr"`, dates en UTC). Les requêtes cibles en anglais (« best open source AI models ») passent par les titres et descriptions des pages de classement, qui contiennent ces expressions. Une version anglaise complète est une question ouverte ([open-questions.md](../open-questions.md)).

### Direction artistique : « le journal annoté »

- **Papier et encre.** Fond papier chaud (`#f3f0e8`), encre quasi noire (`#15140f`), filets de 2 à 4 px, angles droits, aucune ombre, aucun dégradé. Mode sombre inversé, choisi par le système ou par un bouton (mémorisé sans flash).
- **Un seul accent : le surligneur lime** (`#d4ff3a`), utilisé comme on surligne un texte imprimé : le #1, NEW, le logotype, l'état actif. Un second accent orange (`#ff5a36`) est réservé aux alertes de donnée simulée et au point des avis. Ni violet, ni bleu en dégradé, ni néon : un lime plat sur papier est un surligneur, pas un effet.
- **Trois voix typographiques**, une par rôle :
  - **Archivo** (variable, axe de chasse) : titres et numéros, très condensé et très gras ; interface en chasse normale.
  - **Newsreader** (serif, italique pour les avis) : lecture longue et OUR TAKE.
  - **JetBrains Mono** : tout ce qui est mesuré (étiquettes, valeurs, sources, dates).
- **Le numéro est l'image.** 01, 02, 03… à 9 rem, pleins pour le podium, détourés ensuite. Le #1 occupe toute une ligne surlignée. Les couvertures d'épisode sont typographiques (numéro géant et teinte), pas illustrées. Les logos sont des monogrammes colorés (aucun logo de marque reproduit, aucune image externe).
- **DATA ≠ OUR TAKE, par construction.** DATA : mono, filet gris à gauche, pastille `DATA` et provenance. OUR TAKE : carte à bordure pleine, serif italique, point orange, initiale et nom de l'auteur. Aucun composant commun, aucune page où les deux partagent une cellule.
- **Humour sans forcer** : micro-textes (404 « sortie du classement », « Il est combien cette semaine ? », « on a perdu une demi-heure dessus en studio »), jamais de blague dans la donnée.
- **Mouvement** : défilement lent du bandeau de la semaine (pause au survol), réordonnancement animé du tri par critère. Tout est désactivé si `prefers-reduced-motion` est demandé.

### Accessibilité retenue

Contrastes **calculés** sur les jetons (script jetable, WCAG 2) : texte principal 16:1, texte secondaire 8:1, texte tertiaire 4,7:1 sur le papier (le gris tertiaire a été assombri pour passer 4,5:1 sur le papier secondaire aussi), mouvements en hausse et en baisse 5,4:1 et 4,9:1 sur leur fond, encre sur surligneur 16:1 ; le mode sombre est au moins à 5,3:1 partout où l'on met du texte. L'orange d'accent (2,7:1 sur le papier) n'est **jamais** utilisé en texte : une version plus sombre (4,95:1) sert au texte et au contour de focus. Aussi : navigation au clavier, `aria-current`, `aria-pressed`, statuts annoncés, texte alternatif complet des graphiques, texte masqué pour les badges (« En hausse de 3 places »), lien d'évitement, focus visible, animations coupées avec `prefers-reduced-motion`.

**Non vérifié** : aucun audit WCAG complet, aucun test au lecteur d'écran, contrastes mesurés sur les jetons et non sur le rendu ; niveau cible encore ouvert ([open-questions.md](../open-questions.md)).

## Conséquences

- Le style est sans bibliothèque de composants : les classes de composants sont dans `globals.css`, le reste en utilitaires Tailwind. Changer de teinte, de police ou de nom ne demande pas de toucher aux pages.
- Quatre fichiers de polices variables (WOFF2, sous-ensemble latin) pèsent environ 250 Ko au total, servis depuis le domaine du site ; l'italique du serif n'est téléchargé que sur les pages qui l'utilisent. Aucune mesure de performance réelle n'a encore été faite.
- Le surligneur lime sur fond blanc ne passerait pas le contraste en texte : il n'est jamais utilisé comme couleur de texte sur papier, seulement comme fond sous une encre foncée.
