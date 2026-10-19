# DD-0059 Disponibilité de News et traduction sur Linux

- Date : 2026-10-18
- Statut : décidée par l'agent sur délégation (PD-0003), correctifs locaux
- Origine : issue #88 et demande de Lou de réparer les pages News.

## Décision

Le drapeau `SANDBOX_NEWS_PUBLIC=1` reste obligatoire pour ouvrir News et son API cron. Son absence conserve les réponses 404 prévues par DD-0057. Le présent lot ne modifie aucune variable distante et n'active aucune publication.

Après activation, l'absence de fiche récente affiche une attente explicite dans les quatre langues. Elle ne transforme plus `/news` en page introuvable. Une panne Postgres affiche un message d'indisponibilité distinct du flux vide. Ces deux états restent `noindex`, sans collection de liens vide ni variantes hreflang indexables. Le rendu et les métadonnées partagent la même lecture pendant la requête.

L'accueil affiche sa carte News et son radar lorsque le drapeau public est activé, comme il le faisait déjà en aperçu local. L'utilisateur peut ainsi rejoindre la page après sa mise en service.

Le traducteur choisit le Python du venv selon le système : `bin/python` sur le runner Ubuntu, `Scripts/python.exe` sous Windows. Il résout ses fichiers depuis le module, sans dépendre du dossier courant du processus. Le collecteur préfère le texte de l'article quand celui-ci contient au moins 240 caractères, seuil requis par le générateur, plutôt qu'une description courte qui faisait écarter la fiche.

## Validation et mise en service

Les tests unitaires couvrent la fermeture, les états vide et indisponible, le noindex, les liens d'accueil, les chemins Linux/Windows et l'extraction du corps de l'article. `pnpm --filter @podcast/site test:news:e2e` vérifie l'API authentifiée et les pages FR/EN/ES/DE dans un navigateur contre une base PGlite locale éphémère. Les fixtures portent leur mention de test et ne décrivent aucune actualité réelle. Les résultats et captures restent dans `apps/site/.local/news-e2e/`.

La mise en service reste celle de DD-0057 : appliquer la migration 0016 à la base concernée après accord, définir le drapeau Vercel, vérifier les secrets cron, définir la variable GitHub, puis contrôler un premier cycle réel. Les tests locaux ne prouvent ni l'accessibilité actuelle de chaque média ni la qualité sémantique des résumés générés.
