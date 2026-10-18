import tempfile
import unittest
from pathlib import Path

from monter import captions, encode, timestamp


class MontageTests(unittest.TestCase):
    def test_timestamp_handles_rounding_and_hours(self):
        self.assertEqual(timestamp(1.9996), '00:00:02,000')
        self.assertEqual(timestamp(3661.125), '01:01:01,125')

    def test_captions_clip_both_edges_and_keep_accents(self):
        rows=[{'start':8,'end':12,'text':'Le besoin précède le code.'},
              {'start':12,'end':16,'text':' Vérifier le résultat.'},
              {'start':16,'end':16,'text':'Sans durée'}]
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'sous-titres.srt'
            captions(rows,10,14,path)
            result=path.read_text(encoding='utf-8')
            self.assertIn('00:00:00,000 --> 00:00:02,000',result)
            self.assertIn('00:00:02,000 --> 00:00:04,000',result)
            self.assertIn('précède',result)
            self.assertNotIn('Sans durée',result)

    def test_source_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'source.mp4'
            path.write_bytes(b'original')
            with self.assertRaises(ValueError):
                encode(path,0,1,path)
            self.assertEqual(path.read_bytes(),b'original')


if __name__=='__main__':
    unittest.main()
