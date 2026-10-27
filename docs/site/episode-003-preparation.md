# Épisode 003 : support actuel

Le support contient neuf écrans : les lobbies Introduction, Radar, Talk et Clash, trois actualités dans le Radar (Copilot Studio, Anthropic et Voxtral 3), une slide de cas d’usage dans le Talk et une question dans le Clash.

- **Introduction** : lobby de séquence.
- **Radar** : lobby, puis trois slides d’actualité : Microsoft Copilot Studio / Frontier (15 octobre 2026), l’impact de l’IA chez Anthropic (16 octobre 2026) et Voxtral 3 (20 octobre 2026).
- **Talk** : lobby, puis « J’ai intégré l’ensemble de notre catalogue produits dans un agent. Qu’est-ce que ça permet aux équipes ? »
- **Clash** : lobby, puis « En entreprise, peut-on vraiment mettre en production un produit développé en vibe coding ? »

Les anciens fichiers de préparation restent présents, mais le support ne les charge pas et n’affiche aucun de leurs sujets.

Les six illustrations de séquence et le schéma Voxtral sont décrits dans [la note de direction artistique](episode-003-direction-artistique.md).

## Ouvrir le support actuel

La slide Copilot Studio reprend l’[annonce Microsoft du 15 octobre](https://www.microsoft.com/en-us/copilot/blog/copilot-studio/delegate-shared-business-processes-to-agents-that-are-more-persistent-and-proactive-with-microsoft-copilot-studio/) : compte propre, mémoire du processus et déclencheurs dans le harnais GitHub Copilot. Le [programme Frontier](https://www.microsoft.com/en-us/copilot/resources/frontier-features?sortBy=newest-oldest#All-Frontier-features) donne accès à des fonctions expérimentales. Le navigateur cloud et les suggestions d’amélioration restent annoncés pour plus tard. Le visuel de mémoire provient de l’article Microsoft et figure dans `assets/sources/copilot-studio-memory.webp`. Les deux sources sont accessibles depuis la slide. À la demande de Lou, le visuel occupe l’essentiel de l’écran ; seuls le titre, les mots repères et le statut expérimental restent affichés. Les explications sont données à l’oral.

La slide Voxtral 3 reprend l’[annonce Mistral du 20 octobre](https://mistral.ai/news/voxtral-3/) et la [documentation Audio](https://docs.mistral.ai/studio/audio/overview). Elle distingue les modèles de transcription et de synthèse vocale du SDK Voice Agents, qui relie ces étapes à un modèle de langage et aux outils. Mistral indique que les modèles audio sont en préversion publique. Le schéma local `assets/voxtral-3-pipeline.svg` illustre cette chaîne ; il ne présente ni les modèles comme open source ni les performances annoncées comme mesurées par Sandbox.

Le sujet de Nico sur [le travail chez Anthropic](https://www.anthropic.com/research/employment-at-anthropic) suit Copilot Studio, à l’ancre `#anthropic-employment`. À la demande de Nico, il affiche uniquement le titre « Comment l’IA transforme Anthropic » et la phrase « Comment forme-t-on les futurs seniors à l’ère des agents IA ? ». Les chiffres, les précautions et le lien vers l’étude sont conservés dans les notes. Le bouton **Notes (N)** ouvre en régie le plan de discussion de 10 à 12 minutes, avec les relances pour Lou et Loïc et les limites de l’étude. Les notes se ferment au changement de slide et en mode live ; elles ne sont pas projetées dans ce mode. Elles restent visibles si l’on partage la régie avec le panneau ouvert.

Intégration demandée par Nico : une seule slide, reprenant le fond Radar et la typographie existante. Aucun nouveau sujet n’est ajouté au Talk ou au Clash. La légende Microsoft est désormais portée par ses propres données pour ne pas apparaître sur les autres actualités.

Depuis la racine du dépôt :

```powershell
python -m http.server 4334 --bind 127.0.0.1 --directory apps/site/public
```

Ouvrir <http://127.0.0.1:4334/slides/episode-003/index.html>.

Les flèches, Espace, Page précédente et Page suivante parcourent les neuf écrans. Le menu Diapositive donne un accès direct à chaque écran, dont les trois actualités du Radar. `P` active le mode live et `F` demande le plein écran.

## Préparation antérieure du 18 octobre — archive éditoriale

Les sections ci-dessous conservent la préparation antérieure. Elles ne décrivent pas le support actuel et aucun de leurs sujets n’est prévu dans cette version.

### Conducteur initial de 75 minutes

| Séquence             | Budget         | Contenu                                                         |
| -------------------- | -------------- | --------------------------------------------------------------- |
| Intro et transitions | 5 min          | Lancement et passages entre séquences                           |
| Radar                | 25 min         | Dix candidats disponibles, sélection par l'équipe               |
| Build                | 30 min maximum | Comprendre un skill avec le cas frontend-design et une page web |
| Clash                | 10 min         | Juniors, bulle financière et rémunération des créateurs         |
| Bêta                 | 5 min          | Une contrainte du public pour le prochain test, puis conclusion |

Le Radar est la seule variable : 10 minutes pour une émission d'une heure, 40 minutes pour atteindre 1 h 30. Ses dix candidats ne doivent pas tous être traités. Le Build reste plafonné à 30 minutes, lancement compris.

Quatre étapes pour ce seul Build : définir le skill (5 min), expliquer le cas de la page d'inscription Sandbox avec et sans frontend-design (10 min), présenter les vérifications de la page (10 min), distinguer demande, méthode et résultat (5 min). Le contenu projeté explique le sujet, sans demander de voter sur deux pages absentes. La comparaison reste à préparer, ce qui est indiqué sur les slides. À 25 minutes, conclure ; à 30 minutes, passer au Clash. Le [conducteur détaillé](../../apps/site/public/slides/episode-003/rundown.json) contient les consignes et les sources officielles Anthropic.

## Clash : trois controverses d'octobre

- L'IA va-t-elle sacrifier les juniors ? 4 minutes. L'étude Revelio Labs du 13 octobre sur les banques américaines ouvre le débat sur l'accès au métier et la formation. La baisse observée n'établit pas, seule, une causalité de l'IA.
- IA : révolution ou prochaine bulle Internet ? 3 minutes. Le point presse du FMI du 13 octobre, publié le 14, évoque le risque de correction. Une technologie utile peut aussi être survalorisée : les deux réponses ne sont pas exclusives.
- Faut-il payer les créateurs pour entraîner l'IA ? 3 minutes. La table ronde de l'Assemblée nationale du 14 octobre remet le sujet en discussion. La consultation européenne, publiée le 29 septembre et ouverte jusqu'au 3 novembre, apporte le contexte.

Chaque slide affiche le fait daté, deux arguments opposés et une relance concrète. Les sources et limites sont dans ses notes et dans `content.json`. Les arguments ne sont pas attribués aux animateurs ni aux personnes citées. La sélection s'appuie sur des travaux publiés, une discussion publique et un débat parlementaire ; ce n'est pas un classement mesuré des sujets les plus commentés. Le Clash couvre octobre jusqu'au 18, tandis que le Radar reste limité au 16-18 octobre.

## Ouvrir le support

Depuis la racine du dépôt :

```powershell
python -m http.server 4334 --bind 127.0.0.1 --directory apps/site/public
```

Ouvrir <http://127.0.0.1:4334/slides/episode-003/index.html>.

Les flèches, Espace, Page précédente et Page suivante changent de sujet. N ouvre les notes et sources. F active le plein écran. Début et Fin vont aux extrémités. Le menu Sujets donne un accès direct aux 21 écrans. Les liens Introduction, Radar, Talk et Clash ouvrent leurs pages lobby. Le choix "À trier", "Garder", "En réserve" ou "Écarter" concerne les dix actualités ; "Exporter nos choix" les télécharge dans un JSON. Les anciens choix de skills et de shorts sont conservés dans le navigateur, sans réintroduire ces sujets dans le conducteur. Il n'y a pas de partage des choix entre ordinateurs.

## Les dix actualités

La fenêtre demandée est le 16 au 18 octobre 2026 inclus. Le relevé au 18 octobre retient neuf annonces du 16 et une publication du 17. Aucun sujet n'est daté du 18 pour remplir artificiellement la sélection.

| Date  | Sujet                                              | Angle de discussion                                             |
| ----- | -------------------------------------------------- | --------------------------------------------------------------- |
| 17/10 | DeepSeek V4.1-Flash-1017                           | Que reste-t-il à payer quand les poids sont disponibles ?       |
| 16/10 | Quatre agents Gemini terminent Minecraft           | La coopération entre agents sur une tâche longue                |
| 16/10 | Claude Code réduit l'attente avant la réponse      | Les gains du logiciel autour du modèle                          |
| 16/10 | Cursor ajoute les Canvas aux agents cloud          | Voir et partager le travail d'un agent                          |
| 16/10 | Claude redessine des circuits quantiques           | Une IA qui peut évaluer ses propres propositions                |
| 16/10 | Reflection publie les poids de Beam                | L'accès aux poids et le coût de l'infrastructure                |
| 16/10 | Elorian présente Glimpse                           | Suivre des objets et comprendre une vidéo                       |
| 16/10 | Google Research présente des agents de laboratoire | L'IA qui agit avec des robots et des vérifications physiques    |
| 16/10 | Reason Network relie plusieurs agents              | Réduire les copies de messages entre outils                     |
| 16/10 | Anthropic réserve de la capacité au Canada         | L'électricité et les centres de données derrière les assistants |

Les URL, preuves de date, accroches de shorts, questions et réserves sont dans les notes de chaque écran et dans [le contenu du support](../../apps/site/public/slides/episode-003/content.json). Les captures sont des captures du navigateur prises le 18 octobre, pas des visuels fabriqués.

Le lancement de Reason est confirmé par sa publication officielle du 16 octobre, ouverte directement dans X. Le site de Reason confirme les fonctionnalités mais n'affiche pas de date.

Sujets écartés du Radar pendant la recherche : l'article sur la revue de code de Claude Code est daté du 15 octobre ; celui d'Apollo sur GLM-5.3 porte aussi la date du 15. Les reprises du 16 ou du 17 ne les font pas entrer dans la fenêtre. Les annonces Muse Wonder, Gemini 4 Argon et Maia déjà présentes dans l'épisode précédent ne sont pas reprises comme nouvelles sorties.

## Réserve de skills, hors conducteur

Seul frontend-design est retenu pour le Build de cet épisode. Les autres fiches et le top 10 restent dans `content.json`, hors du diaporama. Les nombres sont les installations cumulées arrondies affichées par [skills.sh](https://www.skills.sh/) au relevé du 18 octobre, pas une mesure d'usage actif.

| Skill                   | Rang affiché | Installations | Essai à filmer                                              |
| ----------------------- | ------------ | ------------- | ----------------------------------------------------------- |
| hyperframes             | 8            | 1,0 M         | Brief, vidéo, correction du texte                           |
| frontend-design         | 11           | 1,0 M         | Même brief et même modèle, avec et sans le skill            |
| agent-browser           | 4            | 1,2 M         | Une corvée de formulaire sur une page locale                |
| remotion-best-practices | 67           | 636,4 k       | Correction d'un titre animé dans un projet prêt             |
| grill-me                | 2            | 1,4 M         | Une question qui révèle le trou dans notre idée             |
| skill-creator           | 170          | 408,6 k       | Créer un skill sur une tâche et l'essayer sur un second cas |
| find-skills             | 1            | 3,9 M         | Trouver un candidat pour une vraie corvée                   |
| caveman                 | 75           | 579,2 k       | Comparer une réponse normale à une réponse très concise     |

Préparer uniquement le test frontend-design pour cet épisode. Les autres essais restent disponibles pour des émissions suivantes. Le choix du test est éditorial, pas une prédiction de vues.

Les fiches conservées ont une accroche proposée, la manipulation à montrer, un prompt de départ et une limite. Les prompts ne sont pas des commandes d'installation. Les skills ne sont pas installés pendant cette préparation.

## Ce qui a été regardé sur les réseaux

Recherche dans Instagram sur "claude skills", puis dans YouTube sur "claude skills shorts". Les pages publiques d'exemples Instagram et un Short sont ouverts directement. D'autres références YouTube proviennent du titre et du compteur de la recherche seulement. Le niveau de consultation est précisé dans les notes, sans prétendre avoir visionné toutes les vidéos.

- [le_raphine, quatre connecteurs](https://www.instagram.com/p/Dc_iVmXNLHN/) : légende consultée, publication du 7 septembre. Accroche impérative, démonstration de fonctions et demande de mot-clé. Les connecteurs cités ne sont pas tous des skills.
- [titouan.ia, Reels](https://www.instagram.com/p/Dei4k-wBCSC/) : publication affichée "il y a deux jours", environ 2,7 k mentions J'aime et 5,1 k commentaires. L'appel à commenter explique une partie possible de ces réactions. La date absolue n'a pas été vérifiée.
- [shuffle_developers, skills de design](https://www.instagram.com/p/DYvAm_iCUwE/) : légende consultée, publication du 24 mai, 68 mentions J'aime au relevé. Le format liste de skills ne suffit pas à établir une forte audience.
- [dr_cintas, motion design avec un skill](https://www.youtube.com/shorts/f2HUGag91Vk) : page et sous-titres partiels consultés, environ 65 k vues dans la recherche. Le skill exact et la date restent à vérifier avant de le citer à l'oral.
- [Les cinq meilleures compétences Claude](https://www.youtube.com/shorts/lipJRiztOgM) : environ 384 k vues affichées dans la recherche. Titre et compteur seuls, contenu non vérifié.
- [8 Claude Skills that actually matter](https://www.youtube.com/shorts/jDtLcMOLjIQ) : environ 245 k vues affichées dans la recherche. Titre et compteur seuls, contenu non vérifié.

Cet échantillon aide à choisir les angles. Les compteurs sont des observations arrondies à un instant donné. Les publications n'ont pas la même ancienneté et leur performance n'est pas normalisée par l'audience de leur auteur.

Pour les shorts Sandbox, montrer le résultat en premier, puis le test. Une accroche attire l'attention ; le résultat et sa limite doivent tenir dans la vidéo. Les promesses de gain par dix rencontrées dans les titres ne sont pas reprises comme des faits.

## À décider ensemble

Choisir les actualités à garder et préparer les deux versions du même test frontend-design. Les trois questions du Clash portent désormais sur l'actualité du mois, sans attribuer d'opinion à Lou, Loïc ou Nico. La Bêta demande au public un brief ou une contrainte pour la prochaine épreuve du même skill.

Décisions : [DD-0050](../design-decisions/dd-0050-episode-003-preparation-actu-et-skills.md) et [DD-0051](../design-decisions/dd-0051-episode-003-patterns-et-shorts.md). Lou demande le 18 octobre une PR unique pour cette V1, sans fusion ni déploiement en production.

## Vérification locale

Les tests de non-régression couvrent les quatre pages illustrées, les dix candidats du Radar inchangés, les trois questions de Clash, un seul sujet de Build en quatre étapes et la somme des budgets de temps. Les anciens choix restent conservés.

- Après clarification du Build et remplacement du Clash : les sept écrans modifiés sont parcourus dans le navigateur, sans débordement ni erreur de console. Les notes du Clash montrent les liens et les limites.
- 24 tests ciblés réussis. Ils vérifient aussi la définition avant la comparaison, les trois débats datés, leurs deux positions et leur budget total de dix minutes. `pnpm lint` réussit.
- `pnpm check` lancé, arrêté au formatage de `apps/site/src/domain/news-media.ts` et `apps/site/src/domain/news-preview.ts`, hors lot.
- `pnpm typecheck` lancé séparément, arrêté par TS2379 dans `apps/site/src/pipeline/news-media-preview.ts:82`, hors lot. Aucun de ces fichiers n'est modifié pour ce travail.
- Formatage des neuf fichiers de cette correction et contrôle de rédaction des nouveaux contenus réussis. La suite complète n'est pas relancée pour cette correction ; sa dernière exécution réussie, avant ces changements, comptait 740 tests du site, 7 du générique, 4 de jingles et 24 BIS.
- La recette précédente du conducteur raccourci vérifiait les 21 écrans à 1280 par 720, les quatre pages illustrées, la sauvegarde et l'export des dix candidats. La structure et les choix restent couverts par les tests de non-régression.

Captures de cette correction : `.local/episode-003-build-explique.jpg` et `.local/episode-003-clash-octobre.jpg`. Le support est vérifié ; les résultats du test frontend-design et son potentiel d'audience restent à constater.

Fichiers de cette correction : `rundown.json`, `content.json`, `model.js`, `show.js` et `show.css` dans `apps/site/public/slides/episode-003/`, test `apps/site/test/episode-003-slides.test.ts`, ce guide, analyse croisée et DD-0051. La PR V1 regroupe le dossier complet du support, son entrée dans l'index, ses tests et ses cinq documents de préparation. Les changements des autres travaux restent hors de cette PR. Prochaine étape éditoriale : préparer les deux pages si la comparaison est retenue, puis trier les actualités.

## Vérification de la V1 isolée

Le 18 octobre, le lot de 26 fichiers est repris dans un worktree dédié depuis `origin/main` (`5b43651`). Il n'embarque ni les changements News ni les autres travaux locaux. Les blocages de formatage et de types relevés dans le checkout partagé ne concernent donc pas cette branche.

- `pnpm check` réussit : formatage, lint, types et 742 tests au total (707 du site, 7 du générique, 4 des jingles et 24 BIS).
- `pnpm --filter @podcast/site build` réussit, avec 203 pages statiques générées.
- `pnpm audit --audit-level=high` ne relève aucune vulnérabilité connue.
- Le contrôle de rédaction des documents modifiés et `git diff --check` réussissent.

Ces contrôles précèdent la correction d'affichage live ci-dessous. La CI GitHub reste un contrôle distinct après l'envoi de la branche. Aucun résultat de la comparaison frontend-design ni aucune conversion en abonnés n'est validé par ces tests.

## Affichage pendant le live

Correction demandée avant la PR V1 : le support remplit la fenêtre sans limite de largeur à 1920 pixels ni hauteur minimale imposée. Le texte occupe 20 % de la largeur en paysage, à côté de l'image. En portrait, il passe sous l'image. Les captures ne sont ni déformées ni coupées ; un fond dérivé de la même image remplit l'espace restant.

- `P` ou le bouton "Mode live" masque les commandes. `P` ou Échap ramène la régie. Le bouton "Régie (P)" apparaît aussi au survol du coin supérieur droit ou au focus clavier.
- `F` ou "Plein écran" demande le plein écran du navigateur et active le mode live. Si le navigateur refuse, le support reste adapté à la fenêtre.
- `I` ou un clic sur l'image alterne entre image seule et image avec texte. Cette option est réservée au Radar ; elle est réinitialisée en quittant les actualités.
- Les flèches, Début, Fin et `N` pour les notes restent disponibles. Le lien `?live=1` ouvre directement le mode live.

Le lecteur s'adapte au rectangle partagé, pas au canevas du logiciel de diffusion. Si OBS ou un autre outil ajoute des bandes autour de la fenêtre capturée, il faut aussi ajuster cette source au canevas de diffusion. Aucun réglage de diffusion n'est modifié ici.

Recette de cette correction : les 21 écrans sont parcourus en 1280 par 720, 1920 par 1080, 2560 par 1440 et 3440 par 1440. Les 84 contrôles constatent une diapositive à la taille de la fenêtre, sans débordement et avec 80 % de largeur pour l'image sur les actualités. Le mode image seule, le retour régie, les notes et la sortie du Radar sont vérifiés. La régie reste dans la fenêtre en 1024 par 768, 712 par 1244 et 390 par 844. Les 26 tests ciblés du support et de l'index passent. Capture : `.local/episode-003-live-image.jpg`.

Le navigateur intégré n'accorde pas le plein écran natif pendant cette recette ; le repli en mode live dans la fenêtre est vérifié. La capture par le logiciel de diffusion reste à contrôler avant l'émission.

## Regroupement dans la PR unique

À la demande de Lou le 18 octobre, la PR 78 de l'épisode 003 est intégrée à la PR 77 avec News, le SEO et les contenus de relais. Les révisions éditoriales plus récentes de `content.json` et `shorts.json` sont conservées. La suite complète et les 84 contrôles live sont relancés sur le lot réuni ; voir [le rapport de regroupement](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/consolidation-pr77-78-2026-10-18.md).
