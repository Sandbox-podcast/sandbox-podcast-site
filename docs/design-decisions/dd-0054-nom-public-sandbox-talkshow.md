# DD-0054 : nom public Sandbox TalkShow

Date : 2026-10-18. Décision demandée par Lou : utiliser "Sandbox TalkShow" sur tous les médias à la place de "Sandbox Podcast".

Le nom propre garde cette orthographe dans les quatre langues. Le site reprend ce nom dans ses réglages, le titre de la page des replays, les aperçus de partage et la page de confidentialité. Les anciens réglages publiés portant Sandbox ou Sandbox Podcast affichent aussi le nouveau nom ; un autre nom personnalisé reste respecté. Le kit YouTube et les métadonnées des prochains rendus de jingles sont alignés. Les URL, identifiants techniques, adresses de contact et contenus historiques restent stables. Cette décision précise DD-0042 et remplace le maintien de l'ancien nom prévu dans DD-0011.

## Contrôles des médias

- Spotify, émission `2Wp6S4qgRqQaV01AjkDcMH` : nom modifié et vérifié après rechargement dans Spotify for Creators. Avec l'accord explicite de Lou, la couverture portant "PODCAST" a été remplacée par `brand/social/sandbox-social-avatar.png`, puis sauvegardée et vérifiée après rechargement. La page publique affiche aussi Sandbox TalkShow au dernier contrôle de cette session.
- YouTube `@SandboxFR` : YouTube Studio affiche déjà Sandbox TalkShow, aucune modification nécessaire.
- Instagram `@sandbox.talkshow`, TikTok `@sandbox.talkshow` et X `@SandboxTalkShow` : les trois profils affichent déjà Sandbox TalkShow, vérifié dans le navigateur.

Preuves Spotify : [réglages après sauvegarde](../site/renommage-2026-10-18/spotify-settings.png) et [page publique](../site/renommage-2026-10-18/spotify-public.png).

## Limites

Le compte Spotify contient aussi un brouillon sans épisode publié, identifiant `2Kdm21jvYbL2VsVLl1j32c`. Après l'accord de Lou pour le vérifier et le renommer, la comparaison confirme le même auteur et une description strictement identique à l'émission principale. Il a été renommé Sandbox TalkShow, sauvegardé et vérifié après rechargement, sans publication d'épisode. Preuve : [réglages du brouillon](../site/renommage-2026-10-18/spotify-draft-settings.png).

Le site et les fichiers locaux attendent leur livraison autorisée. Aucun commit, push, déploiement ou nouvelle PR dans ce lot. Les médias déjà exportés ne sont pas réencodés.

## Validation locale

- 36 tests ciblés réussis : réglages, métadonnées sociales dans les trois traductions, confidentialité et localisation.
- 4 tests des assets de jingles réussis.
- ESLint réussit sur les sources et tests modifiés par ce lot.
- `git diff --check` réussit. La relecture du présent document par `fasst-human-quality/scripts/verifier.py` ne relève aucun caractère interdit.
- `pnpm check` a été lancé. Le dernier passage s'arrête au formatage de `src/domain/news-media.ts`, `src/domain/news-preview.ts` et `src/lib/news-preview-store.ts`, fichiers du travail News en cours. Le contrôle TypeScript lancé séparément échoue dans `src/pipeline/news-media-preview.ts:34` sur le paramètre facultatif `date`, hors de ce lot.
- Le premier passage complet des tests rencontrait aussi des fichiers temporaires Vitest introuvables. Les tests ciblés ont été relancés avec `TEMP` et `TMP` sous `.local/rename-test-temp` et réussissent. La configuration permanente du poste reste inchangée.

Fichiers du lot : réglages `apps/site/content/site.json` et `src/config/site.ts`, pages `src/app/(fr)/podcast/page.tsx` et `confidentialite/page.tsx`, `src/lib/seo.ts`, catalogue et trois dictionnaires `src/i18n/dictionaries/`, quatre tests correspondants, `brand/youtube/channel-copy.md`, `videos/render-jingles.mjs`, guides YouTube et Social Network Manager, index documentaire et preuves de cette décision. Ces chemins `src/` et `test/` sont relatifs à `apps/site`. Un passage Prettier a aussi formaté le CSS News déjà présent, sans changement de comportement.
