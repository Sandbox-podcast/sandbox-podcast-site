import unittest
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("news_argos", Path(__file__).with_name("news-argos-translate.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
translate_preserving_markers = module.translate_preserving_markers


class Translator:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = []

    def translate(self, text):
        self.calls.append(text)
        return next(self.responses)


class MarkerTests(unittest.TestCase):
    def test_keeps_valid_translation_without_retry(self):
        translator = Translator(["Value ZXQAQXZ."])
        self.assertEqual(translate_preserving_markers(translator, "Valeur ZXQAQXZ."), "Value ZXQAQXZ.")
        self.assertEqual(len(translator.calls), 1)

    def test_retries_missing_marker_with_bracket_aliases(self):
        translator = Translator(["Missing.", "From [A] to [B]."])
        self.assertEqual(
            translate_preserving_markers(translator, "De ZXQAQXZ à ZXQBQXZ."),
            "From ZXQAQXZ to ZXQBQXZ.",
        )
        self.assertEqual(translator.calls[1], "De [A] à [B].")

    def test_rejects_missing_or_duplicated_alias(self):
        for invalid in ["Missing.", "[A] and [A]."]:
            with self.subTest(invalid=invalid):
                with self.assertRaises(RuntimeError):
                    translate_preserving_markers(Translator(["Missing.", invalid]), "ZXQAQXZ.")

    def test_does_not_replace_existing_bracket_content(self):
        translator = Translator(["Missing."])
        with self.assertRaises(RuntimeError):
            translate_preserving_markers(translator, "ZXQAQXZ [A].")
        self.assertEqual(len(translator.calls), 1)


if __name__ == "__main__":
    unittest.main()
