# Épisode 001 · Le Build · Sillage

Script de travail pour la séquence Build, consacrée à Sillage. Brouillon à itérer, pas une
version finale. Chaque bloc correspond à une slide du deck
(`apps/site/public/slides/episode-001/`, séquence « LE BUILD », 8 slides). Les passages entre
crochets sont des indications, pas du texte à lire. Les chiffres viennent du dépôt
`projects/sillage` au 8 octobre 2026.

Durée visée : 8 à 10 minutes. Ton : première personne, concret, on assume les limites.

Cohérence : ne jamais dire « Sillage est mon harnais ». La slide 02 pose qu'il n'en est pas
un.

---

## Build 01 · Carte d'identité

[Logo, dépôt, auteur, licence. Lou lance la séquence, Nico enchaîne.]

Le Build de cette semaine, c'est mon projet : Sillage. Un espace de travail pour agents de
code. Open source, licence MIT, auto-hébergé, sur GitHub sous MarlBurroW/sillage.

Premier commit fin juillet, dix-huit versions depuis, et un seul humain au clavier. Le point
de départ est presque égoïste : je voulais un seul endroit, sur un serveur à moi, que je
puisse ouvrir depuis mon téléphone et continuer à bosser. Sans trimballer un laptop, sans
garder une dizaine de terminaux ouverts quelque part.

## Build 02 · C'est quoi, Sillage ?

[Schéma : téléphone, Sillage sur le serveur, CLI natifs, dépôts.]

Concrètement, c'est un serveur qui tourne chez moi. Je l'ouvre depuis le téléphone ou le
navigateur, c'est une PWA. Et derrière, il pilote les agents que j'utilise déjà : Claude Code,
Codex et OpenCode. Pas des copies, les vrais CLI, installés sur la machine, par leurs portes
officielles. Claude Code par l'Agent SDK, Codex par son mode app-server, OpenCode par son
serveur HTTP. Trois protocoles différents, traduits dans un seul journal d'événements.

[Relance à placer ici : « Mais du coup, Sillage, c'est un harnais ? »]

Non, et c'est important. Le harnais, c'est la boucle autour du modèle : les prompts, les
outils et leur exécution, les permissions, les vérifications. C'est ce qui fait qu'un agent
est bon ou mauvais sur un vrai projet. Et ça, c'est le CLI qui le fait, je n'y touche pas.

La plupart des interfaces web pour agents réécrivent cette boucle. Le résultat, c'est un
agent moins bon derrière une interface plus jolie. Sillage est autour des harnais : il leur
donne le contexte, la mémoire, les outils de coordination et un endroit où tourner, et il
leur laisse la boucle. Il remplace la seule chose qui ne voyage pas : le terminal. Le jour où
Claude Code sort une fonctionnalité, je ne la réimplémente pas, je l'ai.

## Build 03 · Le navigateur se ferme, l'agent continue

[Capture mobile, conversation en cours.]

Le nom vient de là. Le sillage, c'est la trace qu'un bateau laisse derrière lui. Dans l'outil,
c'est le journal de tout ce que font les agents, dans l'ordre, et rejouable. Ce journal fait
foi, l'interface n'en est qu'une projection. Donc le navigateur peut se fermer, le métro peut
couper le réseau, l'agent continue sur le serveur. Quand je rouvre, le fil se rejoue, et je
retrouve exactement où ça en est.

Et ce qui bloque un agent, en général, ce n'est pas le modèle, c'est qu'il attend quelqu'un.
Une permission, une question, un plan à valider. Tout ça remonte sur le téléphone, et on
répond de là. Trois détails qui changent la vie :

- Les notifications push, sans compte chez un tiers, une seule par fil.
- La dictée, avec le vocabulaire tiré du dépôt et de la branche, donc les noms de fichiers
  et de fonctions sont bien écrits.
- Le recadrage en cours de tour : on écrit pendant que l'agent travaille, et le message
  attend, ou s'injecte tout de suite.

[Détail si le temps le permet : une session Claude, c'est 450 Mo de RAM. Sillage plafonne à
trois sessions actives et endort une session après trente minutes. Elle reprend de manière
transparente quand on revient.]

## Build 04 · Ils savent qui travaille

[Schéma des sessions.]

Là on arrive à la partie que je préfère. Avec plusieurs sessions sur le même projet, le
problème classique, c'est qu'elles s'ignorent. Deux agents touchent le même fichier, l'un
défait ce que l'autre vient de faire.

Dans Sillage, chaque conversation reçoit d'office un serveur MCP, avec une vingtaine
d'outils. Un agent peut voir qui d'autre travaille sur le projet et sur quoi, savoir qui a
modifié tel fichier et dans quelle conversation, envoyer un message à une autre session ou à
toutes, demander à être prévenu quand une autre a fini, chercher dans l'historique de toutes
les conversations quel que soit le CLI, et même lancer une nouvelle session avec son CLI, son
modèle et son worktree.

[Limite à dire franchement.]

Ça aide les agents à se coordonner. Ça ne verrouille pas les fichiers, ça n'empêche pas un
conflit de merge. C'est de la communication, pas une garantie.

## Build 05 · Un contexte commun

[Schéma : SILLAGE.md et MEMORY.md.]

Trois CLI, ça fait normalement trois fichiers de consignes, trois mémoires, trois façons de
déclarer les serveurs MCP et les skills. Dans Sillage, il n'y en a qu'une.

- SILLAGE.md : un seul jeu de consignes, une partie commune à tous les projets et une partie
  par projet, injecté dans le prompt des trois CLI.
- La mémoire de projet : le format natif de Claude Code, un index et une note par fichier.
  Claude écrit dedans nativement, Codex et OpenCode passent par les outils MCP. Ce qu'un CLI
  apprend, les autres le savent.
- Les skills et les serveurs MCP : déclarés une fois, livrés à chaque agent sous sa forme
  native.
- Et le board du projet. Les agents lisent les cartes, en créent, et laissent une note en fin
  de session : ce qui est fait, ce qui reste. Mais ils ne déplacent pas une carte. Dans le
  code, le commentaire dit : « Déplacer serait se donner un satisfecit. » C'est moi qui décide
  qu'une tâche est finie.

## Build 06 · Pendant que je suis absent

[Capture de la page Scheduling.]

Dernière brique : le travail qui doit se faire quand je ne suis pas là. Ni Claude Code ni
Codex n'ont de planificateur durable. Le cron de Claude meurt avec sa session, Codex n'en a
pas.

Sillage rejoue un prompt à intervalle, en cron, ou à une date. Chaque exécution part dans
une session neuve, avec une durée maximale, et reçoit la dernière réponse de l'exécution
précédente. Exemple : tous les lundis, vérifier les nouvelles versions des CLI, lire le
changelog, ouvrir une carte si quelque chose nous concerne. Les agents peuvent eux-mêmes
planifier une tâche.

Il y a aussi une page Services, qui liste les processus lancés par les agents, avec leurs
ports et la conversation d'origine. Parce qu'un agent qui lance un serveur de dev et
l'oublie, ça arrive tout le temps.

## Build 07 · Construit depuis lui-même

[Slide chiffres.]

Quelques chiffres, parce que c'est aussi ça le sujet. Dix semaines, 256 commits, 18 versions,
environ 81 000 lignes de TypeScript, 142 tests côté serveur.

Et Sillage est construit avec l'IA, massivement. Claude Code et Codex ont écrit l'essentiel du
code, la plupart du temps depuis Sillage lui-même, souvent depuis mon téléphone. L'outil et
la façon dont je travaille dessus ont grandi ensemble.

[Anecdote si le temps le permet.]

La machine de dev de départ, c'est un Ryzen 3 avec 15 Go de RAM dont 10 déjà pris. C'est ce
qui a imposé le plafond de sessions et un daemon limité à 256 Mo. On m'a demandé pourquoi pas
Rust : on gagnerait 50 Mo sur le daemon, à côté des 450 Mo d'une seule session Claude. C'est
le mauvais côté du compromis.

## Build 08 · Ce que ça n'est pas

[Capture d'une permission, lien GitHub.]

Pour finir, ce que Sillage n'est pas, et ce qui reste à faire.

- Ce n'est pas un IDE, ce n'est pas du cloud, il n'y a pas de sandbox.
- C'est fait pour un cercle de confiance : moi, et quelques personnes à qui je donne un
  compte. Pas pour être exposé au public.
- Deux chantiers ouverts : les sous-agents côté Codex, et le recadrage en cours de tour côté
  Claude.

Il y a un script d'installation pour Linux, macOS et WSL, une image Docker et un chart Helm.
Si vous testez, les issues sont ouvertes.

[Transition vers Le Clash.]

---

## Points à trancher ensemble

- Qui pose les relances : Lou, Loïc, ou personne.
- Montrer le film de 54 secondes (`projects/sillage/site/film/sillage-film.mp4`) entre la
  slide 01 et la slide 02.
- Faire une démo en direct depuis le téléphone pendant la slide 03, ou s'en tenir aux captures.
- L'explication du harnais n'a plus de slide dédiée ; elle tient en trois phrases dans la
  slide 02. Si elle doit vivre ailleurs dans l'épisode, c'est au Radar ou au Clash.
