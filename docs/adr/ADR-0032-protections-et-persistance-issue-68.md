# ADR-0032 : protections et persistance de l'issue 68

Date : 16 octobre 2026. Statut : accepté pour le code local, mise en service distante à autoriser.

Décision décidée par l'agent sur délégation (PD-0003). La demande de Lou autorise les corrections locales et la mise à jour de l'issue 68. Elle ne remplace pas les autorisations de commits, pushes, migrations distantes et publications prévues par AGENTS.md.

## Connexions administratives

Le compteur en mémoire ne protège pas plusieurs instances Vercel. La migration additive `0015_admin_login_attempts.sql` crée un compteur Postgres partagé. Un `INSERT ... ON CONFLICT` réserve atomiquement une tentative ; cinq tentatives sont admises par fenêtre de quinze minutes. Le compteur plafonne à six et les lignes expirées depuis un jour sont nettoyées lors des tentatives suivantes. La base fournit l'horloge.

La clé est un HMAC de l'adresse, avec `SITE_ADMIN_SECRET`. Aucune IP brute n'est conservée. Les représentations IPv6 équivalentes sont normalisées. L'en-tête `x-forwarded-for` n'est utilisé que sur Vercel, qui le remplace selon sa [documentation](https://vercel.com/docs/headers/request-headers). Hors Vercel, les tentatives partagent une clé pour ne pas faire confiance à un en-tête arbitraire. Un autre hébergeur devra fournir un adaptateur de confiance explicite.

En production, une base absente, un schéma incomplet ou une erreur du compteur bloque la connexion avec une indisponibilité. Il faut appliquer 0015 avant de déployer ce code. Cette protection limite les tentatives par adresse ; elle ne prétend pas arrêter une attaque distribuée depuis plusieurs adresses. Elle ne remplace pas une protection de l'hébergeur.

## CSP

L'administration est déjà dynamique. Le proxy Next.js 16 lui attribue un nonce aléatoire de 128 bits par requête, transmis au rendu et à l'en-tête CSP. Les scripts sans nonce et les gestionnaires inline sont refusés. Le nonce reçu d'un client est écrasé. La réponse est privée et non mise en cache.

Les pages publiques gardent leur rendu statique/ISR et leur CSP avec `unsafe-inline` pour les scripts d'hydratation. `script-src-attr 'none'` bloque leurs attributs événementiels inline. Cette limite est explicitement conservée : passer tout le site en rendu dynamique uniquement pour les nonces aurait un effet sur le cache et les performances. Un remplacement par des empreintes doit couvrir les scripts générés à chaque rendu ISR avant d'être adopté. Aucun HTML utilisateur libre n'est ajouté ; les aperçus HTML restent isolés. Les SVG de badges conservent leur CSP restrictive distincte.

## Identité des modèles

Un slug généré peut changer avec les fournisseurs disponibles. Avant d'insérer des modèles, le collecteur recherche leurs identifiants exacts de source dans une transaction protégée par un verrou commun. Un seul rapprochement actif et sans contradiction de variante réutilise le slug connu, ses sources et ses mesures. Plusieurs correspondances ou des références contradictoires bloquent le lot. Une collecte ne réactive plus une entité exclue manuellement.

Il n'y a aucune fusion par nom ni suppression de mesure historique. Les doublons existants exigent une revue de leurs références avant une correction de données autorisée.

## Journal YouTube

Le stockage distant choisi est Postgres, compatible avec Neon déjà utilisé par le site. Aucun compte ni abonnement supplémentaire n'est créé. `YOUTUBE_JOURNAL_DATABASE_URL` désigne une connexion directe avec TLS, sans pool de transactions, car le verrou de polling appartient à la session.

Le schéma dédié `tools/youtube-growth/sql/001_durable_journal.sql` conserve les intentions, résultats et curseurs. Une intention est validée dans la base avant un appel d'écriture YouTube. Après une interruption, une intention non terminée impose une vérification manuelle ; elle n'est jamais rejouée automatiquement. Une opération terminée est reconnue par son identité stable : chaîne et vidéo pour le commentaire, chaîne et commentaire parent pour la réponse, chaîne, vidéo source et empreinte du média pour l'upload. Changer un texte généré ne contourne pas cette protection.

Un verrou Postgres empêche deux pollings simultanés d'une chaîne. GitHub Actions refuse toute écriture sans journal distant. SQLite reste disponible pour un usage local. Une perte des anciens fichiers SQLite ne permet pas de déduire les anciennes écritures : conserver ces journaux et réconcilier les opérations avant une première activation distante. La nouvelle implémentation ne prétend pas avoir importé l'historique réel.

Les publications automatiques restent désactivées. OAuth, la revue initiale, les permissions du rôle Postgres, la sauvegarde et l'accord de publication doivent précéder l'activation.

## Vérification

Les tests couvrent la concurrence, l'expiration et le refus des connexions non protégées, les nonces distincts, la conservation des identités et des exclusions, les reprises YouTube avec deux connexions Postgres, les opérations ambiguës et les uploads répétés. Les preuves d'exécution et limites figurent dans le [rapport de l'issue 68](../site/issue-68-2026-10-16.md).
