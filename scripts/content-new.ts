/**
 * Crée un squelette de contenu valide. Le contenu vit dans Git : cette commande évite les fautes de structure,
 * puis `content:check` vérifie les références.
 *
 *   node scripts/content-new.ts episode
 *   node scripts/content-new.ts story <type> "<titre>" [--author alex]
 *   node scripts/content-new.ts entity <project|model> <slug> "<Nom>" <url-https>
 *   node scripts/content-new.ts take <classement> <semaine> <entité> <animateur> "<texte>"
 *   node scripts/content-new.ts chart <slug> "<Titre>" [--from github]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { entityKindSchema, storyTypeSchema } from '../src/domain/schema.ts';
import { loadContent } from '../src/lib/load.ts';
import { newChart, newEntity, newEpisode, newStory, newTake } from '../src/lib/scaffold.ts';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    author: { type: 'string' },
    from: { type: 'string', default: 'github' },
    date: { type: 'string' },
  },
});

const root = process.cwd();
const content = loadContent(root);
const now = values.date ? new Date(values.date) : new Date();
const [command, ...args] = positionals;

const write = (relative: string, data: unknown): void => {
  const file = join(root, relative);
  if (existsSync(file)) throw new Error(`${relative} existe déjà : rien n'est écrasé.`);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Créé : ${relative}`);
};

const append = (relative: string, item: unknown): void => {
  const file = join(root, relative);
  const list = existsSync(file)
    ? z.array(z.unknown()).parse(JSON.parse(readFileSync(file, 'utf8')))
    : [];
  writeFileSync(file, `${JSON.stringify([...list, item], null, 2)}\n`);
  console.log(`Ajouté à : ${relative}`);
};

const need = (index: number, what: string): string => {
  const value = args[index];
  if (!value) throw new Error(`Argument manquant : ${what}`);
  return value;
};

switch (command) {
  case 'episode': {
    const episode = newEpisode(
      content.episodes,
      now,
      content.hosts.map((h) => h.slug),
    );
    write(`content/episodes/${String(episode.number).padStart(3, '0')}.json`, episode);
    break;
  }
  case 'story': {
    const type = storyTypeSchema.parse(need(0, 'type'));
    const author = values.author ?? content.hosts[0]?.slug;
    if (!author) throw new Error('Aucun animateur défini.');
    const story = newStory(type, need(1, 'titre'), author, now);
    write(`content/stories/${story.slug}.json`, story);
    break;
  }
  case 'entity': {
    const kind = entityKindSchema.parse(need(0, 'type'));
    const slug = need(1, 'slug');
    if (content.entities.some((e) => e.slug === slug))
      throw new Error(`L'entité ${slug} existe déjà.`);
    append(
      `content/entities/${kind === 'model' ? 'models' : 'projects'}.json`,
      newEntity(kind, slug, need(2, 'nom'), need(3, 'url')),
    );
    break;
  }
  case 'take': {
    const take = newTake({
      chart: need(0, 'classement'),
      week: need(1, 'semaine'),
      entity: need(2, 'entité'),
      host: need(3, 'animateur'),
      text: need(4, 'texte'),
      now,
    });
    append(`content/takes/${take.chart ?? 'evergreen'}.json`, take);
    break;
  }
  case 'chart': {
    const template = content.charts.find((c) => c.slug === values.from);
    if (!template) throw new Error(`Classement modèle introuvable : ${values.from}`);
    const slug = need(0, 'slug');
    write(`content/charts/${slug}.json`, newChart(template, slug, need(1, 'titre')));
    console.log(
      'Étapes suivantes : compléter la définition, définir les candidats (connecteur ou série de démonstration), puis « week:run » et « content:check ».',
    );
    break;
  }
  default:
    console.error('Commande inconnue. Voir l’en-tête de scripts/content-new.ts.');
    process.exit(1);
}
console.log('Pensez à lancer : pnpm content:check');
