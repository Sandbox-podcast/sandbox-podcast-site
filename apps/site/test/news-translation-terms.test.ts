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
        'ZXQAQXZ $ / SBXINPUTTOKENS; ZXQBQXZ $ / SBXOUTPUTTOKENS',
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
  it('protège les milliers et les décimales sans autoriser la perte ou la duplication de valeurs', () => {
    const original = '200 000 développeurs et 1 400 entreprises, à 4,5 euros.';
    expect(prepareNewsTranslation(original)).toBe(
      'ZXQAQXZ développeurs et ZXQBQXZ entreprises, à ZXQCQXZ euros.',
    );
    const restored = restoreNewsTranslation(
      original,
      'ZXQAQXZ developers, ZXQBQXZ companies, ZXQCQXZ euros.',
      'en',
    );
    expect(restored).toBe('200 000 developers, 1 400 companies, 4,5 euros.');
    expect(newsTranslationKeepsNumbers(original, restored)).toBe(true);
    expect(() => restoreNewsTranslation(original, 'ZXQAQXZ developers.', 'en')).toThrow(
      'Nombre protégé',
    );
    expect(() => restoreNewsTranslation(original, 'No values.', 'en')).toThrow('Nombre protégé');
    expect(() => restoreNewsTranslation('2', 'ZXQAQXZ ZXQAQXZ', 'en')).toThrow('Nombre protégé');
  });
  it('préserve un nombre final protégé sans retirer les parenthèses du texte source', () => {
    const text = 'La migration couvre 8 applications, 0.';
    expect(prepareNewsTranslation(text)).toBe('La migration couvre ZXQAQXZ applications.');
    const translated = restoreNewsTranslation(
      text,
      'Die Migration umfasst ZXQAQXZ Anwendungen.',
      'de-DE',
    );
    expect(translated).toBe('Die Migration umfasst 8 Anwendungen, 0.');
    expect(newsTranslationKeepsNumbers(text, translated)).toBe(true);
    expect(
      restoreNewsTranslation(
        'La version (2) est disponible.',
        'Version (ZXQAQXZ) is available.',
        'en',
      ),
    ).toBe('Version (2) is available.');
  });
  it('rejette les nombres perdus, accepte la virgule décimale et conserve les répétitions', () => {
    expect(newsTranslationKeepsNumbers(source, '$2 input and $10 output')).toBe(true);
    expect(newsTranslationKeepsNumbers(source, '$1 input and $10 output')).toBe(false);
    expect(newsTranslationKeepsNumbers('4,5 milliards', '4.5 billion')).toBe(true);
    expect(newsTranslationKeepsNumbers('2 puis 2', '2')).toBe(false);
  });
});
