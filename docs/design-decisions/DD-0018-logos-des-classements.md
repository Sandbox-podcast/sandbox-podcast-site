# DD-0018 : logos des classements

Date : 2026-10-13. Décision : décidée par l'agent sur délégation (PD-0003), à la demande de Lou.

Les lignes des classements affichent une image de 38 pixels à gauche du nom, réduite à 28 pixels sur mobile. Le nom, le rang et les mesures restent inchangés. L'image est décorative et n'ajoute aucun texte aux lecteurs d'écran.

Pour GitHub, Rising et les skills ayant un dépôt, l'image est l'avatar de son propriétaire. GitHub n'attribue pas de logo distinct à chaque dépôt. Un compte personnel peut donc afficher une photo. L'association provient du champ repo ou d'un lien GitHub validé, jamais du nom du projet.

Pour les modèles, une table associe les éditeurs connus à leurs comptes GitHub officiels. Les quinze comptes ont été vérifiés le 13 octobre 2026 par leur profil public et leur site : Anthropic, OpenAI, Google DeepMind, Google, xAI, Moonshot AI, DeepSeek, Qwen, Z.ai, MiniMax, Meta, Mistral AI, Ai2, Microsoft et NVIDIA. Un éditeur inconnu conserve ses initiales.

Next.js charge, redimensionne et met les images en cache sur le serveur. Le navigateur reçoit une image depuis le site. La politique de contenu reste inchangée. Seuls les avatars HTTPS du chemin GitHub prévu avec size=80 sont ajoutés aux images autorisées. Aucun HTML ni SVG externe n'est injecté dans la page.

Les dimensions sont réservées avant le chargement. Une erreur d'image laisse les initiales visibles. Aucun accès à la base, changement de collecte, service payant ou secret supplémentaire n'est nécessaire.

Sources : [réponse GitHub des dépôts et avatar du propriétaire](https://docs.github.com/en/rest/repos/repos#get-a-repository), [Anthropic](https://github.com/anthropics), [OpenAI](https://github.com/openai), [Google DeepMind](https://github.com/google-deepmind), [Mistral AI](https://github.com/mistralai).

## Validation locale

L'aperçu est disponible sur http://127.0.0.1:3002/charts. Les images de GitHub et des éditeurs sont chargées depuis le cache d'images du site. Le rendu a été vérifié sur ordinateur et à 390 pixels, sans débordement horizontal.

Les 381 tests passent avec deux workers, dont les 35 tests des logos et des classements. L'exécution avec le parallélisme par défaut avait dépassé les cinq secondes de deux tests Postgres ; leurs délais et leur code restent inchangés. Le lint global, TypeScript et le build passent. Le contrôle global de format signale les fins de ligne CRLF du checkout Windows ; les fichiers sont vérifiés séparément sans réécriture globale.

Fichiers concernés : next.config.ts, chart-logos.ts, chart-logo.tsx, chart-logo.module.css, charts-ranking.tsx, charts-compact.module.css, chart-logos.test.ts, docs/site/README.md et cette décision. Les données des classements, la PR de refonte fusionnée et les travaux locaux des autres sujets ne sont pas modifiés. Cet ajout est proposé dans une PR distincte de la refonte.
