# ADR-0041 : contrôles quotidiens News et classements

- Date : 2026-10-26.
- Statut : PR autorisée par Lou le 26 octobre ; fusion et déploiement du Worker restant à effectuer.
- Fréquence : demandée par Lou, qui confirme le passage quotidien des deux déclencheurs horaires.
- Horaires et adaptation du contrôle externe : décidée par l'agent sur délégation (PD-0003).

## Décision

Un seul workflow, « SANDBOX quotidien News et classements », démarre à 03:37 UTC. Le fichier news-refresh.yml regroupe les jobs News et le contrôle des classements, avec sa reprise éventuelle et la mesure facultative des poussées GitHub. Les deux traitements restent indépendants. Le contrôle Charts partage le verrou des collectes pour attendre une collecte déjà active avant de vérifier sa fraîcheur. Le contrôleur Cloudflare passe de toutes les cinq minutes à une fois par jour, à 05:37 UTC, pour éviter qu'il recrée les exécutions supprimées côté GitHub. Il peut rattraper une collecte manquante ou échouée lors de ce passage.

La découverte quotidienne des candidats à 01:17 UTC et les deux collectes de classements à 03:17 et 15:17 UTC conservent leur cadence. Les lancements manuels restent disponibles. Cette décision remplace les cadences de contrôle décrites dans ADR-0038 et ADR-0039.

Le précontrôle News partage un cycle quotidien commençant à 03:37 UTC, y compris après minuit et avant le passage suivant. Une collecte réussie dans ce cycle ne redevient pas due chaque heure. Le contrôle de santé News et celui du Worker acceptent vingt-sept heures depuis leur dernier passage, soit une journée et trois heures de marge. Les erreurs de source, flux invalide ou vide et les dates futures restent des erreurs.

## Effets et livraison

Le traitement News conserve ses workers parallèles et le traitement de plusieurs lots, avec un seul déclenchement quotidien. La collecte attend le passage suivant pour découvrir les nouveaux articles. Le contrôle et les reprises automatiques attendent désormais le passage quotidien suivant. Les poussées GitHub ne disposent plus d'un échantillonnage horaire fourni par ce workflow. Les éditions Charts gardent leurs critères et leurs deux créneaux quotidiens.

La livraison doit inclure les workflows et leur précontrôle sur `main`, puis le déploiement du Worker avec son nouveau cron et les variables d'activation existantes. Une modification locale seule ne réduit pas les notifications en production. Lou autorise le commit, le push et la création de la PR le 26 octobre. Le déploiement distant du Worker reste à effectuer.

## Vérification

Voir le [bilan et les validations du 26 octobre](../site/issue-68-bilan-2026-10-26.md). Les tests couvrent le cycle quotidien, la déduplication, la lecture des résultats par job et les bornes de fraîcheur. Un échec Charts ne doit pas relancer News ; un historique incomplet reste une erreur.
