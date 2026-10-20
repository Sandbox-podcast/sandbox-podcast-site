# DD-0072 : reprise persistante de la découverte GitHub

- Date : 2026-10-20.
- Statut : correctif local, recette distante après livraison.
- Décidée par l'agent sur délégation (PD-0003), après constat en production et accord du propriétaire sur la correction.

## Défaut observé

Le premier tick Cloudflare actif à 10:30:12 UTC crée le [run de découverte 39408394552](https://github.com/Sandbox-podcast/sandbox-podcast-site/actions/runs/39408394552). Le job démarre à 10:30:18 et termine en échec à 10:34:57. Les deux appels renvoient des réponses JSON métier HTTP 503.

Trending traite douze dépôts, en retient dix et crée un relevé. Les anciens compteurs ne permettent pas de déterminer si les deux autres cas sont des exclusions de critères ou des métadonnées en erreur. La découverte traite 5 000 dépôts sans erreur, puis atteint son budget de durée et signale des partitions non exhaustives. Vercel confirme 224,4 secondes pour la découverte, dans une fonction limitée à 300 secondes, sans erreur console. Les réponses montrent une fin métier partielle, pas un timeout de la fonction.

Deux défauts entretiennent cet échec : Trending compte les exclusions de critères comme des erreurs ; la découverte annonce une collecte partielle dès que la recherche contient davantage de résultats que ses deux pages prévues. Une relance recommence au début du plan journalier et ne conserve pas la page suivante.

## Décision

La découverte reste un échantillonnage borné à deux pages par partition. Le plafond de résultats et le choix des deux pages sont des limites de couverture explicites ; ils ne constituent pas, seuls, une panne. Un véritable indicateur GitHub `incomplete_results`, un quota, une erreur réseau ou une écriture refusée conservent l'état d'échec HTTP 503.

Un checkpoint validé par Zod porte la date UTC, l'empreinte du plan, l'index de partition et la page suivante. Il est conservé dans les détails JSON des jobs existants ; aucune table ni migration n'est ajoutée. La lecture s'effectue après acquisition du verrou de job, en excluant le job courant et en ignorant les passages interrompus avant leur premier marker. Le nouveau job persiste le checkpoint hérité avant son premier appel réseau.

Chaque page est enregistrée avant le déplacement du checkpoint. Une coupure entre l'upsert et sa confirmation peut rejouer cette page, dont l'écriture reste idempotente ; elle ne doit pas la sauter. La fin du job conserve le marker. L'expiration d'un bail ajoute son avertissement aux détails existants au lieu d'effacer les checkpoints.

Un arrêt au budget de 220 secondes conserve un état partiel et une page suivante persistée. La reprise automatique continue à cet endroit. Seule la fin du plan borné sans erreur vaut un succès. La date, une empreinte de plan différente ou un marker invalide imposent une remise à zéro bornée. Les critères d'éligibilité des classements restent inchangés.

Trending compte séparément les dépôts filtrés : privés, archivés, forks, désactivés ou hors licences admises. Une métadonnée absente, une erreur GraphQL ou un échec réseau reste une erreur de collecte.

## Vérification et limites

Les tests couvrent la persistance après chaque upsert, la reprise de la bonne page après interruption ou arrêt au budget, le refus d'avancer après une erreur d'écriture, la conservation à la fin et à l'expiration du bail, les jobs vides après coupure, un passage achevé entre l'acquisition et la lecture, la remise à zéro des markers incompatibles et la distinction entre filtrage et erreur réelle.

La durée de 220 secondes laisse une marge sous les 300 secondes de la fonction pour le dernier appel GitHub borné à trois essais de quinze secondes et ses temporisations. Cette marge ne garantit pas la disponibilité de GitHub ou de la base. Une page peut évoluer entre deux appels : ce mécanisme ne prétend pas figer un snapshot exhaustif des recherches.

Le contrôle externe conserve trois tentatives par créneau et un délai de reprise de trente minutes pour la découverte. Dans le même workflow, un runner autorise deux appels de découverte au maximum : le second exige une réponse JSON validée, HTTP 503, un état partiel avec failed=0, des pages restantes, une cause structurée continuation.reason=budget et un curseur strictement avancé pour la même date et la même empreinte. Une erreur réelle, un timeout, une réponse invalide ou un curseur immobile interdit cette continuation. Un deuxième résultat partiel reste en échec et attend le prochain rattrapage automatique. Un HTTP 200 avec skipped (bail déjà détenu) ne confirme pas la fin du travail ; le workflow reste en échec différé. La seule exception est la désactivation explicite de Trending, identifiée par skipReason=disabled et des compteurs nuls ; la découverte principale exige toujours une fin complète. Un succès exige aussi un bilan cohérent, sans erreur, pages restantes ou continuation en attente. Le champ structuré discoveryProgress confirme la fin du plan ; au second appel, son curseur de départ doit correspondre exactement au checkpoint reçu du premier, pour la même date et la même empreinte.

Le runner dispose d'un budget global de quinze minutes pour Trending et les deux appels de découverte. Chaque requête conserve son plafond de six minutes, réduit au temps global restant. Le job reste limité à vingt minutes ; le précontrôle est borné à 150 secondes et la marge de préparation est conservée. Aucun délai existant n'est augmenté. Les tests exécutent le véritable script CLI et simulent les réponses HTTP, y compris l'épuisement du budget.

Aucune relance manuelle n'a été utilisée pour établir le diagnostic ou valider le code local.
