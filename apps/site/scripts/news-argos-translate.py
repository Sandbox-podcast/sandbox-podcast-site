import json
import os
import sys

for stream in (sys.stdin, sys.stdout, sys.stderr):
    stream.reconfigure(encoding="utf-8", errors="strict")


def main():
    payload = json.load(sys.stdin)
    source_locale = payload.get("sourceLocale")
    target_locale = payload.get("targetLocale")
    texts = payload.get("texts")
    locale_codes = {"fr-FR": "fr", "en": "en", "es-ES": "es", "de-DE": "de"}

    if source_locale != "fr-FR" or target_locale not in ("en", "es-ES", "de-DE"):
        raise ValueError("Langue News non prise en charge.")
    if not isinstance(texts, list) or not texts or len(texts) > 400:
        raise ValueError("Lot de traduction News invalide.")
    if any(not isinstance(text, str) or not text.strip() or len(text) > 600 for text in texts):
        raise ValueError("Texte News invalide.")

    import argostranslate.translate
    from argostranslate import sbd

    sentence_model_directory = os.environ.get("SANDBOX_NEWS_SBD_DIR")
    if not sentence_model_directory:
        raise RuntimeError("Les modèles locaux de segmentation des phrases ne sont pas configurés.")
    sbd.minisbd_models.cache_dir = sentence_model_directory

    languages = {language.code: language for language in argostranslate.translate.get_installed_languages()}
    from_language = languages.get(locale_codes[source_locale])
    english = languages.get("en")
    to_language = languages.get(locale_codes[target_locale])
    if from_language is None or english is None or to_language is None:
        raise RuntimeError("Le modèle Argos requis n'est pas installé.")
    route = [from_language, english] if target_locale == "en" else [from_language, english, to_language]
    translated = []
    for text in texts:
        current = text
        for source, target in zip(route, route[1:]):
            translator = source.get_translation(target)
            if translator is None:
                raise RuntimeError(f"Le trajet Argos {source.code} vers {target.code} manque.")
            current = translator.translate(current)
        translated.append(current.strip())
    if any(not text for text in translated):
        raise RuntimeError("Argos a renvoyé une traduction vide.")
    json.dump({"translations": translated}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
