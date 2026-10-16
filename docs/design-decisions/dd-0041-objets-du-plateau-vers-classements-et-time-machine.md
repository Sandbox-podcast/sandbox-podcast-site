# DD-0041 : objets du plateau vers les classements et la Time Machine

16 octobre 2026. Conception décidée par l'agent sur délégation (PD-0003), à la demande de Lou.

Deux objets sont intégrés dans l'illustration du plateau desktop : une télévision rétro affichant trois rangs et une DeLorean miniature dans une vitrine avec les dates 1996 et 2026. La télévision ouvre `/charts` et la voiture ouvre `/time-machine`. Ce sont des liens accessibles au clavier, avec un contour au focus, sans bouton ni étiquette ajoutés sur le décor. Les barres de la télévision sont décoratives et ne prétendent pas représenter des scores réels.

Les deux liens publics sont présents indépendamment du prototype du vidéoclub, qui conserve son accès réservé au développement. Le mobile garde l'accueil éditorial et les liens existants vers les rubriques. Les portraits des animateurs ne sont pas retouchés ; le nouveau fond sans chaises remplace le fond et son ancien masque correctif.

## Asset et provenance

ImageGen intégré, édition de `studio-chairless-v2.webp`. Résultat source conservé : `C:/Users/Lou/.codex/generated_images/01a14076-a18e-77f1-a4b2-9ee6592e8d66/exec-73392e84-2258-4dcb-94f7-ce62bc6267c5.png`.

Fichier utilisé : `apps/site/public/images/home/studio-easter-eggs-v3.webp`, 1672 x 941 pixels, 223 046 octets. Conversion WebP qualité 92 sans recadrage. Les assets précédents restent disponibles.

Prompt transmis :

```text
Use case: precise-object-edit. The attached image is the EDIT TARGET, a finished photorealistic podcast studio background plate. Add TWO tasteful physical Easter egg props into this exact room. Preserve the existing room, viewpoint, architecture, central shelves, blue lighting, amber strips, plants except any foliage immediately behind the new props, door at x64.4%-71.65% y9.9%-37%, table and foreground precisely. No people or chairs. Keep canvas 16:9 and framing identical. Do not recompose or zoom. Object 1: at the LEFT back wall, on the wood-slatted panel and adjacent dark column, place a compact wall-mounted high-end retro television in dark charcoal with a slim warm brass edge, rectangle occupying approximately x18%-30%, y12%-27% of the whole canvas. A discreet little floating walnut shelf supports it. The luminous dark screen displays the small exact French heading 'CLASSEMENTS' and an elegant visual podium of three cyan horizontal ranking bars with ranks 01, 02, 03; no company names, no invented scores. It is a real screen photographed in the room, subtle cyan screen reflection, no flat UI stuck over the image. Object 2: in the RIGHT back wall upper area, approximately x78%-90%, y11%-26%, incorporate a refined dark walnut-and-brass glass display shadowbox containing a small silver DeLorean time machine model, unmistakable angular stainless car, black wheels and one gull-wing door raised. It is an exquisite collectible model, not a full-size car. Beneath the model a tiny amber digital time-circuit display reads '1996' and '2026' to evoke the history of AI. The objects should be discernible and inviting but restrained, with realistic perspective, tiny material wear, plausible glass reflections and physical shadows matching the studio. Keep the central top 35% of the image between x32%-63% visually quiet for the existing headline. No clickable labels, no arrows, no website UI, no additional logos, no overlay text, no watermark. High-end cinematic interior photograph, retain the rich warm wood and cool slate mood of the original.
```

## Contrôles

Les 33 tests ciblés de l'accueil et du vidéoclub passent après cette modification. Ils vérifient les destinations publiques, la présence des liens sans activation du vidéoclub et le budget de 300 Ko du décor.

À 1440 x 900, le navigateur confirme que les centres des trois zones cliquables correspondent aux liens attendus, sans interception par le titre ou les portraits. Les dimensions des liens sont supérieures à 44 pixels dans chaque axe.

Les classements et la Time Machine s'ouvrent au clic ; les deux accès sont également vérifiés avec Entrée au clavier. La porte démarre son animation et ouvre le vidéoclub. À 1024 x 768, le décor est recentré pour conserver la télévision dans la fenêtre. À 390 x 844, le plateau et ses liens sont masqués, la carte mobile est présente et la page ne déborde pas horizontalement.

Capture du rendu : [accueil desktop](../site/refonte-2026-10-15/captures/accueil-easter-eggs-v13.jpg).
