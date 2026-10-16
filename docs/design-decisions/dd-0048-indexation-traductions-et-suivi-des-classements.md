# DD-0048 : indexation des traductions et suivi des classements

16 octobre 2026. Lou autorise l'indexation des textes ES/DE complets sans relecture native. Il confie les vérifications de mesure et des deux rafraîchissements programmés à l'agent. Il retient l'email du footer pour les signalements et abandonne la publication de la procédure proposée.

Les variantes partagées reprennent l'autorisation d'indexation de la page française, avec une URL canonique propre, des liens de langue réciproques et des entrées de sitemap. Recherche, pages vides, démonstrations et vidéoclub conservent les restrictions de leur source. Time Machine reste une destination française explicitement indiquée : aucune route traduite fictive n'est ajoutée.

Le catalogue local et les textes propres à la production sont complétés. Pour les prochaines publications, le lot manuel de traduction prévu par ADR-0022 reste nécessaire.

Une collision entre noms de modèles ne suffit plus à bloquer la collecte. La référence exacte du fournisseur est prioritaire pour retrouver une identité historique, y compris exclue. Des références entièrement distinctes qui partagent un nom reçoivent des identités séparées et stables. Les références réellement contradictoires restent bloquées. Aucune mesure ni ancienne identité n'est supprimée ou fusionnée.

Vercel Speed Insights utilise le consentement existant, relu à chaque envoi, et le filtre qui retire les paramètres d'URL et exclut l'administration. Le script ne charge qu'après accord. Aucune offre payante n'est activée.

Conception décidée par l'agent sur délégation (PD-0003). La publication des traductions est autorisée ; les règles de commit, push et PR d'AGENTS.md restent applicables. Les deux rafraîchissements réussis doivent être des exécutions programmées complètes, suivies d'éditions publiques fraîches. Un test local, une relance manuelle ou un contrôle horaire seul ne les remplace pas.
