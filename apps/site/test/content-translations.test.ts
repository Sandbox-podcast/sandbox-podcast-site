import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { editableContentSchema } from '../src/domain/admin-content.ts';
import {
  editorialTranslationSources,
  chartEditionTranslationSources,
  translationSourcePack,
  translationHash,
  changedTranslationSources,
  missingTranslationSources,
  validateTranslatedBundle,
  bundleDictionary,
  TRANSLATION_LOCALES,
} from '../src/domain/content-translations.ts';
import { loadContent } from '../src/lib/load.ts';
import { LocalizationProvider, Text } from '../src/components/localization';
import { AdminTranslations } from '../src/components/admin-translations';

const fixture = () => {
  return editableContentSchema.strip().parse(loadContent());
};
const source =
  'Découvrez **le modèle** [[entity:claude-code]] et [le guide](https://example.com/guide) : 42 tests, {count} résultats.';
const pack = translationSourcePack([{ source, context: 'episodes.43.description' }]);
const bundle = (text: string) => ({
  version: 1,
  locale: 'en',
  translations: [{ ...pack.sources[0], text }],
});

describe('traductions produites manuellement dans le harnais', () => {
  it('propose le parcours manuel aux 114 cibles et réserve l’import dans l’interface', () => {
    const readonly = renderToStaticMarkup(
      createElement(AdminTranslations, { canImport: false, revision: 'test' }),
    );
    const admin = renderToStaticMarkup(
      createElement(AdminTranslations, { canImport: true, revision: 'test' }),
    );
    expect((admin.match(/<option /g) ?? []).length).toBe(114);
    expect(admin).toContain('href="/api/admin/translations?locale=en"');
    expect(admin).toContain('Copier le prompt');
    expect(admin).toContain('Importer les traductions');
    expect(readonly).not.toContain('type="file"');
    expect(readonly).not.toContain('Importer les traductions');
  });
  it('prépare tous les champs d’un nouvel épisode et garde les médias, noms et identifiants hors de la traduction', () => {
    const content = fixture();
    const episode = content.episodes[0];
    if (!episode) throw new Error('fixture');
    const next = {
      ...content,
      episodes: [
        ...content.episodes,
        {
          ...episode,
          number: 99,
          title: 'Nouveau sujet à traduire',
          dek: 'Un nouveau résumé',
          description: source,
          cover: { ...episode.cover, kicker: 'Nouvel épisode' },
          chapters: [{ at: 60, title: 'Première partie inédite' }],
          mentions: [
            {
              kind: 'repo' as const,
              label: 'Dépôt à découvrir',
              url: 'https://example.com/repo',
              note: 'Une ressource inédite',
            },
          ],
          guests: [{ name: 'Nom propre unique', role: 'Invitée chercheuse' }],
        },
      ],
    };
    const texts = changedTranslationSources(
      editorialTranslationSources(content),
      editorialTranslationSources(next),
    ).map((item) => item.source);
    expect(texts).toEqual(
      expect.arrayContaining([
        'Nouveau sujet à traduire',
        'Un nouveau résumé',
        source,
        'Première partie inédite',
        'Dépôt à découvrir',
        'Une ressource inédite',
        'Invitée chercheuse',
        'le guide',
        'le modèle',
      ]),
    );
    expect(texts).not.toEqual(
      expect.arrayContaining(['Nom propre unique', 'https://example.com/repo', '99']),
    );
    const draft = {
      ...next,
      episodes: next.episodes.map((item) =>
        item.number === 99 ? { ...item, status: 'draft' as const } : item,
      ),
    };
    expect(
      editorialTranslationSources(draft).some((item) => item.source === 'Nouveau sujet à traduire'),
    ).toBe(false);
    expect(next.episodes.at(-1)?.platforms).toEqual(episode.platforms);
  });
  it('couvre les avis réels ajoutés dans les éditions de classement', () => {
    const texts = chartEditionTranslationSources({
      week: '2026-W41',
      headline: 'Le fait de la semaine',
      monthlyHeadline: 'Le fait du mois',
      watchlist: [{ entity: 'claude-code', reason: 'À suivre cette semaine' }],
      insights: [
        {
          entity: 'claude-code',
          whatItIs: 'Un assistant',
          whyTrending: 'Les utilisateurs arrivent',
          whyMatters: 'Le contexte est nouveau',
          sandboxTake: 'Notre avis humain',
          author: 'Lou',
          bestFor: ['Développeurs'],
        },
      ],
    }).map((item) => item.source);
    expect(texts).toEqual(
      expect.arrayContaining([
        'Notre avis humain',
        'À suivre cette semaine',
        'Développeurs',
        'Le fait du mois',
      ]),
    );
    expect(texts).not.toContain('Lou');
    expect(texts).not.toContain('2026-W41');
  });
  it('déduplique les textes et prépare seulement les traductions manquantes pour les 114 cibles', () => {
    const next = translationSourcePack([
      { source: 'Bonjour', context: 'a' },
      { source: ' Bonjour ', context: 'b' },
      { source: 'constructor', context: 'c' },
    ]);
    expect(next.sources).toHaveLength(2);
    expect(
      missingTranslationSources(next, { Bonjour: 'Hello' }).map((item) => item.source),
    ).toEqual(['constructor']);
    expect(TRANSLATION_LOCALES).toHaveLength(114);
    expect(translationHash(' Bonjour  le monde ')).toBe(translationHash('Bonjour le monde'));
  });
  it('importe un lot partiel valide qui est utilisable dans le rendu public', () => {
    const translated = validateTranslatedBundle(
      pack,
      bundle(
        'Discover **the model** [[entity:claude-code]] and [the guide](https://example.com/guide): 42 tests, {count} results.',
      ),
    );
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary: bundleDictionary(translated),
        children: createElement(Text, { children: source }),
      }),
    );
    expect(html).toContain('Discover **the model**');
    expect(html).toContain('42 tests');
  });
  it('refuse un texte modifié depuis l’export, les liens changés, les nombres inventés et les entrées répétées', () => {
    const valid =
      'Discover **the model** [[entity:claude-code]] and [the guide](https://example.com/guide): 42 tests, {count} results.';
    for (const text of [
      valid.replace('42', '43'),
      valid.replace('/guide)', '/other)'),
      valid.replace('{count}', '{nombre}'),
      `<script>alert(42)</script>${valid}`,
    ])
      expect(() => validateTranslatedBundle(pack, bundle(text))).toThrow();
    expect(() =>
      validateTranslatedBundle(
        translationSourcePack([{ source: 'Texte remplacé', context: 'episode' }]),
        bundle(valid),
      ),
    ).toThrow(/source/);
    expect(() =>
      validateTranslatedBundle(pack, {
        ...bundle(valid),
        translations: [bundle(valid).translations[0], bundle(valid).translations[0]],
      }),
    ).toThrow(/répété/);
    expect(() =>
      validateTranslatedBundle(pack, { ...bundle(valid), locale: '../../en' }),
    ).toThrow();
    expect(() => validateTranslatedBundle(pack, bundle(''))).toThrow();
  });
});
