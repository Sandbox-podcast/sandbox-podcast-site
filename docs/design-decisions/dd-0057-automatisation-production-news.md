# DD-0057 Automatisation de SANDBOX News

- Date : 2026-10-18
- Statut : architecture et code décidés par l'agent sur délégation (PD-0003) ; mise en production non activée
- Origine : demande de Lou de générer et traduire automatiquement chaque nouvelle fiche, puis d'actualiser News sans intervention éditoriale régulière.

## Décision

GitHub Actions lance le collecteur environ une fois par heure. Il consulte les pages publiques inscrites dans `NEWS_MEDIA`, extrait les liens d'article récents, leur titre, leur date et un court passage public. Le collecteur ne contourne pas un refus d'accès. Il examine au plus trois candidats par média et conserve au plus quatorze jours de nouvelles dans le fil ; la base garde les anciens enregistrements, masqués du flux courant.

Les fiches françaises déjà rédigées restent prioritaires. Pour un nouvel article, Qwen3 1.7B, exécuté localement sur CPU dans le runner GitHub, prépare un titre et trois phrases. Il doit fournir trois citations exactes du passage collecté. Le code vérifie leur présence, le format du titre et des phrases, la date, l'URL et le registre des sources. Une fiche qui échoue à l'un de ces contrôles est écartée et pourra être retentée au prochain passage.

Le poids GGUF est fixé à une révision précise du [dépôt officiel Qwen sur Hugging Face](https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/tree/7fb011e9aee6e4dc7adf8430df9ea8de6a466aa3) et son SHA-256 est vérifié avant chargement. La fiche du modèle indique la licence Apache 2.0. Le moteur CPU est [llama-cpp-python](https://github.com/abetlen/llama-cpp-python) ; il n'appelle pas de service de génération distant.

Argos Translate produit les versions anglaise, espagnole et allemande à partir du français, avec l'anglais comme langue pivot pour l'espagnol et l'allemand. Le site n'accepte qu'une fiche qui possède son titre et ses trois phrases dans les quatre langues. L'API cron authentifiée valide le lot, refuse les doublons d'URL et les articles hors domaine/source, enregistre le résultat et actualise les quatre pages. Les sources restent attribuées à leurs éditeurs ; SANDBOX ne présente pas leurs articles comme les siens.

Le flux utilise Postgres/Neon déjà rattaché au site et le secret cron déjà employé par les classements. Aucune API d'IA ou de traduction payante n'est appelée. Le modèle, les bibliothèques et les paquets linguistiques sont téléchargés au premier passage puis mis en cache par GitHub Actions. Les minutes de runners restent soumises aux quotas GitHub. La cadence horaire est une cible, pas une garantie de délai.

La voix demandée par Lou s'applique aux résumés : accroche concise, explication structurée, mots simples, aucun emoji et ironie seulement lorsque les faits s'y prêtent. Le modèle doit rester factuel et éviter les titres trompeurs. Les textes sont signalés comme générés automatiquement et chaque fiche renvoie à sa source. Les contrôles automatiques vérifient des contraintes et des citations ; ils ne remplacent pas une relecture humaine ni une vérification indépendante de chaque affirmation.

## Activation

La fonctionnalité reste hors production jusqu'à la fusion et à la configuration manuelle. Son activation requiert :

1. appliquer `apps/site/drizzle/0016_sandbox_news_autopublishing.sql` à la base Neon ;
2. définir `SANDBOX_NEWS_PUBLIC=1` dans l'environnement de l'application Vercel ;
3. définir la variable GitHub `SANDBOX_NEWS_PUBLIC=true` et l'origine publique `SANDBOX_CHARTS_ORIGIN` ;
4. vérifier que le secret GitHub `SANDBOX_CHARTS_CRON_SECRET` correspond à `CRON_SECRET` dans Vercel ;
5. lancer le workflow `SANDBOX News refresh` depuis GitHub Actions et vérifier le résultat avant de considérer le flux opérationnel.

Le drapeau Vercel ouvre l'API privée et les pages indexables ; la variable GitHub autorise le workflow planifié. Avant configuration, la route publique reste fermée et les métadonnées gardent `noindex`. Après activation, le sitemap ajoute `/news` lorsqu'une fiche récente existe ; les variantes linguistiques annoncent leurs URL alternatives.

## Limites connues

Le collecteur lit la structure publique de dix sites et peut rater une nouvelle si leur HTML change. Une source peut refuser les requêtes ou publier sans date exploitable. Les citations exactes empêchent plusieurs erreurs de génération, mais ne prouvent pas à elles seules qu'une reformulation est fidèle. Argos peut produire une traduction maladroite. Les lots incomplets échouent sans publier de contenu partiel. Les tableaux Search Console et les Core Web Vitals doivent être reliés séparément pour mesurer l'indexation, les clics et l'expérience réelle.

L'activation, l'application de migration et la mesure du premier cycle restent à faire après revue de la PR. Aucun niveau de couverture, gain SEO ou classement Google n'est promis.
