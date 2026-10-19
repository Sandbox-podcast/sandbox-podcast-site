import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location("news_summarize", Path(__file__).with_name("news-summarize.py"))
SUMMARY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SUMMARY)


class SummaryContractTests(unittest.TestCase):
    def test_skips_author_initials_and_keeps_exact_source_sentences(self):
        facts = [
            "The laboratory published a new model for analysing protein structures.",
            "The model accepts text and images and its weights use an open licence.",
            "The candidate still requires experimental validation in a laboratory.",
        ]
        source = "Several authors contributed, including Lucy J. " + " ".join(facts)
        self.assertEqual(SUMMARY.source_evidence(source), facts)
        self.assertTrue(all(fact in source for fact in SUMMARY.source_evidence(source)))

    def test_does_not_generate_without_three_complete_passages(self):
        class UnusedModel:
            def create_chat_completion(self, **_kwargs):
                raise AssertionError("Le modèle ne doit pas être appelé")
        item = {"url": "https://example.test/story", "headline": "Article public", "project": "Source", "sourceExcerpt": "A single incomplete public excerpt " * 20}
        self.assertIsNone(SUMMARY.generate(UnusedModel(), item)["summary"])

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


if __name__ == "__main__":
    unittest.main()
