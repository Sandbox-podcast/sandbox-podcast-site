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
| Secret scan                  | défini dans la CI, jamais exécuté                                                                                                                                      |
| Composants, intégration, E2E | pas commencés. Site média (`apps/site`) : 48 tests de logique pure, de contenu et de squelettes, build complet vérifié en local, aucun test de navigateur automatisé   |
| Média et pannes serveur      | scénarios manuels S1 à S5 et S3b à S3e du POC 3 sur une vraie pile Docker (`pnpm s1` etc.), pas dans la CI ; réseau dégradé et navigateur réel : pas commencés (POC 1) |
| Sécurité, performance        | pas commencés                                                                                                                                                          |

## CI

Le workflow `.github/workflows/ci.yml` lance format, lint, typecheck, tests, audit et secret scan à chaque push et chaque PR.

Il n'a jamais été exécuté. Points à vérifier au premier run :

- `pnpm/action-setup@v4` avec pnpm 12 (version lue dans `packageManager`).
- Le secret scan utilise l'image `ghcr.io/gitleaks/gitleaks:latest`, non épinglée. À épingler dès que le run fonctionne. Le démon Docker était arrêté en local, donc l'étape n'a pas pu être testée.
- La CI suppose GitHub Actions, déduit du chemin du dépôt (`C:\github`). Ce n'est pas une décision validée : voir [open-questions.md](open-questions.md).
- L'étape `pnpm --filter @podcast/site build` (345 pages statiques et 147 images OpenGraph) a été ajoutée ; elle a été exécutée en local, pas en CI.

## Quality Gates bloquants

Build ou type en échec, test critique en échec, vulnérabilité critique, accès cross-podcast, régression de perte de données d'enregistrement, régression de performance critique, migration dangereuse. Aucun gate n'est désactivé sans exception approuvée, documentée et datée.

## Fixtures média (à créer avec le POC 1 et 3)

Vidéo avec un visage, sans visage, plusieurs visages ; voix, bruit court, silence, clipping ; latence et pertes simulées. Générées de façon déterministe (FFmpeg est installé), jamais commitées en gros fichiers.

## Matrice navigateurs

Chrome desktop uniquement ([PD-0001](../old/docs/product-decisions/PD-0001-navigateurs-et-appareils-mvp.md), archivée).
