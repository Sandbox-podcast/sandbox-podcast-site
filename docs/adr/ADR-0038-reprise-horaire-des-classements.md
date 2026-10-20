# ADR-0038 : reprise des classements au contrôle horaire

- Date : 2026-10-20
- Statut : décidée par l'agent sur délégation (PD-0003), correctif local ; activation distante non réalisée.
- Demande : Lou constate des retards sur News et les classements et demande leur vérification par plusieurs agents.

## Constat

Les classements se collectent à 03:17 et 15:17 UTC, avec un contrôle public horaire. Le 20 octobre, le contrôle de 06:07 UTC trouve encore les éditions GitHub, Skills et Models du 19 octobre à 12:00 UTC. Le contrôle échoue correctement, mais ne collecte aucune donnée. Aucun passage du job `refresh` du 20 octobre n'apparaît dans les quinze derniers runs consultés. Rising reste sans édition, faute d'historique admissible.

La découverte du même matin démarre à 05:59 UTC pour une planification à 01:17 UTC. Les réponses 503 provoquent des répétitions et le job dépasse ses dix minutes. Une reprise du script applicatif ne peut pas forcer GitHub à déclencher un workflow absent.

## Décision

Le contrôle horaire garde sa lecture publique sans secret. Il fournit aussi une sortie `recovery-needed` lorsque GitHub, Skills ou Models n'a pas d'édition valide pour le créneau courant, après l'horaire prévu de sa collecte : 03:17 UTC pour le créneau 00:00, 15:17 UTC pour le créneau 12:00. Il ne relance aucune collecte avant cet horaire. Le seul manque de Rising ne demande aucune reprise.

Un job distinct de reprise attend ce résultat, y compris lorsque le contrôle a échoué. Il partage le verrou `charts-collect-publish` avec les rafraîchissements manuels et planifiés et n'annule aucun traitement actif. Après acquisition du verrou, `charts-refresh.ts --recover` relit les quatre éditions publiques. Si un autre traitement a publié entre-temps, il ne collecte rien. Sinon, il reprend uniquement les chaînes manquantes, avec les contrôles, reprises bornées et gels existants. Les contraintes de données et l'immuabilité des éditions restent celles du pipeline actuel.

Avant chaque nouvel appel de collecte ou de gel, la reprise vérifie que l'horloge appartient encore au créneau initial. Si elle franchit 00:00 ou 12:00 UTC, le pilote arrête les nouveaux appels et conserve le contrôle public. Il n'engage pas de nouveaux appels de reprise dans le créneau suivant avant son horaire prévu. Un appel déjà commencé reste borné par son délai HTTP.

Une lecture publique indisponible ou invalide au niveau HTTP interrompt le script avant toute demande de reprise. Sans secret de collecte valide, le contrôle public reste possible, mais une reprise nécessaire échoue explicitement. Aucune valeur secrète n'entre dans les sorties du script.

## Budget et limites

Le contrôle conserve dix minutes. Le job de reprise possède trente minutes, comme le job de rafraîchissement ; les trois chaînes s'exécutent en parallèle. Chacune effectue au plus trois appels de collecte et un gel. Les quatre délais HTTP de 330 secondes, les deux attentes de quinze secondes et la lecture publique tiennent dans ce budget, sous réserve de l'installation et du temps du runner. Une chaîne déjà au bon créneau ne consomme aucun appel de collecte supplémentaire.

La découverte dispose de quinze minutes pour ses deux appels de six minutes et une marge. Les répétitions curl sont retirées : une réponse 503 peut suivre des mesures déjà enregistrées. La collecte facultative des poussées effectue également un seul appel de six minutes afin de rester dans le budget du contrôle horaire.

Un créneau toujours bloqué pourra être retenté lors d'un contrôle ultérieur. Ce mécanisme peut donc utiliser des minutes GitHub supplémentaires en cas d'incident persistant ; il n'ajoute pas de forfait ni de service. Les résultats publics et les contrôles échoués restent visibles. Rising absent conserve l'échec du contrôle et n'entraîne pas de relance horaire à lui seul.

La reprise dépend d'un contrôle horaire effectivement déclenché. GitHub peut retarder ou omettre ces événements. Un délai garanti demande un planificateur avec les garanties adaptées et l'autorisation de Lou pour les comptes, réglages ou dépenses concernés.

## Vérification

Les tests couvrent les bornes 03:17 et 15:17, le créneau réellement dû, une seule chaîne manquante, l'exclusion de Rising comme seul motif, la relecture après le verrou, l'absence de secret, la reprise réelle du script avec transport simulé, les budgets et le verrou partagé. Le suivi d'exploitation est détaillé dans le [guide du 20 octobre](../site/automatisation-news-charts-2026-10-20.md).
