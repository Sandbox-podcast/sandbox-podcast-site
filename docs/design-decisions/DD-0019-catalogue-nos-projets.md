# DD-0019 : Catalogue Nos projets

- Date : 2026-10-13
- Statut : implémenté localement, publication par PR demandée par Lou
- Demande : catalogue et fiches d'applications reprenant la présentation de l'App Store
- Conception décidée par l'agent sur délégation (PD-0003)

La rubrique `/nos-projets` présente les projets personnels de Lou, Nicolas et Loïc. Les fiches utilisent `/nos-projets/[slug]`. Les routes existantes `/projects/[slug]`, réservées aux entités des classements, conservent leur rôle.

Le catalogue reprend les captures de référence fournies par Lou : grandes sélections illustrées, listes à icônes et boutons "Afficher". Les fiches présentent une icône, les informations vérifiées, une galerie, une description et les liens vers le projet. Le logo et la navigation Sandbox restent communs au site.

Correction demandée par Lou le 15 octobre 2026 : le fond gris et la police système propres à cette rubrique sont abandonnés. Le catalogue, les fiches, les filtres, les galeries et les aperçus utilisent les variables communes de DD-0002 : fond noir bleuté, surfaces bleu nuit, textes et bordures Sandbox, actions cyan et police Archivo. Les images et identités des projets conservent leurs couleurs d'origine. Application locale décidée par l'agent sur délégation (PD-0003).

Les fiches sont conservées dans `apps/site/content/personal-projects.json`, validées par Zod et générées sans collecte réseau à la visite. Chaque fiche indique ses sources et sa date de vérification. Les forks, miroirs de distribution et plugins d'une même application sont regroupés. KinBot et Hivekeep forment une seule fiche. Les travaux du compte AkashaBot sont reliés à Loïc par sa publication publique.

Les images officielles et les captures prises sur les applications publiques sont conservées en WebP dans `public/nos-projets`. Les galeries distinguent captures et illustrations. Les projets sans logo identifié affichent leurs initiales. Aucune note, aucun avis, aucun classement de popularité ni tarif non vérifié n'est créé.

Six vidéos publiques sont intégrées. Les vidéos issues de LinkedIn et X sont conservées localement pour éviter leurs URL signées. Les autres utilisent les fichiers publics stables des créateurs. Les lecteurs sont montés uniquement au clic. La CSP autorise ces fichiers sur les deux origines vérifiées, `marlburrow.github.io` et `raw.githubusercontent.com`, en plus du site. Chaque lecteur garde un lien vers sa publication d'origine.

MindOdyssey est affiché en préparation. ChromeHue est signalé comme archive. Les projets dont le site est indisponible renvoient au dépôt public. Une absence de capture ou de vidéo reste une absence, sans visuel de produit inventé.

Les deux modèles de pages sont partagés entre les quatre langues. Les libellés de la nouvelle rubrique sont ajoutés aux dictionnaires existants ; les descriptions non traduites conservent leur texte français. Les variantes localisées restent soumises au `noindex` existant et à leur revue. La recherche globale et le sitemap français intègrent les nouvelles fiches.

L'édition de cette collection passe pour l'instant par Git. Aucun compte, service payant, collecteur récurrent, migration ou formulaire d'administration n'est ajouté.

Inventaire, limites de collecte et validation : [guide Nos projets](../site/nos-projets.md).
