# DD-0010 : Quatre langues pour le site

- Date : 2026-10-09
- Statut : accepté
- Périmètre : site média `apps/site`
- Décision : choix explicite de Lou

## Décision

Le site propose uniquement Français, Anglais, Espagnol et Allemand. Le français garde ses URLs sans préfixe. Les trois autres langues utilisent `/en`, `/es-es` et `/de-de`.

Le sélecteur affiche ces quatre choix, sans recherche. L'admin de traduction prépare uniquement l'anglais, l'espagnol et l'allemand. Les routes, les schémas de données et les imports refusent les autres locales. Le code, les dictionnaires et les drapeaux des langues retirées sont supprimés du dépôt.

Les traductions déjà stockées en base dans d'autres langues ne sont pas effacées par ce changement. Elles ne sont plus servies par le site. L'espagnol et l'allemand restent `noindex` tant que les textes n'ont pas été complétés et relus. Les règles de publication des contenus et des classements restent applicables.

Cette décision remplace le périmètre de 115 locales prévu dans [ADR-0020](../adr/ADR-0020-architecture-seo-international-des-classements.md), [DD-0006](DD-0006-pages-partagees-et-traductions-locales.md) et [ADR-0022](../adr/ADR-0022-traductions-manuelles-depuis-le-harnais.md). Leur architecture de pages partagées et de traduction manuelle reste en place pour les quatre langues retenues.
