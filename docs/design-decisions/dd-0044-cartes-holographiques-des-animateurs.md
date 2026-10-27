# DD-0044 : cartes fantastiques holographiques des animateurs

Date : 2026-10-16. Conception décidée par l'agent sur délégation (PD-0003), à la demande de Lou.

La section "Les voix de Sandbox" présente Lou, Loïc et Nicolas sous la forme de trois cartes à collectionner. Après les premiers essais, Lou a demandé des visages intégrés à des personnages fantastiques, un cadre argenté plus lumineux et des titres positifs. Cette demande autorise l'illustration des costumes, corps et décors de cette section. Les photos biographiques et le montage du plateau restent distincts.

## Illustrations et identité

Les trois photographies publiées servent de références au générateur. Le prompt exige de conserver les traits, l'âge, la coiffure, la barbe, l'expression et la pose du visage. Les casques restent reconnaissables ; les microphones et le studio sont remplacés par des costumes et des mondes imaginaires.

Lou construit des mondes et des quêtes dans un paysage de citadelles flottantes, en cyan. Loïc assemble une machine arcanique dans un atelier d'inventions, en ambre. Nicolas dirige des automates dans un observatoire fantastique, en violet.

Les titres affichés sont "Créateur de quêtes du quotidien", "Inventeur, même sans Wi-Fi" et "Chef d'orchestre des agents". Les biographies gardent leurs deux paragraphes complets dans des volets HTML natifs "Faire connaissance". Elles restent dans le HTML initial et accessibles sans JavaScript. Les liens sociaux publiés sont conservés sous chaque carte.

Les numéros 001 / 003 à 003 / 003 indiquent la place dans cette collection. Aucune statistique, note, récompense ou rareté personnelle n'est inventée.

## Matière et mouvement

La présentation utilise des images sur toute la surface, un cadre argenté, des reflets irisés et des éclats facettés. Le [principe reverse holo](https://www.qpmarketnetwork.com/card-deck/reverse-holo-vs-holo/) guide la séparation entre le cadre brillant et le visage lisible. Les effets latéraux restent sur les bords ; ils ne couvrent pas le centre du portrait. Trois petits symboles SVG originaux distinguent les cartes.

Le mouvement s'inspire du [Holo Card de React Bits](https://reactbits.dev/components/holo-card), avec une implémentation locale en CSS et React. Aucun paquet, caméra ou moteur WebGL n'est ajouté.

La souris incline la carte dans une limite de sept degrés. Un seul callback requestAnimationFrame peut être en attente ; les valeurs transitoires restent dans des références et des variables CSS, sans rendu React par déplacement. La sortie du pointeur remet la carte à plat.

La réduction du mouvement et les pointeurs tactiles arrêtent l'inclinaison. Un changement du réglage système réinitialise immédiatement la carte. Aucune animation ne tourne en permanence. Sur mobile, une seule carte centrée occupe chaque ligne. La grille de l'équipe place les trois cartes ensemble sur ordinateur.

## Production et provenance

Outil intégré image_gen.imagegen, une génération par animateur. Les PNG produits restent dans generated_images de Codex. Les photos sources ne sont pas écrasées. Le relevé conserve leurs empreintes SHA-256, les prompts complets et les chemins : [production des illustrations](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/home-host-fantasy-prompts-2026-10-16.json).

Les WebP livrés sous apps/site/public/images/home/hosts sont encodés avec Sharp, qualité 90, en 1050 x 1400 pixels. Les poids sont de 447 256 octets pour Lou, 365 958 pour Loïc et 419 708 pour Nicolas. Leur contenu n'est pas retouché après génération. Ces scènes sont imaginaires ; elles ne remplacent pas les photographies des pages biographiques.

HOME_HOST_ARTWORK fournit les illustrations de l'accueil. Un profil sans illustration dédiée utilise sa photographie d'origine.

## Validation

Les tests ciblés des cartes et de l'accueil passent : 28 tests dans deux fichiers. Ils vérifient les illustrations dédiées, l'existence des photographies sources, la qualité 90, les identités, les deux paragraphes, les volets natifs et les liens sociaux. Le profil sans illustration possède un test de repli sur sa photo. Le lint ciblé passe.

Les trois illustrations ont été inspectées et décodées. Le contrôle navigateur et les vérifications globales sont intégrés au compte rendu du lot de l'accueil. Aucun commit, push ou publication n'est inclus dans cette retouche.

La revue navigateur finale confirme le rendu à 320, 390, 768 et 1440 pixels : trois cartes, illustrations dédiées en qualité 90, titres positifs, biographies complètes, liens natifs et ouverture au clavier. L'inclinaison reste bornée à sept degrés, se réinitialise à la sortie et s'arrête avec la réduction du mouvement ou un pointeur tactile. Aucun débordement horizontal ni erreur JavaScript n'est relevé. Les photos de l'équipe sont identiques à celles du commit de départ, empreintes Git comparées. Captures locales : apps/site/.local/home-host-cards/team-1440.png et team-390.png.

## Retouche du cartouche après revue de Lou

Lou trouve le panneau de texte trop gros. Le cartouche argenté opaque est remplacé par une légende sombre fondue dans le bas de l'illustration, sans bordure autour du texte. Les prénoms passent à 30-32 pixels et les symboles à 24 pixels. Le titre reste complet, avec un contraste clair sur le fond sombre. Les biographies, les visages, les illustrations et les effets holographiques restent conservés.

Le contrôle navigateur vérifie que la zone d'identité occupe au plus 22 % de la carte et que le prénom reste lisible sans dominer le portrait. Les quatre tailles 320, 390, 768 et 1440 pixels passent, avec les contrôles existants de liens, biographies, mouvement réduit et absence de débordement. Cette retouche reste locale et n'est pas ajoutée automatiquement à la PR du lot précédent.

Le contrôle global de cette retouche réussit : formatage, lint, types, 660 tests du site, 11 tests médias et 21 tests BIS. Les modifications concurrentes des autres conversations restent séparées de cette retouche.
