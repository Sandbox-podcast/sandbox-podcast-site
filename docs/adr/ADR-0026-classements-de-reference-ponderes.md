# ADR-0026 : classements de référence pondérés et vérifiables

- Date : 2026-10-13
- Statut : accepté pour implémentation, calibration publique à reprendre par le responsable
- Décision : décidée par l'agent sur délégation (PD-0003)

## Problème

ADR-0024 exige deux signaux, mais Skills et Models donnent le même poids à chaque fournisseur. Models normalise après intersection des sources. Skills peut remplacer sa dynamique par des compteurs cumulés. La découverte GitHub ne cherche que des sujets IA. Le système ne conserve pas de rapport commun de couverture, de contributions et de sensibilité.

## Décision

Conserver les routes, les relevés et les éditions historiques. Les nouveaux calculs utilisent un moteur pur, une configuration versionnée et une preuve JSON rejouable. Les classements restent distincts selon leur objet. GitHub couvre les projets open source de tous domaines. Skills mesure l'adoption et la dynamique du dépôt. Models mesure les capacités générales des variantes exactement raccordées. Aucun de ces scores ne prétend établir une supériorité dans tous les usages.

Les familles ont des budgets fixes et inégaux : GitHub 70 % attention et 30 % pratiques, Rising 85 % accélération et 15 % pratiques, Skills 70 % installations et 30 % dépôt, Models 60 % évaluations et 40 % préférences humaines. Dans une famille, la puissance relative d'une source vaut pertinence multipliée par rigueur, reproductibilité et résistance à la manipulation. Les notes sont des choix éditoriaux initiaux, jamais présentées comme des paramètres appris. Un fournisseur qui republie le même jeu de mesures ne crée pas une voix supplémentaire. Les budgets de famille empêchent vingt sources corrélées de submerger un autre type de preuve.

Le moteur exige toutes les sources classantes du profil pour donner un rang. Il contrôle leurs dates et tailles minimales d'échantillon. Un candidat incomplet conserve une borne haute : si elle peut atteindre le Top, le gel est refusé. Les poids ne sont pas redistribués à la carte. La normalisation porte sur tous les candidats observés par source, avant intersection. L'écart entre familles retire 20 % de leur déviation absolue pondérée à la moyenne.

La sensibilité publie les rangs obtenus en variant chaque poids de 20 % et en retirant chaque source ou famille. Ces bornes décrivent des scénarios, sans interprétation de probabilité ni intervalle de confiance. Le profil, les observations normalisées avec leur provenance et le rapport sont conservés dans la configuration figée, avec une empreinte SHA-256. Les relevés bruts restent dans les tables existantes. L'empreinte détecte une divergence lors du rejeu ; elle ne constitue pas une signature indépendante.

Les profils v3 portent le statut expérimental. Leur publication demande une activation explicite liée à leurs versions après la revue de calibration et des droits de source. Les anciennes éditions demeurent lisibles. La revue et la mise en service font l'objet de l'issue de passation, sans achat ni création de compte automatique.

## Conséquences

L'admission au pool officiel exige une baseline de sept jours pour GitHub et Skills, et deux périodes pour Rising. Un candidat nouvellement découvert reste en constitution d'historique avant cette échéance ; il peut déjà apparaître dans les poussées intrajournalières. Après sept jours de suivi, ou quatorze pour Rising, une baseline toujours absente redevient une inconnue susceptible de bloquer le Top. Cette règle évite que la découverte continue empêche toute publication, tout en rendant explicite le délai d'admission. Les références d'évaluateur Models sont conservées même sans relevé récent ; une identité revendiquée par plusieurs modèles actifs est mise en attente.

Le nombre de sources peut augmenter par profil sans changer le moteur. Une nouvelle source classante impose un raccordement exact, une provenance datée, une analyse des dépendances entre benchmarks, des tests et une nouvelle version du profil. Les catalogues, téléchargements, prix et classements agent plus modèle restent dans leurs dimensions ou dans la découverte tant que leur comparabilité n'est pas démontrée.

Le seuil de vingt candidats est conservé. Les manques peuvent retarder une édition. Cette attente est visible et préférable à une sélection silencieuse des seuls candidats faciles à mesurer. La portée mondiale reste un objectif de couverture et de reconnaissance à démontrer avec des données réelles et une revue externe.

Voir [conception et audit](../site/reference-ranking-design.md) et [prompt de reprise](../site/prompt-classements-reference.md).
