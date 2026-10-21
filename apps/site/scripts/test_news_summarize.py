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
        properties = model.captured["response_format"]["schema"]["oneOf"][1]["properties"]
        self.assertNotIn("evidence", properties)

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
                self.assertNotIn("evidence", properties)
                self.assertEqual(properties["sentences"]["minItems"], 1)
                self.assertEqual(properties["sentences"]["maxItems"], count)

    def test_quotes_never_enter_the_native_grammar_and_proofs_remain_exact(self):
        import json
        facts = ['The team calls the feature "thinking mode" for image generation.', 'The release accepts paths such as C:\\models\\draft and quoted inputs.']
        class Model:
            def create_chat_completion(self, **kwargs):
                schema = json.dumps(kwargs["response_format"]["schema"])
                for fact in facts:
                    assert fact not in schema
                result = {"publish": True, "title": "Un mode de réflexion", "category": "models", "sentences": ["Le mode est publié.", "Il accepte des chemins."], "source_indices": [0, 1]}
                return {"choices": [{"message": {"content": json.dumps(result)}}]}
        result = SUMMARY.generate(Model(), {"url": "https://example.test/story", "headline": "Release", "project": "Source", "sourceExcerpt": " ".join(facts)})
        self.assertEqual(result["summary"]["evidence"], facts)

    def test_can_select_one_useful_passage_and_rejects_invalid_proof_indices(self):
        import json
        facts = ["The publisher introduces its weekly newsletter for readers.", "The model weights are available under the Apache 2.0 licence.", "The full documentation is available from the project website."]
        class Model:
            def __init__(self, indices): self.indices = indices
            def create_chat_completion(self, **kwargs):
                value = {"publish": True, "title": "Des poids ouverts", "category": "models", "sentences": ["Les poids sont disponibles sous licence Apache 2.0."], "source_indices": self.indices}
                return {"choices": [{"message": {"content": json.dumps(value)}}]}
        item = {"url": "https://example.test/story", "headline": "Release", "project": "Source", "sourceExcerpt": " ".join(facts)}
        self.assertEqual(SUMMARY.generate(Model([1]), item)["summary"]["evidence"], [facts[1]])
        for indices in ([3], [-1], [True], [1, 1], [], ["1"]):
            with self.subTest(indices=indices):
                self.assertEqual(SUMMARY.generate(Model(indices), item)["reason"], "invalid_summary")


if __name__ == "__main__":
    unittest.main()
