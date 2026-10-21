import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location("news_summarize", Path(__file__).with_name("news-summarize.py"))
SUMMARY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SUMMARY)


class SummaryContractTests(unittest.TestCase):
    def test_keeps_source_sentences_above_old_240_character_limit(self):
        long_fact = "The laboratory published a model " + "with documented capabilities " * 8 + "for developers."
        self.assertGreater(len(long_fact), 240)
        self.assertLessEqual(len(long_fact), 320)
        source = long_fact + " The release includes weights under an open licence for independent inspection. Independent experimental validation remains necessary before clinical use."
        self.assertEqual(SUMMARY.source_evidence(source)[0], long_fact)

    def test_skips_author_initials_and_keeps_exact_source_sentences(self):
        facts = [
            "The laboratory published a new model for analysing protein structures.",
            "The model accepts text and images and its weights use an open licence.",
            "The candidate still requires experimental validation in a laboratory.",
        ]
        source = "Several authors contributed, including Lucy J. " + " ".join(facts)
        self.assertEqual(SUMMARY.source_evidence(source), facts)
        self.assertTrue(all(fact in source for fact in SUMMARY.source_evidence(source)))

    def test_does_not_generate_without_a_complete_passage(self):
        class UnusedModel:
            def create_chat_completion(self, **_kwargs):
                raise AssertionError("Le modèle ne doit pas être appelé")
        item = {"url": "https://example.test/story", "headline": "Article public", "project": "Source", "sourceExcerpt": "A single incomplete public excerpt " * 20}
        result = SUMMARY.generate(UnusedModel(), item)
        self.assertIsNone(result["summary"])
        self.assertEqual(result["reason"], "insufficient_source_sentences")

    def test_constrains_evidence_to_source_passages_and_allows_refusal(self):
        class ObservedModel:
            captured = None
            def create_chat_completion(self, **kwargs):
                self.captured = kwargs
                return {"choices": [{"message": {"content": '{"publish":false}'}}]}
        excerpt = "The laboratory published a model for analysing complex protein structures. The release includes model weights that developers can download and inspect. Independent experimental validation remains necessary before clinical use. The complete technical report is available on the laboratory website."
        model = ObservedModel()
        result = SUMMARY.generate(model, {"url": "https://example.test/story", "headline": "Article public", "project": "Source", "sourceExcerpt": excerpt})
        self.assertIsNone(result["summary"])
        proof = model.captured["response_format"]["schema"]["oneOf"][1]["properties"]["evidence"]["const"]
        self.assertEqual(proof, SUMMARY.source_evidence(excerpt))

    def test_accepts_one_or_two_complete_source_passages(self):
        class Model:
            def create_chat_completion(self, **kwargs):
                self.schema = kwargs["response_format"]["schema"]
                return {"choices": [{"message": {"content": '{"publish":false}'}}]}
        facts = ["The laboratory released a new open model.", "The weights use the Apache 2.0 licence."]
        for count in (1, 2):
            with self.subTest(count=count):
                model = Model()
                SUMMARY.generate(model, {"url": "https://example.test/story", "headline": "Public story", "project": "Source", "sourceExcerpt": " ".join(facts[:count])})
                properties = model.schema["oneOf"][1]["properties"]
                self.assertEqual(properties["evidence"]["const"], facts[:count])
                self.assertEqual(properties["sentences"]["minItems"], count)
                self.assertEqual(properties["sentences"]["maxItems"], count)


if __name__ == "__main__":
    unittest.main()
