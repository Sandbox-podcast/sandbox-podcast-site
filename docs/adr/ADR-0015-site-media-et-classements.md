# ADR-0015 — Site média et classements : Next.js, contenu dans Git, snapshots immuables

- Statut : acceptée ; la section administration est remplacée par [ADR-0016](ADR-0016-administration-editoriale-vercel.md)
- Date : 2026-10-06
- Décidée par l'agent sur délégation (PD-0003)

## Contexte

Le propriétaire a demandé un site web pour un podcast tech animé par trois personnes : pas une landing page, pas un blog, mais un média tech dont les classements hebdomadaires (GitHub, skills et agents, modèles IA, modèles open source) deviennent une référence, avec historique, méthodologie publique, avis de l'équipe séparés des données, fiches d'entités reliées aux épisodes et aux articles, SEO et partage social. Une première version complète et navigable était demandée, avec des données simulées clairement identifiées.

Ce produit est distinct de la plateforme de production de podcasts ([ADR-0001](ADR-0001-stack-applicative-et-monorepo.md) à [ADR-0014](ADR-0014-application-web-sans-framework.md)). Il partage le dépôt, l'outillage et les conventions.

## Question posée

Quelle architecture pour un site média qui doit durer plusieurs années, sans sur-ingénierie au MVP, avec des données qui changent chaque semaine et ne doivent jamais être réécrites ?

## Facteurs de décision

Historique immuable des classements. Séparation stricte donnée / avis. Aucune donnée inventée. Maintenabilité par des développeurs. SEO et performance. Pas de compte, de service payant ni d'hébergement à engager sans le propriétaire. Possibilité de passer plus tard à une base de données sans tout réécrire.

## Options considérées

- A. **Next.js + Supabase (PostgreSQL) dès le départ**, administration par formulaires. Fidèle à la stack suggérée. Demande un compte et un projet cloud (décision réservée au propriétaire), de l'authentification, des migrations, et un serveur ou des fonctions pour le rendu. Surdimensionné pour 4 classements et 3 animateurs.
- B. **Next.js statique, contenu en JSON dans Git, validé par Zod.** Pas de service externe, historique de contenu gratuit (Git), relecture par pull request, rendu statique rapide. L'édition passe par des fichiers et des scripts, pas par un formulaire.
- C. **CMS headless** (Sanity, Contentful…). Édition confortable, mais un compte, un coût, un modèle de données propriétaire, et les classements (données calculées, snapshots) n'y ont pas leur place.

## Décision

Option B, avec un modèle de données pensé pour migrer vers l'option A.

1. **Application `apps/site`**, Next.js 16 (App Router, génération statique), TypeScript strict, Tailwind CSS 4. Conforme à l'ADR-0001 (qui citait Next.js) ; l'ADR-0014 ne s'applique pas, il concernait l'interface de la plateforme.
2. **Contenu dans `content/`** (fichiers JSON : classements, profils de scoring, entités, avis, épisodes, articles, animateurs, thèmes, sources) et **données dans `data/snapshots/`** (un fichier par classement et par semaine). Tout est lu et validé par Zod (`src/lib/load.ts`), puis par un contrôle de références et de continuité (`src/lib/validate.ts`). Le build échoue si le contenu est invalide.
3. **Snapshots immuables.** Le pipeline (`src/pipeline`, `scripts/week-run.ts`) écrit un snapshot par semaine et refuse d'en écrire un second. Les mouvements, séries et statistiques sont **dérivés à la lecture**, jamais stockés.
4. **Scoring déclaratif.** Un profil de scoring (métriques, dérivées, dimensions, échelles, poids) décrit le calcul ; le même profil génère la page méthodologie. Fonctions pures, testées.
5. **Connecteurs derrière une interface** (`Connector`). Seul `mock` existe. Les données de démonstration portent `provenance: mock`, un bandeau permanent et **bloquent l'indexation** (robots, `noindex`, sitemap vide) tant que `SITE_DATA_MODE` n'est pas `live`.
6. **Pas de HTML utilisateur.** Les articles sont des blocs typés ; le balisage en ligne est parsé en nœuds React, les URL `javascript:`, `data:` et `http:` sont refusées (AGENTS.md : « tout HTML utilisateur s'exécute dans un contexte isolé » devient « il n'y en a pas »).
7. **Administration initiale** : page `/admin` en lecture seule, scripts `content:new`, `content:check`, `week:run`. Cette partie est remplacée par [ADR-0016](ADR-0016-administration-editoriale-vercel.md) : édition authentifiée et publication privée sur Vercel Blob.
8. **Aucune dépendance de composants externes** : graphiques en SVG serveur, pas de bibliothèque d'icônes ni de graphiques, polices Fontsource auto-hébergées (pas d'appel à Google Fonts), lecteur YouTube en façade (aucune requête avant le clic).

## Conséquences

- Le site est généré statiquement et vise Vercel ; le domaine reste à décider. Les routes d’administration sont dynamiques.
- Éditer, c'est modifier des fichiers : confortable pour les développeurs, pas pour quelqu'un qui n'en est pas un. Un formulaire d'édition suppose une base et une authentification (voir « Plan de validation »).
- L'ajout d'un classement demande une définition JSON, un profil de scoring (réutilisable) et un connecteur ou une série de démonstration pour son pool de candidats ; aucun composant à écrire.
- Un snapshot ne se corrige pas : une erreur de relevé se corrige par une note, ce qui est voulu mais peut surprendre.
- Les 345 pages statiques, dont 147 images OpenGraph, se génèrent en une vingtaine de secondes sur le poste de développement (mesuré une fois, pas en CI) ; à surveiller si le nombre de semaines ou d'entités grossit.

## Risques

- **Données de démonstration confondues avec des mesures.** Mitigations : bandeau, pastilles, page « À propos », noindex, noms de profils fictifs signalés. Le risque inverse (passer en `live` avec des données simulées) est bloqué : la validation échoue en mode `live` tant qu'un snapshot `mock` existe. Reste le cas où l'on publie sans basculer `SITE_DATA_MODE` : le site reste alors en noindex, ce qui est le bon défaut.
- **Faits sur de vrais produits.** Les noms de projets et de modèles sont réels, les chiffres sont simulés, certains attributs (licence, éditeur) sont saisis de mémoire et doivent être vérifiés avant publication.
- **Pas de politique de contenu (CSP) stricte** : un script inline de thème et les scripts de Next imposent des nonces ou `'unsafe-inline'`. En-têtes de base seulement (`nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`). À traiter avant la mise en ligne.
- **Connecteurs et quotas** : comptes, jetons et conditions d'utilisation des sources sont des décisions du propriétaire ; rien n'est branché.
- **Accessibilité et performance non mesurées** : pas d'audit WCAG, pas de Lighthouse, pas de test de navigateur automatisé.
- **Archivage des classements** : les pages d'archive (16 semaines × 4) sont indexables ; si le volume grossit, limiter l'indexation aux semaines marquantes.

## Plan de validation

- Fait : 48 tests (domaine, pipeline, contenu, squelettes), `pnpm check` du monorepo vert, build de 345 pages, 25 routes sondées en HTTP (200) et une inexistante (404), rendu vérifié dans le navigateur intégré sur l'accueil, un classement, une fiche et le tri par critère.
- À faire : audit d'accessibilité (clavier, lecteur d'écran, contrastes mesurés), Lighthouse et Core Web Vitals sur un hébergement réel, test Playwright des parcours principaux, CSP avec nonces, premier connecteur réel (GitHub) sous le contrôle du propriétaire.
- Critère de réévaluation : si l'équipe veut éditer sans Git, ou si le contenu dépasse quelques milliers de fichiers, passer à PostgreSQL (le format JSON est déjà celui des lignes) avec une authentification interne ou un fournisseur choisi par le propriétaire.
