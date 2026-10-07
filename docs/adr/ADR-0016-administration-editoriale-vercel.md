# ADR-0016 — Backoffice éditorial et publication sur Vercel

- Statut : acceptée pour le backoffice ; stockage Blob remplacé par [ADR-0017](ADR-0017-persistance-editoriale-postgres.md)
- Date : 2026-10-06
- Décision prise à la suite des demandes explicites de backoffice et de mise en ligne sur Vercel

## Contexte

Le site média (`apps/site`) était statique et son `/admin` en lecture seule. Le propriétaire demande de créer des articles, modifier les contenus affichés en front et héberger le site dans son compte Vercel. L’historique des classements doit rester immuable et le contenu ne doit pas accepter de HTML libre.

## Décision

1. Garder les JSON de `content/` comme contenu initial et source versionnée, puis ajouter une couche de publication éditoriale au-dessus. Les snapshots de `data/snapshots/` restent exclusivement lus depuis Git.
2. Stocker les brouillons et le contenu publié dans un **Vercel Blob privé**. En développement, utiliser `apps/site/.site-content.local.json`, ignoré par Git. L’interface admin reste sans dépendance à une base de données.
3. Rendre les pages publiques par génération statique et revalidation ISR (une heure au plus, invalidation immédiate à la publication). Les routes d’admin et d’API restent dynamiques.
4. Protéger le backoffice par des comptes nominatifs configurés dans `SITE_ADMIN_USERS` (identifiant et empreinte scrypt salée) et une clé de session `SITE_ADMIN_SECRET`. Le cookie signé contient l'identifiant, est `HttpOnly`, `SameSite=Strict`, sécurisé en production et expire après huit heures. La connexion est requise aussi en développement. Sans secrets configurés, elle est refusée.
5. Valider toutes les écritures par Zod et par les contrôles de références existants. Les articles utilisent les blocs structurés déjà rendus par le site. Les collections ne peuvent pas retirer les entrées existantes depuis l’API du backoffice. Aucun HTML utilisateur ni média envoyé depuis l’admin.
6. Le backoffice expose des formulaires dédiés aux épisodes, à l’identité, aux animateurs, aux thèmes et aux sources de classement. Chaque classement garde un document Markdown unique pour ses textes, fiches et avis. Les articles historiques restent dans les données, sans parcours de publication public autonome.

## Conséquences

- L’édition ne nécessite ni pull request ni redéploiement du code. La publication invalide les routes publiques, puis Vercel régénère les pages.
- Les snapshots, leurs semaines et leurs scores ne peuvent pas être écrits par le backoffice.
- Le projet Vercel utilise la connexion OIDC fournie par le Blob privé ; `BLOB_STORE_ID` identifie le store, et le SDK obtient une autorisation temporaire sans jeton long terme. `BLOB_READ_WRITE_TOKEN` reste accepté comme configuration de repli.
- Le stockage objet suit les limites et tarifs du compte Vercel. Vérifier le plan et les quotas avant d’activer un store en production.
- Les sessions HMAC sont sans état ; la limitation de tentatives de connexion en mémoire ne garantit pas une limite partagée entre instances serverless. Renforcer ce contrôle si le backoffice reçoit un trafic public notable.
- Le stockage de brouillon et la publication sont deux écritures successives, pas une transaction. Si la seconde échoue, le brouillon reste disponible et la publication doit être relancée.

## Retour arrière

Retirer la liaison Blob revient à servir les JSON versionnés et à désactiver le backoffice de production. Les snapshots restent intacts. Les exports JSON du Blob devront être sauvegardés avant toute suppression manuelle d’un store.

## État de mise en ligne — 2026-10-07

L'ancien projet `sandbox-podcast-site` et son Blob privé `sandbox-podcast-site-blob` sont liés à un autre compte Vercel. Le projet actuel `sandbox-podcast` est relié à `www.sandboxpodcast.fr` et au dépôt `Sandbox-podcast/sandbox-podcast-site`. Le domaine servait alors une version avec le bandeau de démonstration et l'ancienne connexion admin. Seules `SITE_URL` et `SITE_DATA_MODE` apparaissaient dans ses variables de projet ; le stockage du backoffice restait à configurer. Le propriétaire du compte prendra en charge GitHub et Vercel une fois le développement local terminé. Conserver `SITE_DATA_MODE=mock` et `noindex` tant que les contenus et mesures restent simulés. La situation distante relevée plus tard dans la journée figure dans [la transmission Vercel](../site/transmission-vercel-2026-10-07.md).

## Évolution locale — 2026-10-07

À la suite du recentrage du produit sur les podcasts, le formulaire d'épisode devient l'écran principal : il sert à créer **et** modifier les épisodes, leurs chapitres, ressources, sources et plateformes. Les réglages du site passent dans un formulaire guidé qui inclut les cartes de l'équipe sur `/about`. Les autres collections se modifient entrée par entrée dans un éditeur JSON validé. Cette évolution d'interface est décidée par l'agent sur délégation (PD-0003) ; elle ne modifie ni le stockage, ni les permissions, ni l'immuabilité des snapshots. Les changements restent locaux jusqu'à une demande explicite de publication.

La protection des écritures compare toujours l'en-tête `Origin` à l'origine de la requête. En développement local seulement, elle accepte aussi `127.0.0.1` ou `localhost` lorsque ce nom correspond au `Host` reçu : Next peut exposer `localhost` comme URL interne alors que le navigateur utilise `127.0.0.1`. Cette tolérance ne s'applique pas en production.

## Comptes d'administration — 2026-10-07

À la demande du propriétaire, le mot de passe partagé est remplacé par trois comptes nominatifs locaux : `lou`, `nicolas` et `loic`. Leurs mots de passe aléatoires sont transmis directement au propriétaire ; seules leurs empreintes scrypt salées sont conservées dans `apps/site/.env.local`, ignoré par Git. Les sessions sont liées au compte et deviennent invalides si son empreinte change ou si le compte est retiré. Les trois comptes ont actuellement les mêmes droits d'administration. Décision de conception prise par l'agent sur délégation (PD-0003). La configuration de Vercel et la publication restent à faire par le propriétaire après la fin du développement local.

## Saisie rapide — 2026-10-07

Décidée par l'agent sur délégation (PD-0003), à la demande d'une administration plus rapide. L'ouverture de `/admin` mène directement à la création d'un épisode. Le collage d'une URL YouTube déclenche l'import ; un bouton permet de le relancer et une saisie manuelle reste possible. Les champs principaux restent visibles, tandis que thèmes, plateformes, chapitres et ressources se déplient seulement quand l'éditeur en a besoin. Un identifiant de vidéo déjà présent est signalé avant l'enregistrement et rejeté par la validation du contenu.

Les thèmes et les sources de classement ont des formulaires : leurs identifiants sont calculés à partir du nom et restent stables lors d'une modification. Dans un classement, les actions « Un avis » et « Une fiche » construisent le Markdown attendu et enregistrent un brouillon. Le document complet reste accessible pour les modifications approfondies. Une fiche ajoutée avant son premier relevé garde son association éditoriale au classement ; elle n'obtient aucun rang ou score par cette action. Ce changement n'altère ni les permissions, ni le format des snapshots, ni l'obligation de publier explicitement.

## Ajustements locaux de l'interface et de la sécurité — 2026-10-07

Décidés par l'agent sur délégation (PD-0003), à la demande d'une optimisation de l'interface, du code, des performances et de la sécurité. L'interface admin compacte sa navigation sur tablette et mobile. Le code des éditeurs d'articles et de JSON générique, devenus inaccessibles, est retiré ; les réponses des API d'administration sont validées côté client avant d'alimenter l'interface. La connexion borne la taille du corps reçu et compare aussi les utilisateurs inconnus avec une empreinte factice pour réduire les écarts de temps de réponse. Une politique CSP couvre les origines nécessaires en production et les routes d'administration refusent la mise en cache. La CSP autorise encore les scripts et styles intégrés requis par le rendu statique actuel ; la limitation des connexions reste en mémoire par instance. Aucun de ces changements ne modifie les permissions ou le mécanisme de publication.

Ce constat précédait le push de la branche locale. La persistance de la PR #2 a ensuite été portée dans `apps/site` sans modifier les comptes nominatifs ni les permissions. Voir [ADR-0017](ADR-0017-persistance-editoriale-postgres.md) et [la transmission Vercel](../site/transmission-vercel-2026-10-07.md).
