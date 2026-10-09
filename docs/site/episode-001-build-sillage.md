# Épisode 001 · Le Build · Sillage

Script de travail pour la séquence Build, consacrée à Sillage. Brouillon à itérer, pas une
version finale. Chaque bloc correspond à une slide du deck
(`apps/site/public/slides/episode-001/`, séquence « LE BUILD », 8 slides). Les passages entre
crochets sont des indications, pas du texte à lire.

La séquence reprend les six points du film de 54 s du site de Sillage
(`projects/sillage/site/film/sillage-film.mp4`), dans l'ordre du montage : continuité, projets,
multi-CLI, skills et MCP partagés, coordination, recherche ; puis la conclusion du film,
open source et auto-hébergé. Les visuels reprennent ceux du site et du film, redessinés en
HTML dans la charte du deck : le schéma « vous → Sillage → les trois CLI → vos fichiers » du
site (slide 01), la demande de permission et le téléphone (02), la brique posée au-dessus des
trois harnais (04), la bibliothèque et ses trois conduits (05), l'échange Claude Code / Codex
du film, traduit (06). Deux captures du film restent (board, recherche ; `site/screenshots/
*-dark.png`, démo Nimbus, réduites à 1600 px).

Durée visée : 8 à 10 minutes. Ton : première personne, concret, on assume les limites.

Cohérence : ne jamais dire « Sillage est mon harnais ». La slide 01 pose qu'il pilote les CLI
tels quels.

---

## Build 01 · Carte d'identité

[Logo, dépôt, auteur, licence. Lou lance la séquence, Nico enchaîne. Le film de 54 s peut
passer ici, avant la slide 02 : il annonce les six points dans le même ordre.]

Le Build de cette semaine, c'est mon projet : Sillage. Un espace de travail pour agents de
code. Open source, licence MIT, auto-hébergé, sur GitHub sous MarlBurroW/sillage.

Concrètement, c'est un serveur qui tourne chez moi, que j'ouvre depuis le navigateur ou le
téléphone. Derrière, il pilote les agents que j'utilise déjà : Claude Code, Codex et
OpenCode. Pas des copies, les vrais CLI, installés sur la machine, par leurs portes
officielles. Le harnais, la boucle autour du modèle, reste au CLI ; je n'y touche pas.
Sillage remplace la seule chose qui ne voyage pas : le terminal.

## Build 02 · Continuité

[Capture mobile, conversation en cours. Point 01 du film : la demande de permission sur le
bureau, puis le « Allow » tapé sur le téléphone.]

Le nom vient de là. Le sillage, c'est la trace qu'un bateau laisse derrière lui. Dans l'outil,
c'est le journal de tout ce que font les agents, dans l'ordre, et rejouable. Ce journal fait
foi, l'interface n'en est qu'une projection. Donc le navigateur peut se fermer, le métro peut
couper le réseau, l'agent continue sur le serveur. Quand je rouvre, le fil se rejoue.

Et ce qui bloque un agent, en général, ce n'est pas le modèle, c'est qu'il attend quelqu'un.
Une permission, une question, un diff à relire. Tout ça remonte sur le téléphone, en PWA,
avec une notification push quand un tour finit ou qu'un agent attend, et on répond de là.

[Condition à dire : la machine hôte reste allumée et joignable.]

## Build 03 · Projets

[Capture du board. Point 02 du film : les cartes arrivent dans les colonnes, une carte
s'ouvre sur son onglet Sessions.]

Un projet dure plus longtemps qu'une conversation. Chaque projet a son board, et chaque carte
garde la tâche et ses conversations ensemble : description, pièces jointes, sessions liées,
notes. On lance une conversation depuis la carte, et l'agent suivant lit ce qui précède.

Les agents lisent les cartes, en créent, laissent une note en fin de session. Mais ils ne
déplacent pas une carte. Dans le code, le commentaire dit : « Déplacer serait se donner un
satisfecit. » C'est moi qui décide qu'une tâche est finie.

## Build 04 · Multi-CLI

[Capture d'une session Codex. Point 03 du film : Claude Code → Codex → OpenCode, « même
projet, même historique, un SILLAGE.md pour les trois ».]

Le CLI se choisit par conversation, avec ses outils, ses permissions et son comportement
d'agent. Chaque adaptateur traduit ses événements dans un seul journal, donc la même
interface, le même historique et le même board pour les trois.

Et le contexte est partagé. SILLAGE.md : un seul jeu de consignes, une partie commune et une
partie par projet, injecté dans le prompt des trois CLI. La mémoire de projet : le format
natif de Claude Code ; Claude écrit dedans nativement, Codex et OpenCode passent par les
outils MCP. Ce qu'un CLI apprend, les autres le savent.

## Build 05 · Skills et MCP partagés

[Capture des réglages MCP. Point 04 du film : la bibliothèque, puis trois conduits vers les
trois CLI.]

Trois CLI, ça fait normalement trois façons de déclarer les skills et les serveurs MCP. Dans
Sillage, il n'y en a qu'une. Un skill écrit une fois s'utilise depuis Claude, Codex et
OpenCode. Un serveur MCP se déclare une fois et s'active par conversation. Tout ça est passé
aux CLI en mémoire au lancement : rien n'est écrit dans leurs fichiers de configuration.

## Build 06 · Coordination

[Schéma des sessions. Point 05 du film, le climax : avant de modifier, Claude regarde qui
travaille ; il prévient Codex, Codex répond avec une remarque utile, Claude s'adapte.]

Là on arrive à la partie que je préfère. Avec plusieurs sessions sur le même projet, le
problème classique, c'est qu'elles s'ignorent. Deux agents touchent le même fichier, l'un
défait ce que l'autre vient de faire.

Dans Sillage, chaque conversation reçoit d'office un serveur MCP, avec une vingtaine
d'outils. Avant de modifier un fichier, un agent peut voir qui d'autre travaille sur le
projet, savoir qui a touché ce fichier et dans quelle conversation, envoyer un message à
cette session, même si elle tourne sur un autre CLI, demander à être prévenu quand elle a
fini, lire les décisions passées, laisser une note sur la carte, et même lancer une nouvelle
session avec son CLI, son modèle et son worktree.

[Limite à dire franchement.]

Ça aide les agents à se coordonner. Ça ne verrouille pas les fichiers, ça n'empêche pas un
conflit de merge. C'est de la communication, pas une garantie.

## Build 07 · Recherche

[Capture de la palette, requête « offline ». Point 06 du film.]

Ctrl K, et on cherche en plein texte dans toutes les conversations, de tous les projets, quel
que soit l'agent qui les a menées. Les agents ont la même recherche par leurs outils : une
décision prise avec Claude il y a trois semaines se retrouve depuis une session Codex.

## Build 08 · Votre machine, votre liberté

[Capture d'une conversation Claude Code, lien GitHub. Conclusion du film : open source,
auto-hébergé.]

Pour finir, ce que Sillage n'est pas. Ce n'est pas un IDE, ce n'est pas du cloud, il n'y a
pas de sandbox. C'est fait pour un cercle de confiance : moi, et quelques personnes à qui je
donne un compte. Pas pour être exposé au public.

Et Sillage est construit avec l'IA, massivement. Claude Code et Codex ont écrit l'essentiel du
code, la plupart du temps depuis Sillage lui-même, souvent depuis mon téléphone.

Il y a un script d'installation pour Linux, macOS et WSL, une image Docker et un chart Helm.
Si vous testez, les issues sont ouvertes.

[Transition vers Le Clash.]

---

## Retiré de la version précédente

Trois slides ne correspondaient à aucun point du film et ont été retirées : le schéma « C'est
quoi, Sillage ? » (le principe tient maintenant dans la slide 01), la planification et la
page Services, et les chiffres du dépôt. Les reprendre si l'épisode a le temps.

## Points à trancher ensemble

- Qui pose les relances : Lou, Loïc, ou personne.
- Montrer le film de 54 secondes (`projects/sillage/site/film/sillage-film.mp4`) entre la
  slide 01 et la slide 02.
- Faire une démo en direct depuis le téléphone pendant la slide 02, ou s'en tenir aux captures.
- L'explication du harnais n'a plus de slide dédiée ; elle tient en trois phrases dans la
  slide 01. Si elle doit vivre ailleurs dans l'épisode, c'est au Radar ou au Clash.
