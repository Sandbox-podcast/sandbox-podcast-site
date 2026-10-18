import { performance } from 'node:perf_hooks';
import console from 'node:console';
import process from 'node:process';
import { translateNewsEditorialItems } from '../src/pipeline/news-translation.ts';

const path = '/articles/argos-local-smoke-test';
const item = {
  id: 'argos-local-smoke-test',
  project: 'SANDBOX News',
  repository: 'www.thedeepview.com',
  version: 'article',
  url: `https://www.thedeepview.com${path}`,
  publishedAt: new Date().toISOString(),
  category: 'research',
  prerelease: false,
  kind: 'article',
  headline: 'Vérification locale du moteur de traduction.',
};
const editorial = {
  [path]: {
    title: 'Des chercheurs comparent trois modèles d’intelligence artificielle.',
    sentences: [
      'Les chercheurs évaluent trois modèles sur un jeu de données public.',
      'Les résultats concernent seulement les tâches et le matériel étudiés.',
      'Les auteurs publient le code et les données de leur évaluation.',
    ],
    category: 'research',
  },
};

const startedAt = performance.now();
const [translated] = await translateNewsEditorialItems([item], undefined, editorial, {});
if (
  !translated?.titles?.['en'] ||
  !translated.titles['es-ES'] ||
  !translated.titles['de-DE'] ||
  translated.synopses?.['en']?.length !== 3 ||
  translated.synopses['es-ES']?.length !== 3 ||
  translated.synopses['de-DE']?.length !== 3
)
  throw new Error('La vérification Argos n’a pas produit les trois traductions complètes.');

console.log(
  `Argos a produit une fiche complète en EN/ES/DE en ${Math.round(performance.now() - startedAt)} ms.`,
);
if (process.env['SANDBOX_NEWS_TRANSLATOR_SMOKE_VERBOSE'] === '1')
  console.log(
    JSON.stringify({ titles: translated.titles, synopses: translated.synopses }, null, 2),
  );
