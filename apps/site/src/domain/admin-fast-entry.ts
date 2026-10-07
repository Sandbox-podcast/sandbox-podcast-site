import {
  entityLinkSchema,
  slugSchema,
  sourceSchema,
  takeSchema,
  topicSchema,
  weekIdSchema,
  type Source,
  type Topic,
} from './schema.ts';

export function slugFromLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function nameFromProjectUrl(value: string): string | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (!['github.com', 'huggingface.co'].includes(url.hostname)) return undefined;
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(segments[1] ?? '');
  } catch {
    return undefined;
  }
  const name = decoded
    .replace(/\.git$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return name ? name.replace(/^\w/, (initial) => initial.toUpperCase()) : undefined;
}

export function topicFromFields(
  fields: { label: string; description: string },
  existing?: Topic,
): Topic {
  return topicSchema.parse({
    slug: existing?.slug ?? slugFromLabel(fields.label),
    label: fields.label.trim(),
    description: fields.description.trim(),
  });
}

export function sourceFromFields(
  fields: Pick<Source, 'label' | 'url' | 'provides' | 'kind' | 'status'>,
  existing?: Source,
): Source {
  return sourceSchema.parse({
    id: existing?.id ?? slugFromLabel(fields.label),
    label: fields.label.trim(),
    url: fields.url.trim(),
    provides: fields.provides.trim(),
    kind: fields.kind,
    status: fields.status,
  });
}

function entryHeadings(markdown: string): { slug: string; index: number }[] {
  return [...markdown.matchAll(/^### .+ \{([a-z0-9-]+)\}\s*$/gm)].map((match) => ({
    slug: match[1] ?? '',
    index: match.index,
  }));
}

export function insertChartTake(
  markdown: string,
  input: { entity: string; week: string; host: string; text: string },
): string {
  slugSchema.parse(input.entity);
  weekIdSchema.parse(input.week);
  const text = input.text.trim();
  if (!text) throw new Error('Écrivez votre avis avant de l’ajouter.');
  takeSchema.parse({
    id: 'nouveau',
    entity: input.entity,
    week: input.week,
    host: input.host,
    text,
    publishedAt: new Date().toISOString(),
  });
  const headings = entryHeadings(markdown);
  const position = headings.findIndex((heading) => heading.slug === input.entity);
  if (position < 0) throw new Error('Cette fiche ne figure pas dans le document.');
  const next = headings[position + 1];
  const end = next?.index ?? markdown.length;
  const block = `#### Avis {nouveau} · ${input.week} · ${input.host}\n${text}`;
  const after = markdown.slice(end).trimStart();
  return `${markdown.slice(0, end).trimEnd()}\n\n${block}\n${after ? `\n${after}` : ''}`;
}

export function appendChartEntity(
  markdown: string,
  input: { name: string; category: string; tagline: string; url: string },
): { markdown: string; slug: string } {
  const name = input.name.replace(/[{}\r\n]/g, ' ').trim();
  const category = input.category.replace(/[\r\n]/g, ' ').trim();
  const tagline = input.tagline.replace(/[\r\n]/g, ' ').trim();
  const candidateSlug = slugFromLabel(name);
  if (!candidateSlug) throw new Error('Renseignez un nom avec des lettres ou des chiffres.');
  const slug = slugSchema.parse(candidateSlug);
  if (entryHeadings(markdown).some((heading) => heading.slug === slug)) {
    throw new Error('Une fiche porte déjà cet identifiant dans ce classement.');
  }
  if (!markdown.includes('## Entrées et avis')) {
    throw new Error('La section « Entrées et avis » manque dans le document.');
  }
  if (!category || !tagline || tagline.length > 110) {
    throw new Error('Précisez une catégorie et une accroche de 110 caractères maximum.');
  }
  let url: URL;
  try {
    url = new URL(input.url.trim());
  } catch {
    throw new Error('Saisissez un lien HTTPS valide.');
  }
  if (url.protocol !== 'https:') throw new Error('Saisissez un lien HTTPS valide.');
  const kind =
    url.hostname === 'github.com'
      ? 'github'
      : url.hostname === 'huggingface.co'
        ? 'huggingface'
        : 'site';
  const link = entityLinkSchema.parse({ kind, label: url.hostname, url: url.toString() });
  const organization =
    kind === 'github' || kind === 'huggingface' ? url.pathname.split('/').find(Boolean) : undefined;
  const block = [
    `### ${name} {${slug}}`,
    ...(organization ? [`- Organisation : ${organization}`] : []),
    `- Catégorie : ${category}`,
    `- Accroche : ${tagline}`,
    `- Lien (${link.kind}) : [${link.label}](${link.url})`,
    '',
    '**Description**',
    tagline,
  ].join('\n');
  return { markdown: `${markdown.trimEnd()}\n\n${block}\n`, slug };
}
