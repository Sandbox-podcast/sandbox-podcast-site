import { chartEditionSchema, type ChartEdition } from './schema.ts';

const sectionPattern = /^## Édition (\d{4}-W\d{2})\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm;
const encode = (value: string): string =>
  /[\r\n]/.test(value) || value.startsWith('"') ? JSON.stringify(value) : value;
function decode(value: string): string {
  return value.startsWith('"') ? (JSON.parse(value) as string) : value;
}

export function editionMarkdown(edition: ChartEdition): string {
  const e = chartEditionSchema.parse(edition);
  return (
    [
      `## Édition ${e.week}`,
      '',
      `Accroche : ${encode(e.headline)}`,
      `Accroche du mois : ${encode(e.monthlyHeadline)}`,
      '',
      ...e.watchlist.map((item) => `Watchlist : ${item.entity} | ${encode(item.reason)}`),
      '',
      ...e.insights.flatMap((item) => [
        `### Lecture {${item.entity}}`,
        `Ce que c'est : ${encode(item.whatItIs)}`,
        `Pourquoi ça monte : ${encode(item.whyTrending)}`,
        `Pourquoi ça compte : ${encode(item.whyMatters)}`,
        `SANDBOX TAKE : ${encode(item.sandboxTake)}`,
        `Auteur : ${encode(item.author)}`,
        `Pour qui : ${JSON.stringify(item.bestFor)}`,
        '',
      ]),
    ]
      .join('\n')
      .trimEnd() + '\n'
  );
}

export function editionsFromMarkdown(markdown: string): ChartEdition[] {
  const editions: ChartEdition[] = [];
  for (const match of markdown.replace(/\r\n?/g, '\n').matchAll(sectionPattern)) {
    const body = match[2] ?? '';
    const field = (text: string, label: string): string =>
      decode(
        text
          .split('\n')
          .find((line) => line.startsWith(`${label} : `))
          ?.slice(label.length + 3)
          .trim() ?? '',
      );
    const watchlist = body
      .split('\n')
      .filter((line) => line.startsWith('Watchlist : '))
      .map((line) => {
        const [entity = '', ...reason] = line.slice('Watchlist : '.length).split(' | ');
        return { entity, reason: decode(reason.join(' | ')) };
      });
    const insights = body
      .split(/(?=^### Lecture )/m)
      .slice(1)
      .map((block) => {
        const entity = /^### Lecture \{([a-z0-9-]+)\}/.exec(block)?.[1];
        if (!entity) throw new Error("Fiche de lecture invalide dans l'édition.");
        const bestFor = field(block, 'Pour qui');
        return {
          entity,
          whatItIs: field(block, "Ce que c'est"),
          whyTrending: field(block, 'Pourquoi ça monte'),
          whyMatters: field(block, 'Pourquoi ça compte'),
          sandboxTake: field(block, 'SANDBOX TAKE'),
          author: field(block, 'Auteur'),
          bestFor: bestFor.startsWith('[')
            ? (JSON.parse(bestFor) as unknown)
            : bestFor.split(' | ').filter(Boolean),
        };
      });
    editions.push(
      chartEditionSchema.parse({
        week: match[1],
        headline: field(body, 'Accroche'),
        monthlyHeadline: field(body, 'Accroche du mois'),
        watchlist,
        insights,
      }),
    );
  }
  if (new Set(editions.map((e) => e.week)).size !== editions.length)
    throw new Error('Une semaine figure plusieurs fois dans les éditions.');
  return editions;
}

/** Ajoute la section avant les fiches pour conserver les actions rapides existantes. */
export function updateEditionMarkdown(markdown: string, edition: ChartEdition): string {
  const normalized = markdown.replace(/\r\n?/g, '\n');
  const replacement = editionMarkdown(edition);
  const existing = [...normalized.matchAll(sectionPattern)].find(
    (match) => match[1] === edition.week,
  );
  if (existing)
    return (
      normalized.slice(0, existing.index) +
      replacement +
      '\n' +
      normalized.slice(existing.index + existing[0].length)
    );
  const at = normalized.indexOf('## Entrées et avis');
  if (at < 0) throw new Error('La section Entrées et avis manque dans le document.');
  return normalized.slice(0, at) + replacement + '\n' + normalized.slice(at);
}
