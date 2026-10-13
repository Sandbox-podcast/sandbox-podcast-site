# Épisode 002 : l'IA chez les artisans et commerçants

Plan demandé par Lou le 13 octobre 2026 : cinq slides Bêta, après LE RADAR et LE BUILD, avant LE CLASH. Le détail de cette analyse se trouve aussi dans les notes de la slide 2 Bêta.

## Recherche et choix des usages

France Num documente la rédaction, l'administration et la relation client dans les petites entreprises. La DGE traite notamment le support, les contenus et les stocks dans le commerce. CMA France distingue les besoins de l'alimentation, du bâtiment, de la production et des services. Ces sources donnent des pistes, sans établir un classement universel de rentabilité. [France Num](https://www.francenum.gouv.fr/guides-et-conseils/intelligence-artificielle/comprendre-et-adopter-lia/osez-lia-dans-votre-tpe-pme), [guide DGE](https://www.entreprises.gouv.fr/files/files/Publications/2026/guides/202603-guide-adoption-ia-commercants.pdf), [CMA France](https://www.artisanat.fr/analyses-donnees/intelligence-artificielle-service-artisanat).

La sélection et les priorités ci-dessous sont une analyse éditoriale. Regarder la fréquence de la tâche, son coût actuel, les données disponibles et la facilité de contrôler le résultat. Vérifier d'abord les fonctions du logiciel déjà utilisé.

| Usage                       | Petit outil à essayer                                                                                                   | Gain à vérifier                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Devis et comptes rendus     | Une dictée de visite devient un dossier structuré. Le professionnel vérifie quantités, prix et engagements.             | Temps par dossier, relecture et corrections comprises.                            |
| Relances de devis           | Une liste remonte les échéances ; l'IA prépare un message à valider.                                                    | Devis signés, marge associée et temps de suivi.                                   |
| Demandes clients            | Un formulaire recueille motif, dimensions, photo et disponibilité. L'IA résume et prépare une réponse.                  | Délai de réponse et demandes qualifiées.                                          |
| Rendez-vous                 | Rappels, annulation simple et liste d'attente. Des règles classiques peuvent suffire dans un outil construit avec l'IA. | Rendez-vous honorés et créneaux effectivement récupérés, après coût des messages. |
| Saisie administrative       | Une file rassemble les informations extraites des pièces, avec l'original et les champs incertains à contrôler.         | Temps net de saisie et erreurs restantes.                                         |
| Communication               | Préparer fiches produits, visuels, publications et réponses aux avis à partir d'informations vérifiées.                 | Temps par contenu validé. Mesurer les ventes séparément.                          |
| Fidélité et retours clients | Sélectionner des clients sans achat récent et préparer une campagne validée avant envoi.                                | Marge après remise et frais, avec un groupe comparable si possible.               |
| Stocks et invendus          | Proposer des quantités à partir des ventes et des invendus, puis comparer à une règle simple.                           | Coût des invendus évités, en tenant compte des ruptures supplémentaires.          |

Ces déclinaisons métier sont des propositions de conception, pas des résultats observés chez des clients.

## Choisir le premier essai

Pour un artisan qui accumule les visites et devis, tester la dictée structurée ou le suivi des relances. Le résultat se contrôle dossier par dossier sans connecter tout le système de gestion.

Pour un coiffeur, un institut ou un garage, examiner les rappels disponibles dans l'outil de réservation. Le gain vient des créneaux récupérés. Réécrire une fonction déjà présente ajouterait de la maintenance.

Pour une boutique, essayer le traitement des demandes ou une relance ciblée préparée manuellement. La marge supplémentaire doit couvrir la remise, les messages et le temps de préparation. La prospection respecte les choix de contact et de désinscription ; le premier prototype ne déclenche aucun envoi réel. [CNIL](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel).

La communication est facile à essayer, mais davantage de publications ne démontre pas davantage de ventes. La saisie de pièces est intéressante si son contrôle prend moins de temps que la saisie actuelle. Pour la facturation ou la comptabilité officielle, examiner d'abord les fonctions du logiciel métier.

Les stocks et la personnalisation demandent des données fiables et des règles métier. Un outil local peut montrer le principe ; une prévision exploitable demande un historique et une validation. Ces usages ne sont pas promis en une après-midi. [Guide DGE, fiches stocks et recommandations](https://www.entreprises.gouv.fr/files/files/Publications/2026/guides/202603-guide-adoption-ia-commercants.pdf).

## Mesurer le retour

Proposition de calcul, à remplir avec les données du professionnel :

```text
Gain mensuel net = valeur du temps réellement réutilisé
                + marge additionnelle démontrable
                + pertes évitées
                - abonnements, messages et API
                - maintenance
                - coût de mise en place amorti
```

Compter le temps de relecture, de correction et d'entretien. Du temps libéré peut améliorer la journée sans produire de chiffre d'affaires supplémentaire. Ne pas compter deux fois le bénéfice d'une même vente.

Comparer des volumes et périodes comparables. Suivre dossiers traités, erreurs, ventes finalisées et coûts. Pour une campagne, garder si possible un groupe comparable non sollicité. Arrêter ou simplifier l'essai si les corrections annulent le gain.

## Outils et méthode

Le parcours proposé utilise ChatGPT pour clarifier le besoin, puis Codex pour créer, tester et corriger les fichiers du projet. Leurs rôles se recouvrent. GitHub conserve le code et son historique ; Vercel héberge l'application web ; OVHcloud fournit ici le domaine et les DNS. Une application persistante demande aussi une base et des accès adaptés. [OpenAI](https://learn.chatgpt.com/docs/quickstart), [GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories), [Vercel](https://vercel.com/docs/git), [OVHcloud](https://docs.ovhcloud.com/fr/guides/web-cloud/domains/dns-zone-general-information).

L'après-midi vise une version locale sur un besoin réduit. L'ouverture aux clients vient après les essais, les permissions et la sauvegarde, avec une personne capable de maintenir l'outil.

Exemple à donner à ChatGPT :

> Je suis fleuriste et je perds le suivi de mes devis événementiels. Pose-moi les questions utiles, puis rédige un brief pour Codex avec les utilisateurs, les écrans, les règles, les limites et trois parcours à tester.

Exemple à donner ensuite à Codex :

> Construis une application locale de suivi de devis avec de fausses données. Je peux ajouter un devis, changer son statut et fixer une date de rappel. La liste montre les relances à faire. N'envoie aucun message réel. Conserve le logo joint et inspire-toi de la hiérarchie et de l'espacement de cette capture. Vérifie qu'un devis signé quitte la liste des relances et qu'une date vide produit un message clair.

Pour le design, joindre une capture et nommer les éléments à reprendre : navigation, densité, typographie ou espacements. Fournir son vrai logo et ses contenus. Mobbin rassemble des références d'applications ; Landbook des exemples de sites. [OpenAI : références visuelles](https://learn.chatgpt.com/docs/image-inputs), [Mobbin](https://mobbin.com/), [Landbook](https://land-book.com/).

Adapter le brief au support : une application demande écrans, parcours et erreurs ; un visuel demande format, style et texte exact ; une vidéo demande durée, scènes et rythme. Le parcours GitHub/Vercel concerne l'application web. Pour la vidéo, préparer le script et le découpage, puis réaliser dans un outil adapté.
