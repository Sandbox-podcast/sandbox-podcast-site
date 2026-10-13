# Nos projets

Catalogue : `/nos-projets`. Fiches : `/nos-projets/[slug]`. Décision : [DD-0018](../design-decisions/DD-0018-catalogue-nos-projets.md).

Les 34 fiches proviennent des sites publics, des dépôts et des annonces des créateurs, vérifiés le 13 octobre 2026. Les descriptions sont reformulées en français. Les sources précises de chaque fiche et de chaque image sont conservées dans [le catalogue JSON](../../apps/site/content/personal-projects.json).

## Inventaire

| Créateur             | Projets                                                                                                                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lou / loukan42       | Okodukai, Héros de la classe, Politiquizz, MindOdyssey, Not My Fault                                                                                                                                                                                                          |
| Loïc / azerothl      | Song Maker, Akasha, Akasha OS, Mission Maison, Akasha Code Studio, Rbitnet, Akasha Model, Akasha Companion                                                                                                                                                                    |
| Loïc / AkashaBot     | OpenClaw Offline Memory, LLM Router, ClawScope                                                                                                                                                                                                                                |
| Nicolas / MarlBurroW | Sillage, Boostback, BallCam.tv, Point Zero, Hivekeep, PinchChat, Three Observers, Aigora, Cloudflare DNS Swarm, Google Home Notification Gateway, Streamdeck Uptime Kuma, Raycast Uptime Kuma, TeamSpeak MCP, Bot Hub, Bot Chronicles, Cursor Chat, Rust Commander, ChromeHue |

Les attributions suivent les profils [Lou](https://github.com/loukan42), [Loïc](https://github.com/azerothl) et [Nicolas](https://github.com/MarlBurroW). Le [commentaire de Loïc](https://fr.linkedin.com/posts/louhusson_openclaw-moltbook-clawhub-chronologie-activity-7427969861684764672-0vj5) relie son travail à AkashaBot. Les sites BallCam, Boostback et Point Zero complètent les dépôts publics.

## Médias

88 images WebP sont enregistrées dans `apps/site/public/nos-projets`, dont 54 entrées de galerie. Douze captures supplémentaires ont été prises dans les applications publiques : BallCam, Boostback, Point Zero, Héros de la classe, Politiquizz, Mission Maison et Three Observers. Elles utilisent uniquement des écrans publics ou les données initiales de l'application.

Six vidéos sont présentes : Sillage, Hivekeep, Song Maker, Akasha Model, Okodukai et Not My Fault. Les quatre premières restent sur les fichiers publics stables des créateurs ; les deux dernières sont conservées localement, avec le lien de leur publication d'origine. Aucun iframe social n'est chargé.

Le film Song Maker est une présentation avec interface illustrative, conformément à son README. Il est étiqueté "Présentation du projet". Les deux captures natives de l'application sont distinctes. Les extraits Akasha Model illustrent des démonstrations choisies ; ils ne sont pas présentés comme des performances typiques. Les panneaux et illustrations de Not My Fault sont étiquetés comme visuels de présentation.

## Mise à jour

1. Modifier le JSON du catalogue et conserver les sources de chaque affirmation.
2. Ajouter les médias sous `public/nos-projets/<slug>/`, avec leur URL d'origine dans le JSON.
3. Employer `screenshot` pour une capture réelle et `artwork` pour une illustration. Ne pas déduire une vidéo d'un simple lien social.
4. Choisir la disponibilité vérifiée : site, installation, auto-hébergement, extension, code, préparation ou archive.
5. Lancer les tests, le contrôle du dépôt et le build. Ouvrir le catalogue et une fiche pour vérifier les médias.

Le schéma est dans `src/domain/personal-projects.ts`. La lecture du catalogue est dans `src/lib/personal-projects.ts`. Le JSON est intégré au build, sans appel réseau à la visite. Les sources externes ne sont pas du HTML exécuté par le site.

## Limites de la collecte

L'accès public à LinkedIn et X est partiel. Des publications non indexées, privées ou supprimées peuvent manquer. L'inventaire ne prétend pas couvrir ces contenus.

Les forks, dépôts vides, starters et travaux professionnels sont exclus. Les extensions de Hivekeep, Akasha, Offline Memory et ClawScope sont regroupées avec leur application. Le fork Song Maker de Lou reste attribué à Loïc. KinBot est regroupé avec Hivekeep.

Les projets suivants demandent une source produit ou une confirmation supplémentaire avant une fiche : Blind Piano, Warzone Challenge, Huetron/ChromeHue v3, ObsMania, SC2 LiveCenter, `personal_manager` et `customControls`. Les maquettes Song Maker et la capture ClawScope absente du dépôt n'ont pas été utilisées. Les anciens produits arrêtés de Lou ne sont pas présentés comme des applications actives.

Le site Aigora renvoie 404 ; sa fiche utilise GitHub. Akasha Code Studio ne dispose pas d'un package npm confirmé. Google Home Notification Gateway et Rust Commander sont des projets anciens : leur compatibilité actuelle n'est pas garantie. ChromeHue est explicitement archivé. MindOdyssey présente une bêta en préparation.

## Validation

Les tests du catalogue couvrent les attributions, les doublons, les URL HTTPS, les médias locaux, le croisement des filtres, les routes partagées, la recherche globale, le chargement des vidéos au clic et la CSP.

Vérifications navigateur effectuées : ouverture d'une fiche depuis le catalogue, recherche vide et remise à zéro, filtre Éducation avec créateur Lou, agrandissement et navigation entre captures, fermeture avec Échap et lecture du film Sillage. Le catalogue et la fiche ont été examinés à 390 pixels de large, sans débordement horizontal ni image manquante.

Validation sur la branche isolée : `pnpm check` complet réussi, avec 370 tests dans 64 fichiers. `pnpm build` réussi, avec 213 pages générées. Les 41 routes HTTP contrôlées répondent 200 ; une fiche inconnue répond 404. Le sitemap contient les 34 fiches. Les deux vidéos locales répondent 206 aux requêtes de lecture partielle.

Le premier contrôle du checkout principal rencontrait des fins de ligne Windows CRLF et plus de 5 000 fichiers de copies temporaires sous `.local`. Les vérifications finales ont été faites dans un worktree propre, avec des fins de ligne LF, sans désactiver de règle ni inclure ces copies dans la PR.

Captures du build de production : [catalogue](nos-projets/catalogue-desktop.jpg) et [fiche Sillage](nos-projets/fiche-desktop.jpg).
