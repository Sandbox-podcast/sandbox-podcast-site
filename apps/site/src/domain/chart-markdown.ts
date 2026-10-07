import type { EditableContent } from './admin-content.ts';
import {
  chartSchema,
  entityLinkSchema,
  entitySchema,
  takeSchema,
  type ChartDef,
  type Entity,
  type EntityLink,
  type Take,
} from './schema.ts';

const SECTION_NAMES = [
  'Accroche',
  'Présentation',
  'Méthode',
  'Fréquence',
  'Critères',
  'Sources de données',
  'Limites',
  'Entrées et avis',
] as const;

function fail(message: string): never {
  throw new Error(`Markdown du classement : ${message}`);
}

function sectionsOf(markdown: string): { title: string; sections: Map<string, string> } {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const title = /^# (.+)$/.exec(lines[0] ?? '')?.[1]?.trim();
  if (!title) fail('commencez par « # Titre du classement ».');
  const sections = new Map<string, string>();
  let name = '';
  let body: string[] = [];
  const flush = () => {
    if (name) sections.set(name, body.join('\n').trim());
    body = [];
  };
  for (const line of lines.slice(1)) {
    const heading = /^## (.+)$/.exec(line);
    if (heading) {
      flush();
      name = heading[1]?.trim() ?? '';
      if (sections.has(name)) fail(`section « ${name} » en double.`);
    } else if (name) {
      body.push(line);
    }
  }
  flush();
  for (const required of SECTION_NAMES) {
    if (!sections.has(required)) fail(`section « ## ${required} » manquante.`);
  }
  return { title, sections };
}

function section(sections: Map<string, string>, name: string): string {
  const value = sections.get(name)?.trim();
  if (!value) fail(`la section « ${name} » ne peut pas être vide.`);
  return value;
}

function bulletPair(value: string, sectionName: string): { label: string; detail: string }[] {
  return value.split('\n').map((line) => {
    const match = /^- \*\*(.+)\*\* — (.+)$/.exec(line.trim());
    if (!match) fail(`dans « ${sectionName} », utilisez « - **Nom** — détail ». `);
    return { label: match[1]?.trim() ?? '', detail: match[2]?.trim() ?? '' };
  });
}

function parseSources(value: string): ChartDef['methodology']['sources'] {
  return value.split('\n').map((line) => {
    const match = /^- `([a-z0-9-]+)` — (.+)$/.exec(line.trim());
    if (!match) fail('dans « Sources de données », utilisez « - `identifiant` — usage ».');
    return { source: match[1] ?? '', usage: match[2]?.trim() ?? '' };
  });
}

function parseLimits(value: string): string[] {
  return value.split('\n').map((line) => {
    const match = /^- (.+)$/.exec(line.trim());
    if (!match) fail('dans « Limites », commencez chaque ligne par « - ».');
    return match[1]?.trim() ?? '';
  });
}

function entitySlugs(content: EditableContent, chartSlug: string, rankedSlugs: string[]): string[] {
  const slugs = new Set(rankedSlugs);
  for (const take of content.takes) {
    if (take.chart === chartSlug) slugs.add(take.entity);
  }
  for (const entity of content.entities) {
    if (entity.editorialCharts.includes(chartSlug)) slugs.add(entity.slug);
  }
  return [...slugs];
}

function serializeEntity(entity: Entity, takes: Take[]): string {
  const lines = [
    `### ${entity.name} {${entity.slug}}`,
    ...(entity.org ? [`- Organisation : ${entity.org}`] : []),
    `- Catégorie : ${entity.category}`,
    `- Accroche : ${entity.tagline}`,
    ...entity.links.map((link) => `- Lien (${link.kind}) : [${link.label}](${link.url})`),
    '',
    '**Description**',
    entity.description,
  ];
  for (const take of takes) {
    lines.push('', `#### Avis {${take.id}} · ${take.week ?? ''} · ${take.host}`, take.text);
  }
  return lines.join('\n');
}

/** Un document lisible pour l'édition ; les snapshots et le scoring restent structurés. */
export function serializeChartMarkdown(
  content: EditableContent,
  chartSlug: string,
  rankedSlugs: string[],
): string {
  const chart = content.charts.find((item) => item.slug === chartSlug);
  if (!chart) return fail(`classement « ${chartSlug} » introuvable.`);
  const entries = entitySlugs(content, chartSlug, rankedSlugs)
    .map((slug) => content.entities.find((entity) => entity.slug === slug))
    .filter((entity): entity is Entity => Boolean(entity));
  const lines = [
    `# ${chart.title}`,
    '',
    '## Accroche',
    chart.tagline,
    '',
    '## Présentation',
    chart.description,
    '',
    '## Méthode',
    chart.methodology.summary,
    '',
    '## Fréquence',
    chart.methodology.frequency,
    '',
    '## Critères',
    ...chart.methodology.criteria.map((item) => `- **${item.label}** — ${item.detail}`),
    '',
    '## Sources de données',
    ...chart.methodology.sources.map((item) => `- \`${item.source}\` — ${item.usage}`),
    '',
    '## Limites',
    ...chart.methodology.limits.map((item) => `- ${item}`),
    '',
    '## Entrées et avis',
    'Les rangs et les scores sont calculés à partir des relevés hebdomadaires.',
    '',
    ...entries.flatMap((entity) => [
      serializeEntity(
        entity,
        content.takes.filter((take) => take.chart === chartSlug && take.entity === entity.slug),
      ),
      '',
    ]),
  ];
  return `${lines.join('\n').trim()}\n`;
}

interface ParsedEntry {
  entity: Entity;
  takes: Take[];
}

function parseEntry(
  block: string,
  chart: ChartDef,
  current: EditableContent,
  now: string,
  seenTakeIds: Set<string>,
): ParsedEntry {
  const [main, ...takeBlocks] = block.split(/(?=^#### Avis )/m);
  const lines = (main ?? '').trim().split('\n');
  const heading = /^### (.+) \{([a-z0-9-]+)\}$/.exec(lines.shift() ?? '');
  if (!heading) fail('chaque fiche commence par « ### Nom {identifiant} ».');
  const name = heading[1]?.trim() ?? '';
  const slug = heading[2] ?? '';
  const existing = current.entities.find((item) => item.slug === slug);
  const descriptionIndex = lines.findIndex((line) => line.trim() === '**Description**');
  if (descriptionIndex < 0) fail(`ajoutez « **Description** » à la fiche ${slug}.`);
  const fields = lines
    .slice(0, descriptionIndex)
    .map((line) => line.trim())
    .filter(Boolean);
  const description = lines
    .slice(descriptionIndex + 1)
    .join('\n')
    .trim();
  const one = (label: string): string | undefined =>
    fields
      .find((line) => line.startsWith(`- ${label} : `))
      ?.slice(label.length + 5)
      .trim();
  const links: EntityLink[] = fields
    .filter((line) => line.startsWith('- Lien ('))
    .map((line) => {
      const match = /^- Lien \(([^)]+)\) : \[([^\]]+)\]\((https:\/\/.+)\)$/.exec(line);
      if (!match) fail(`lien invalide dans la fiche ${slug}.`);
      return entityLinkSchema.parse({ kind: match[1], label: match[2], url: match[3] });
    });
  if (links.length === 0) fail(`ajoutez au moins un lien à la fiche ${slug}.`);
  const glyph = name
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 3);
  const entity = entitySchema.parse({
    ...(existing ?? {
      slug,
      kind: chart.entityKind,
      topics: [],
      alternatives: [],
      mark: { glyph: glyph || '•', tone: chart.tone },
    }),
    name,
    org: one('Organisation'),
    category: one('Catégorie'),
    tagline: one('Accroche'),
    description,
    links,
    editorialCharts: [...new Set([...(existing?.editorialCharts ?? []), chart.slug])],
  });

  const takes = takeBlocks.map((takeBlock) => {
    const [first = '', ...body] = takeBlock.trim().split('\n');
    const match = /^#### Avis \{([a-z0-9-]+)\} · (\d{4}-W\d{2}) · ([a-z0-9-]+)$/.exec(first);
    if (!match) fail(`avis invalide pour ${slug} : utilisez « #### Avis {id} · 2026-W41 · lou ». `);
    const rawId = match[1] ?? '';
    const week = match[2] ?? '';
    const host = match[3] ?? '';
    let id = rawId;
    if (rawId === 'nouveau') {
      const base = `avis-${chart.slug}-${week.toLowerCase()}-${slug}-${host}`;
      id = base;
      let suffix = 2;
      while (current.takes.some((take) => take.id === id) || seenTakeIds.has(id)) {
        id = `${base}-${String(suffix)}`;
        suffix += 1;
      }
    }
    if (seenTakeIds.has(id)) fail(`avis ${id} en double.`);
    seenTakeIds.add(id);
    const existingTake = current.takes.find((take) => take.id === id);
    if (existingTake && (existingTake.chart !== chart.slug || existingTake.entity !== slug)) {
      fail(`l’avis ${id} appartient à une autre fiche.`);
    }
    return takeSchema.parse({
      ...(existingTake ?? { publishedAt: now }),
      id,
      chart: chart.slug,
      entity: slug,
      week,
      host,
      text: body.join('\n').trim(),
    });
  });
  return { entity, takes };
}

export function applyChartMarkdown(
  markdown: string,
  current: EditableContent,
  chartSlug: string,
  rankedSlugs: string[],
  now: string,
): EditableContent {
  const chart = current.charts.find((item) => item.slug === chartSlug);
  if (!chart) return fail(`classement « ${chartSlug} » introuvable.`);
  const { title, sections } = sectionsOf(markdown);
  const criteria = bulletPair(section(sections, 'Critères'), 'Critères');
  const sources = parseSources(section(sections, 'Sources de données'));
  const limits = parseLimits(section(sections, 'Limites'));
  const description = section(sections, 'Présentation');
  const nextChart = chartSchema.parse({
    ...chart,
    title,
    tagline: section(sections, 'Accroche'),
    description,
    methodology: {
      ...chart.methodology,
      summary: section(sections, 'Méthode'),
      frequency: section(sections, 'Fréquence'),
      criteria,
      sources,
      limits,
    },
    seo: {
      ...chart.seo,
      title: title === chart.title ? chart.seo.title : title,
      description:
        description === chart.description
          ? chart.seo.description
          : description.replace(/\s+/g, ' ').slice(0, 320),
    },
  });
  const entriesSection = section(sections, 'Entrées et avis');
  const blocks = entriesSection
    .split(/(?=^### )/m)
    .slice(1)
    .filter((block) => block.trim());
  const seenTakeIds = new Set<string>();
  const entries = blocks.map((block) => parseEntry(block, chart, current, now, seenTakeIds));
  const parsedSlugs = new Set(entries.map((entry) => entry.entity.slug));
  if (parsedSlugs.size !== entries.length) fail('une fiche figure plusieurs fois.');
  for (const slug of entitySlugs(current, chartSlug, rankedSlugs)) {
    if (!parsedSlugs.has(slug)) fail(`la fiche ${slug} manque dans le document.`);
  }
  for (const take of current.takes) {
    if (take.chart === chartSlug && !seenTakeIds.has(take.id)) {
      fail(`l’avis ${take.id} manque dans le document.`);
    }
  }
  const updatedEntities = new Map(entries.map((entry) => [entry.entity.slug, entry.entity]));
  const entities = current.entities.map((entity) => updatedEntities.get(entity.slug) ?? entity);
  for (const entry of entries) {
    if (!current.entities.some((entity) => entity.slug === entry.entity.slug))
      entities.push(entry.entity);
  }
  const updatedTakes = new Map(
    entries.flatMap((entry) => entry.takes.map((take) => [take.id, take] as const)),
  );
  const takes = current.takes.map((take) => updatedTakes.get(take.id) ?? take);
  for (const take of updatedTakes.values()) {
    if (!current.takes.some((existing) => existing.id === take.id)) takes.push(take);
  }
  return {
    ...current,
    charts: current.charts.map((item) => (item.slug === chartSlug ? nextChart : item)),
    entities,
    takes,
  };
}
