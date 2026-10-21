# DD-0073 Priorité aux actualités récentes

Date : 21 octobre 2026. Décidée par l'agent sur délégation (PD-0003), après la demande de Lou de corriger et publier en production.

Le fil public reste au 19 octobre malgré les collectes horaires. Le passage terminé le 21 octobre à 09 h Paris traite vingt candidats, publie cinq fiches et laisse un arriéré de plus de cinq cents candidats. La sélection commence par les premières entrées enregistrées ; la date d'insertion d'une fiche ne garantit donc pas la fraîcheur de son article.

Chaque réservation de cinq candidats prend désormais les quatre articles aux dates sources les plus récentes, puis une entrée de l'arriéré par ordre d'arrivée. Les places inutilisées sont remplies par l'arriéré. Les deux sélections restent dans la même transaction, avec verrouillage et exclusion des lignes réservées par les autres workers. L'ordre retourné conserve les nouveautés en premier. Les délais de reprise, les trois tentatives, la fenêtre de quatorze jours et les contrôles éditoriaux restent applicables. Aucune donnée n'est supprimée et aucune migration n'est nécessaire.

Le contrôle de santé exige aussi un article source datant de moins de 36 heures, avec cinq minutes de tolérance pour les horloges futures. Une insertion récente d'un article ancien ne satisfait pas ce critère. Le bilan expose la date du dernier article. Ce seuil signale une absence de publication récente ; il ne promet pas un délai pour chaque source. Son échec fait échouer le workflow et permet la reprise prévue par le contrôleur existant.

Les tests utilisent Postgres WASM pour vérifier la priorité, la place de rattrapage, l'absence de doublon, les réservations concurrentes et les reprises. Les tests de santé couvrent le seuil et un fil ancien malgré une collecte récente. La livraison doit être suivie d'un passage réel et d'une lecture du fil public.
