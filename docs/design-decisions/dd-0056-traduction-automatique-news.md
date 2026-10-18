# DD-0056 Traduction automatique des fiches News

- Date : 2026-10-18
- Statut : traduction automatique implémentée dans le lot local ; activation publique soumise à la configuration de DD-0057
- Origine : demande de Lou d'obtenir une traduction automatique à chaque nouvelle entrée de News.

## Décision

Chaque nouvelle fiche doit présenter un titre et trois phrases en français, anglais, espagnol et allemand avant publication. Les fiches françaises complètes déjà présentes dans le registre éditorial gardent leurs traductions relues. Pour une nouvelle fiche, Argos Translate tourne sur CPU : français vers anglais, puis anglais vers espagnol et allemand, car le flux utilise l'anglais comme langue pivot pour ces deux paires.

Le traitement vérifie que chaque langue contient son titre et exactement trois phrases, que les traductions ne sont pas vides et qu'elles diffèrent du texte source. Une erreur de traduction bloque le lot plutôt que de publier une fiche dans une langue incomplète. Les quatre pages localisées sélectionnent la même fiche traduite. Le cache du modèle et les bibliothèques restent sous `apps/site/.local/`, hors Git.

L'aperçu local conserve aussi ses traductions. Le workflow de production réutilise les modèles hors ligne dans le cache GitHub Actions et traduit les nouvelles synthèses avant de les envoyer à l'API protégée du site.

## Portée et limites

La validation automatique confirme la présence et la forme des textes, pas leur qualité sémantique. Argos peut mal rendre un nom propre, une nuance ou une phrase technique. La page renvoie vers la publication originale pour vérifier les faits et avertit que les synthèses sont générées automatiquement. Un échantillon représentatif de traductions réelles reste à relire après le premier cycle de production.

La configuration de l'API, de la migration et de la tâche horaire est détaillée dans [DD-0057](dd-0057-automatisation-production-news.md). Le code reste `noindex` et ne publie rien en production tant que les drapeaux de mise en service ne sont pas définis.
