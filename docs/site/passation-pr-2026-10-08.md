# Passation : classements, SEO et mise en service

Cette liste accompagne la PR `codex/remaining-seo-charts-handoff`. Elle sert de plan de travail à la personne ou à l'agent qui poursuivra le chantier. Les cases ouvertes correspondent à des travaux encore à faire ou à vérifier ; une réussite locale ne vaut pas validation de production.

## Ce que la PR apporte

- Interface et modèle de données des classements SANDBOX CHARTS, snapshots GitHub, pages publiques et administration éditoriale.
- Routes localisées, métadonnées, sitemap, `canonical`, `hreflang` et garde `noindex` pour les pages sans contenu réel ou traduction relue.
- Brouillons de libellés de classement pour 115 locales européennes prioritaires, servis par 109 variantes de langue ou d'écriture. Ces textes ne sont pas relus par des natifs.
- Skills marketing et SEO importées dans `.agents/skills/` pour guider les prochaines évolutions.
- Correction CI de l'issue [#4](https://github.com/Sandbox-podcast/sandbox-podcast-site/issues/4) : sur une pull request, Gitleaks analyse `base.sha..head.sha`; sur un push, il garde le scan complet. L'exception documentée pour le faux positif `youtube-1080p` reste active.

## Ordre de reprise

### 1. Relire et valider la PR

- [ ] Examiner les changements de routes, migrations 0002 à 0004, pipeline GitHub, règles d'indexation et dépendances.
- [x] Contrôles GitHub de cette PR : qualité, audit, tests, build et Gitleaks réussis le 2026-10-08. Les contrôles devront être relancés après tout changement.
- [x] Gitleaks passe sur la PR et sur le push de la branche. L'issue #4 sera fermée à la fusion.
- [x] Le preview Vercel de cette PR a réussi sur `sandboxpodcastpro-5518/sandbox-podcast` le 2026-10-08.

### 2. Confirmer la cible de production avant toute opération

- [ ] Avec le responsable, confirmer que le projet Vercel identifié par le preview, `sandboxpodcastpro-5518/sandbox-podcast`, est bien celui de production et qu'il sert `www.sandboxpodcast.fr`.
- [ ] Confirmer la branche de production, le Root Directory, la version Node et le domaine canonique dans les réglages du projet. Une session Vercel distincte ne pouvait lire que le projet `sandbox-podcast-site`; ne pas le confondre avec la cible du preview.
- [ ] Identifier la base Neon déjà utilisée par le site, son historique réel et les rôles disponibles. Confirmer si Preview écrit dans une base séparée.
- [ ] Si les accès restent indisponibles, laisser ces cases ouvertes et demander au propriétaire les accès ciblés ; ne pas créer un projet, domaine ou base de remplacement.

### 3. Activer SANDBOX CHARTS avec des données réelles

- [ ] Faire une sauvegarde ou branche de restauration Neon et vérifier les migrations 0000/0001 avant toute migration.
- [ ] Appliquer 0002, 0003 et 0004 avec le rôle autorisé depuis le commit fusionné ; vérifier chaque entrée Drizzle et les tables résultantes.
- [ ] Configurer les secrets serveur dans le gestionnaire du projet confirmé : `DATABASE_URL`, `GITHUB_TOKEN` en lecture seule et `CRON_SECRET`. Ne jamais les enregistrer dans Git, un ticket ou le frontend.
- [ ] Déployer en Preview sur une base isolée, vérifier les réponses 401/404 et le parcours admin authentifié, puis vérifier le domaine et le build de production.
- [ ] Vérifier l'exécution des trois crons, leurs journaux et la collecte réelle. Importer les candidats avec `--dry-run` avant écriture.
- [ ] Observer au moins sept jours de mesures avant la première édition GitHub et quatorze jours avant Rising. Ne pas reconstruire les jours absents ni publier de scores sans sources.

Voir [mise-en-service-neon-vercel.md](mise-en-service-neon-vercel.md), [guide SANDBOX CHARTS](sandbox-charts.md) et [méthodologie](../sandbox-charts-methodology.md) pour les procédures exactes.

### 4. Compléter les classements et leurs preuves

- [ ] Choisir les sources, règles d'éligibilité, fréquences, licences et facteurs de classement des Skills et Models avec des critères reproductibles.
- [ ] Implémenter et tester leurs collecteurs, validations de données, provenance et historique. Ne pas appliquer les métriques GitHub à des entités sans lien avec ces métriques.
- [ ] Définir une évaluation humaine et sourcée avant toute page qui affirme « meilleurs skills », « meilleur modèle » ou une compatibilité Cloud/Codex/ChatGPT.
- [ ] Connecter un service newsletter avant d'afficher un formulaire d'inscription fonctionnel ; sinon garder le parcours désactivé.
- [ ] Maintenir les classements de démonstration explicitement identifiés et `noindex` jusqu'à leur remplacement par une édition réelle vérifiée.

### 5. Rendre le SEO international publiable

- [ ] Faire relire les libellés des 115 locales par des personnes compétentes, puis marquer uniquement les traductions effectivement validées comme publiables.
- [ ] Ajouter les textes localisés distincts des collections et des entités (titre, résumé, description, méthode, métadonnées SEO), avec état éditorial et hash source.
- [ ] Ajouter ou finaliser une interface d'administration des traductions et les contrôles de cohérence de version.
- [ ] Vérifier en Preview les URLs, canonicals, liens `hreflang` réciproques, pages 404, robots, sitemap et absence de paramètres de filtre indexables.
- [ ] Garder `noindex` pour les pages sans contenu réel, sans traduction revue ou sans édition publiable. Inclure au sitemap uniquement les variantes qui satisfont ces conditions.
- [ ] Mesurer les requêtes et volumes avec Search Console ou un outil choisi, par pays et langue. Ne pas présenter l'échantillon SERP comme un volume mesuré et ne pas promettre la première position.

Voir [feuille de route SEO](seo-roadmap.md) et [ADR-0020](../adr/ADR-0020-architecture-seo-international-des-classements.md).

### 6. Remplacer les contenus média simulés et mesurer le site

- [ ] Remplacer les épisodes et descriptions de démonstration par le catalogue réel avant de demander leur indexation.
- [ ] Ajouter les biographies, profils sociaux et pages d'écoute réels des animateurs et épisodes ; récupérer les liens manquants de Nicolas et Loïc.
- [ ] Fournir `YOUTUBE_API_KEY` au serveur si l'import complet des vidéos et chapitres est requis.
- [ ] Choisir et connecter l'analytics, valider le consentement/cookies et les mentions légales avec le responsable ; vérifier l'événement de lecture et les clics sur les ressources.
- [ ] Après déploiement, relever l'accessibilité, les Core Web Vitals et les métriques Search Console de référence, puis corriger les pages qui échouent.

## Critères de fin

- CI verte, y compris le build et Gitleaks ; Preview Vercel reproductible depuis le bon projet.
- Migrations appliquées sur la bonne base après sauvegarde ; secrets présents uniquement dans le gestionnaire prévu.
- Au moins une collecte réelle traçable et une première édition publiée après la période d'observation requise.
- Aucune page de démonstration ou traduction non relue indexable ; canonicals, `hreflang` et sitemap validés sur le domaine confirmé.
- Les classements formulés comme des recommandations s'appuient sur des preuves datées et une méthode visible.
- Les contenus média, l'analytics et le cadre de consentement sont validés avant l'indexation correspondante.

## Documents de référence

- [Questions ouvertes](../open-questions.md)
- [Rapport de livraison locale](sandbox-charts-livraison.md)
- [Stratégie de données](data-strategy.md)
- [Workflow éditorial](editorial-workflow.md)
- [Tests et quality gates](../testing.md)
