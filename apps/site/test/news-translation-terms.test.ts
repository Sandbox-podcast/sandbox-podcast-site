import { describe, expect, it } from 'vitest';
import {
  prepareNewsTranslation,
  restoreNewsTranslation,
  newsTranslationKeepsNumbers,
} from '../src/domain/news-translation-terms';

describe('unités et valeurs des traductions News', () => {
  it.each([
    ['en', 'AI policy'],
    ['es-ES', 'política sobre la IA'],
    ['de-DE', 'KI-Politik'],
  ] as const)(
    'ne transforme pas une politique face à l’IA en opposition à l’IA (%s)',
    (locale, expected) => {
      const source = "Ils devraient définir leur politique face à l'IA.";
      expect(prepareNewsTranslation(source)).toBe('Ils devraient définir leur SBXAIPOLICY.');
      expect(restoreNewsTranslation(source, 'SBXAIPOLICY', locale)).toBe(expected);
    },
  );
  it('conserve une opposition explicite lorsqu’elle figure dans le texte français', () => {
    const source = "Le groupe annonce une politique contre l'IA.";
    expect(prepareNewsTranslation(source)).toBe(source);
  });

  const source =
    'Le prix est de 2 $ par million de tokens d’entrée et de 10 $ par million de tokens de sortie.';
  it('conserve la distinction entre entrée et sortie dans les trois langues', () => {
    expect(prepareNewsTranslation(source)).toContain('SBXINPUTTOKENS');
    expect(prepareNewsTranslation(source)).toContain('SBXOUTPUTTOKENS');
    for (const [locale, input, output] of [
      ['en', 'input tokens', 'output tokens'],
      ['es-ES', 'tokens de entrada', 'tokens de salida'],
      ['de-DE', 'Eingabetokens', 'Ausgabetokens'],
    ] as const) {
      const restored = restoreNewsTranslation(
        source,
        '2 $ / SBXINPUTTOKENS; 10 $ / SBXOUTPUTTOKENS',
        locale,
      );
      expect(restored).toContain(input);
      expect(restored).toContain(output);
      expect(restored).not.toContain('SBX');
    }
  });
  it('rejette un terme supprimé ou inventé par le moteur', () => {
    expect(() => restoreNewsTranslation(source, '2 $ et 10 $ par million de tokens', 'en')).toThrow(
      'Unité technique',
    );
    expect(() => restoreNewsTranslation('Un modèle ouvert.', 'SBXINPUTTOKENS', 'en')).toThrow(
      'Unité technique',
    );
  });
  it('rejette les nombres perdus, accepte la virgule décimale et conserve les répétitions', () => {
    expect(newsTranslationKeepsNumbers(source, '$2 input and $10 output')).toBe(true);
    expect(newsTranslationKeepsNumbers(source, '$1 input and $10 output')).toBe(false);
    expect(newsTranslationKeepsNumbers('4,5 milliards', '4.5 billion')).toBe(true);
    expect(newsTranslationKeepsNumbers('2 puis 2', '2')).toBe(false);
  });
});
