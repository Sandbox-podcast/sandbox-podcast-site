# DD-0060 Publication d'un épisode sans durée

Date : 2026-10-19. Décision demandée par Lou ; mise en œuvre décidée par l'agent sur délégation (PD-0003).

La création d'un épisode demande une URL YouTube valide, un titre et un animateur. La description est facultative. Le formulaire affiche la miniature et un titre modifiable ; le second bloc de description et le résumé de métadonnées qui ressemblait à une étape de saisie sont retirés.

Une date YouTube disponible est conservée. Sinon, le site utilise l'instant où la vidéo est ajoutée au formulaire. Une actualisation de l'import ne décale pas cet instant. Une modification d'épisode conserve sa date enregistrée si le champ est vidé.

La durée devient facultative dans le schéma et le stockage éditorial JSON existant. Aucun lecteur caché ne cherche à la compléter. L'interface ne la demande plus. Une durée absente n'est remplacée ni par zéro ni par le dernier chapitre ; les pages et le balisage vidéo l'omettent. Une durée contredite par les chapitres est écartée à la sauvegarde d'un épisode existant.

Les horodatages présents dans la description alimentent les chapitres, y compris quand la durée est inconnue. Le lecteur public conserve sa miniature puis charge l'iframe YouTube au clic. L'admin ne modifie pas la description sur la chaîne YouTube.

Cette décision remplace l'obligation de date et de durée de DD-0058. Les contrôles d'identité, de droits de publication, d'origine et de doublon restent applicables. Aucune migration n'est nécessaire : les épisodes sont stockés dans les données JSON éditoriales.
