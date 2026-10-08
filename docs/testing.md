# Tests et Quality Gates

Référence : §32 à §35 du prompt maître de la plateforme vidéo (archivé : `old/PODCAST_PLATFORM_MASTER_PROMPT.md`).

## Commandes

```bash
pnpm check        # format:check + lint + typecheck + test
pnpm test         # vitest dans chaque package
pnpm lint         # ESLint, règles strictes typées
pnpm typecheck    # tsc --noEmit, TypeScript strict
```

## Ce qui existe aujourd'hui

| Niveau                       | État                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format, lint, typecheck      | en place, passent en local                                                                                                                                             |
| Tests unitaires              | 112 tests : `recording-core` (46), `recording-control` (23), POC 3 (43 : analyse ffprobe, relevés Docker, réparation MP4, configuration)                               |
| Audit des dépendances        | `pnpm audit --audit-level=high`, aucune vulnérabilité au 2026-10-05                                                                                                    |
| Secret scan                  | Gitleaks exécuté sur la PR #3 ; exception précise pour un faux positif dans l'archive `old/`                                                                           |
| Composants, intégration, E2E | pas commencés. Site média (`apps/site`) : 48 tests de logique pure, de contenu et de squelettes, build complet vérifié en local, aucun test de navigateur automatisé   |
| Média et pannes serveur      | scénarios manuels S1 à S5 et S3b à S3e du POC 3 sur une vraie pile Docker (`pnpm s1` etc.), pas dans la CI ; réseau dégradé et navigateur réel : pas commencés (POC 1) |
| Sécurité, performance        | pas commencés                                                                                                                                                          |

## CI

Le workflow `.github/workflows/ci.yml` lance format, lint, typecheck, tests, audit et secret scan à chaque push et chaque PR.

Le premier run sur la PR #3 a démarré le 2026-10-07. Le scan des secrets a relevé `vertical-9x16` dans `old/packages/episode-factory/src/catalog.ts` : c'est un nom de format vidéo, sans secret. L'exception dans `.gitleaks.toml` exige ce chemin **et** la ligne exacte, sans désactiver la règle `generic-api-key` ailleurs. Au commit `ef51d24`, la CI GitHub a réussi : jobs `quality` et `secret-scan`, 14 fichiers de test et 87 tests réussis. Le contrôle Vercel reste en échec tant que le projet n'est pas configuré pour `apps/site`.

Points à vérifier lors des prochains runs :

- `pnpm/action-setup@v4` avec pnpm 12 (version lue dans `packageManager`).
- Le secret scan utilise l'image `ghcr.io/gitleaks/gitleaks:latest`, non épinglée. À épingler après validation de la CI.
- La CI suppose GitHub Actions, déduit du chemin du dépôt (`C:\github`). Ce n'est pas une décision validée : voir [open-questions.md](open-questions.md).
- L'étape `pnpm --filter @podcast/site build` a réussi en local ; vérifier son résultat dans la CI.

## Quality Gates bloquants

Build ou type en échec, test critique en échec, vulnérabilité critique, accès cross-podcast, régression de perte de données d'enregistrement, régression de performance critique, migration dangereuse. Aucun gate n'est désactivé sans exception approuvée, documentée et datée.

## Fixtures média (à créer avec le POC 1 et 3)

Vidéo avec un visage, sans visage, plusieurs visages ; voix, bruit court, silence, clipping ; latence et pertes simulées. Générées de façon déterministe (FFmpeg est installé), jamais commitées en gros fichiers.

## Matrice navigateurs

Chrome desktop uniquement ([PD-0001](../old/docs/product-decisions/PD-0001-navigateurs-et-appareils-mvp.md), archivée).

## SANDBOX CHARTS

Les tests du pipeline GitHub couvrent les différences J−7, la tolérance de date, l’accélération J−14, les percentiles, les petits dénominateurs, les poids manquants et les exclusions. Les tests PGlite exécutent les migrations 0002 à 0004 et vérifient le gel, les relances, le dry run, le verrou des jobs, les erreurs partielles, les quotas, les commentaires séparés, les conflits ETag et les localisations publiées. Les tests i18n valident les tags BCP 47, les préfixes de route, les 115 cibles européennes et les états de relecture.

Les tests d’API vérifient les permissions viewer/editor/admin, l’origine des mutations, le refus d’édition des compteurs et le secret du cron. Les tests de présentation couvrent les périodes, les rangs conservés sous filtre, les données absentes, le Markdown et l’échappement des cartes de partage. Les gates du dépôt restent `pnpm check` et le build.
