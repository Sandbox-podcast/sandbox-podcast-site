# Sandbox — Site média

Site éditorial de Sandbox : épisodes, articles, analyses et classements hebdomadaires. L’interface utilise la charte bleu nuit et cyan, ainsi que le logo fourni par Sandbox.

> **Données de démonstration** : les classements et mesures livrés dans ce dépôt sont des exemples, pas des résultats réels. Le site les identifie comme tels et reste en mode démonstration tant que les données n’ont pas été remplacées et vérifiées.

## Démarrer en local

Prérequis : Node.js 24 ou plus récent et pnpm 12.

```bash
pnpm install
pnpm dev
```

Le site s’ouvre sur `http://localhost:3000`. Le backoffice est disponible sur `/admin`. En développement, il lit et écrit les brouillons dans `.site-content.local.json`, ignoré par Git.

Commandes utiles :

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm content:check
```

## Backoffice éditorial

`/admin` permet de créer et modifier les articles, épisodes, classements, projets, avis, thèmes, sources, profils de scoring et paramètres éditoriaux. Dans **Équipe**, sélectionnez un profil pour saisir ses URL LinkedIn, GitHub et X ; seuls les liens renseignés apparaissent sur la page À propos. Les URL doivent utiliser HTTPS. Les articles utilisent des blocs validés ; aucun HTML libre n’est exécuté. Les snapshots de classement sont immuables depuis le backoffice.

En production, configurez ces variables dans Vercel avant d’ouvrir l’accès au backoffice :

| Variable                | Utilisation                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `SITE_ADMIN_PASSWORD`   | Mot de passe d’administration, 16 caractères minimum                                                      |
| `SITE_ADMIN_SECRET`     | Clé de signature des sessions, 32 caractères minimum                                                      |
| `BLOB_STORE_ID`         | Identifiant ajouté quand le store privé Vercel est relié au projet ; OIDC fournit l’accès temporaire      |
| `BLOB_READ_WRITE_TOKEN` | Option de repli pour un déploiement sans OIDC ; ne pas créer de jeton long terme si OIDC est disponible   |
| `SITE_URL`              | URL publique canonique du site                                                                            |
| `SITE_DATA_MODE`        | `mock` par défaut ; ne passer à `live` qu’après remplacement et vérification des données de démonstration |

Le cookie d’administration est signé, `HttpOnly`, `SameSite=Strict` et expire au bout de huit heures. La connexion Vercel actuelle utilise OIDC, sans jeton long terme à copier. Les secrets d’administration et tout jeton de repli doivent rester dans les variables d’environnement Vercel ; ne les ajoutez jamais aux fichiers du dépôt.

## Déploiement Vercel

Importez ce dépôt GitHub comme un projet Next.js. La racine du projet est le dossier du dépôt ; aucune commande de build personnalisée n’est nécessaire. Configurez les variables du tableau ci-dessus dans l’environnement Production, créez ou reliez un store Blob privé, puis déployez. Le site conserve son bandeau de démonstration et ses règles de non-indexation tant que `SITE_DATA_MODE=mock`.

## Contenu du dépôt

- `src/` — interface, routes, schémas et logique métier
- `content/` — contenu éditorial JSON
- `data/snapshots/` — historiques hebdomadaires immuables
- `public/sandbox-logo.png` — logo Sandbox fourni
- `scripts/` — outils de validation et de génération de contenu
- `test/` — tests de logique et de validation
