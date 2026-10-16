# DD-0045 : Épisode 002 BIS, conducteur visuel isolé

Date : 16 octobre 2026.

Décision décidée par l'agent sur délégation (PD-0003), dans le cadre de la demande de Lou. Les corrections explicites de Lou priment : ordre Radar, Build, Clash, Bêta ; pas de démonstration du Comptoir d'Anna dans le Build ; outils et cas d'usage dans le Build ; captures de sources et exemples vidéo dans le Radar.

## Isolation

Le prototype vit dans `experiments/episode-002-bis/`, hors de `apps/site/public/slides`. Il possède son HTML, ses styles, ses scripts, ses copies d'assets et un serveur local. Aucun branchement dans Next.js, aucun index de production modifié, aucun déploiement.

Le serveur ne répond qu'en boucle locale. Il expose `/episode-002-bis/`, une interface unique et une sortie 16:9 destinée à OBS. La publication éventuelle nécessite une demande distincte du propriétaire.

## Représentation et contenu

Le parcours compte 23 scènes : dix actualités, quatre intertitres, quatre sujets Build, quatre débats et un appel aux essais du public. Les 22 écrans originaux, leurs notes et 34 références restent conservés dans le dossier éditorial, sans modifier leur source. Les transitions historiques sont identifiées comme telles.

Le Radar affiche des captures réelles des sources, conservées localement, leur provenance, tous les points de discussion et les réserves éditoriales. Le menu Options permet de zoomer ou afficher un chiffre. Le Build présente onze usages, cinq outils et la méthode en trois étapes. Le Clash pose les questions aux trois animateurs sans préremplir leurs opinions. La Bêta sollicite les idées et questions du public.

Corrections demandées par Lou le 16 octobre 2026 : retrait de l'exemple du garage, renommage de "Boutique" en "Commerçant" et remplacement de "Boulangerie" par "Pâtisserie B2B". Ce dernier exemple décrit un bot Instagram qui récupère les commandes, génère les bons de commande et les factures, puis récapitule les commandes par client chaque semaine. Le commerçant dispose d'une base clients, d'une interface de saisie des achats et de points de fidélité ; les SMS promotionnels ciblent les clients absents depuis X mois.

L'exemple immobilier part des photos et du dossier du bien : visite virtuelle, styles de décoration, pièces sans meubles, assistant et réservation des visites. L'assistant répond uniquement si l'information est disponible et fiable. L'artisan envoie un vocal WhatsApp pour préparer et transmettre un devis selon ses propres tarifs, puis gérer les relances. Le restaurant conserve son menu en 3D et reçoit un second cas : un agent téléphonique prend les réservations, envoie une confirmation et répond aux questions pratiques. Les deux cas du restaurant portent des libellés distincts.

L'architecte paysagiste montre plusieurs aménagements et leur évolution dans le temps selon la localisation du terrain. Le boulanger prévoit sa production à partir des historiques de caisse, des jours fériés, des événements locaux et de la météo. Le compteur distingue onze cas pour dix métiers ; les numéros 10 et 11 et leur sélection directe fonctionnent comme les précédents.

Deux vidéos liées à Gemini sont proposées : un extrait du test de Sam Witteveen et une création 3D publiée par Google. Leur auteur et leur nature sont affichés. Elles ne sont chargées qu'à la demande, via le lecteur YouTube officiel. Aucun post X non vérifié n'est utilisé. Les vidéos dépendent du réseau ; les captures restent disponibles sans réseau externe.

## Commande et limites

Le serveur en mémoire synchronise les scènes et commandes entre la page principale et le lecteur séparé. La vidéo démarre à partir du même repère, sans garantie de synchronisation à l'image près. Le son est coupé au lancement ; les commandes du lecteur permettent de l'activer dans la sortie concernée. Les positions du Clash et le compteur sont éphémères. Le redémarrage du serveur remet le conducteur au début.

La copie de la démo déjà créée reste sur disque pour respecter la consigne de ne supprimer aucun fichier, mais elle est absente du parcours et n'est pas servie par le serveur BIS.

## Simplification demandée par Lou

Un écran de contenu en grand et une seule barre : Précédent, Sujets, Suivant, Options. Dans le Radar, chaque actualité tient sur un écran avec ses trois points affichés ensemble, à la demande de Lou le 16 octobre 2026. Précédent et Suivant changent directement d'actualité ; les pastilles et compteurs de points sont retirés. La capture partage l'écran avec une colonne de texte élargie.

Dans le Build, Précédent et Suivant parcourent les cas d'usage, outils et étapes avant de changer de sujet. Le retour est symétrique. Les écrans fixes ne génèrent pas de clics sans changement visible. Les métiers et outils restent directement sélectionnables.

Le panneau de régie, son bouton d'ouverture, les onglets de séquences redondants et la commande distincte « Développer » sont retirés. `?view=director` reste un lien valide et ouvre la même interface. Les notes, captures agrandies et vidéos sont accessibles dans Options ; les paramètres de diffusion sont repliés. Le plein écran garde les commandes de navigation. La sortie OBS reste sans commandes.

Décision locale et réversible, décidée par l'agent sur délégation (PD-0003), conformément à la demande explicite de simplification.

## Correctif de publication après la PR 69

Le 16 octobre 2026, Lou attend la disponibilité de `https://slides.sandboxpodcast.fr/episode-002-bis/index.html` après fusion. La livraison précédente ne publiait pas les fichiers du prototype : l’URL ne pouvait donc pas fonctionner.

Une copie statique dédiée est ajoutée dans `apps/site/public/slides/episode-002-bis/`, avec une liste explicite de fichiers et un contrôle de parité. Aucun fichier de l’épisode original, asset partagé ou routage existant n’est modifié. L’index des présentations reçoit seulement le lien BIS, conformément à son contrôle de cohérence. Le mode public utilise la synchronisation navigateur et n’appelle pas l’API du serveur local. Les entrées HTML diffèrent uniquement par ce mode. Décision décidée par l’agent sur délégation (PD-0003) dans le cadre de la correction demandée.
