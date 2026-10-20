---
name: codex-quota
description: Afficher le quota Codex restant et sa variation pendant une conversation et depuis la réponse précédente, avec les limites de cette mesure.
---

# Quota Codex

Au début du premier tour, appeler `mcp__codex_app__get_usage_limits` avec `{}` si cet outil est disponible, puis le rappeler juste avant chaque réponse finale. Conserver les relevés utiles dans le contexte de la conversation. Si le suivi commence en cours de conversation, le dire : le premier relevé disponible ne couvre pas les tours antérieurs. Dans un autre environnement, rechercher un outil officiel équivalent ; à défaut, afficher « Consommation de cette conversation : indisponible dans cette session. » sans inventer de valeur.

Lire `rateLimitsByLimitId` en priorité et utiliser `rateLimits` seulement en secours. Pour chaque quota et fenêtre renseignés, comparer `usedPercent` au premier relevé et au relevé de la réponse finale précédente. Exprimer les différences en points de pourcentage. Déduire la durée de `windowDurationMins` : ne pas supposer que `primary` signifie cinq heures ou que `secondary` signifie une semaine. Une valeur absente ou nulle signifie indisponible, jamais zéro.

Ajouter une ligne courte en fin de réponse, adaptée aux fenêtres réellement présentes. Toujours inclure le quota restant, calculé par `max(0, min(100, 100 - usedPercent))`, lorsque le relevé est disponible. Exemple fictif : « Quota 7 jours : 58 % restants. Consommation observée : +2 points depuis le premier relevé de ce chat, +1 point depuis la réponse précédente. Mesure globale du compte, autres chats inclus. » Si plusieurs quotas existent, les nommer et les présenter séparément. Si les comparaisons sont indisponibles, afficher tout de même le restant connu et signaler la limite du suivi.

Le relevé concerne le compte et inclut les autres conversations. Il décrit l'état connu avant l'envoi de la réponse ; il ne mesure pas le coût exact de cette réponse ou d'un appel d'outil. Ne jamais présenter cet écart comme une consommation attribuable à cette seule conversation. Conserver la précision fournie par l'outil : une variation nulle signifie « aucune variation visible à la précision du relevé ». Ne pas convertir les pourcentages en euros ou en tokens.

Comparer seulement le même compte, le même quota et la même fenêtre (`windowDurationMins` et `resetsAt` identiques). Si la fenêtre change, si le pourcentage diminue ou si les repères ont disparu du contexte, signaler que la comparaison est indisponible et reprendre une référence. Ne pas sommer des fenêtres différentes. Si un outil officiel fournit un jour une mesure propre à la conversation, la privilégier en précisant son unité et sa couverture.

Interpréter « chaque itération » comme chaque tour terminé par une réponse finale. Ne pas multiplier les appels pour les messages de progression ou chaque opération interne. Relire le quota à chaque nouveau tour ; ne pas recycler un ancien relevé comme s'il était actuel. Ne pas enregistrer les identifiants du compte ni les réponses brutes dans le dépôt.
