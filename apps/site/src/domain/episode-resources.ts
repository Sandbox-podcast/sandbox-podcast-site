import { mentionTag } from './kinds.ts';
import type { Episode, Mention } from './schema.ts';
import { parseYouTubeVideoId } from './youtube.ts';
import type { PersonalProject } from './personal-projects.ts';
import { resourceProject } from './project-resources.ts';

const INLINE_LINK_START = /(!?)\[([^\]\n]+)\]\(/g;
const REFERENCE_LINK = /(!?)\[([^\]\n]+)\]\[([^\]\n]*)\]/g;
const REFERENCE_DEFINITION = /^\s{0,3}\[([^\]]+)\]:\s*<?(https:\/\/[^\s>]+)>?/i;
const BARE_URL = /https:\/\/[^\s<>"'`]+/gi;

function resourceKind(hostname: string): Mention['kind'] {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'github.com' || host === 'gitlab.com') return 'repo';
  if (host === 'huggingface.co') return 'model';
  if (host === 'arxiv.org' || host === 'doi.org') return 'paper';
  if (host === 'x.com' || host === 'twitter.com') return 'tweet';
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'vimeo.com') return 'video';
  return 'site';
}

function normalizedUrl(raw: string): URL | undefined {
  let value = raw.replace(/[.,;!?\]}]+$/g, '');
  while (
    value.endsWith(')') &&
    (value.match(/\)/g)?.length ?? 0) > (value.match(/\(/g)?.length ?? 0)
  ) {
    value = value.slice(0, -1);
  }
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charCodeAt(index);
    if (character === 92 || character < 32 || character === 127) return undefined;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

function cleanLabel(value: string): string {
  return value.replace(/^[\s#*_[\]>•–—-]+|[\s:*_[\]>•–—-]+$/g, '').trim();
}

/** Extrait les URL HTTPS visibles du Markdown, sans les blocs de code ni les images. */
export function extractMarkdownResources(markdown: string): Mention[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const references = new Map<string, string>();
  let definitionsFence: string | undefined;
  for (const line of lines) {
    const boundary = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (boundary) {
      if (!definitionsFence) definitionsFence = boundary;
      else if (
        boundary.startsWith(definitionsFence.slice(0, 1)) &&
        boundary.length >= definitionsFence.length
      )
        definitionsFence = undefined;
      continue;
    }
    if (definitionsFence) continue;
    const definition = REFERENCE_DEFINITION.exec(line);
    if (definition) references.set((definition[1] ?? '').toLowerCase(), definition[2] ?? '');
  }

  const resources: Mention[] = [];
  const seen = new Set<string>();
  let fence: string | undefined;
  const add = (rawUrl: string, rawLabel: string): void => {
    const url = normalizedUrl(rawUrl);
    if (!url || seen.has(url.href)) return;
    seen.add(url.href);
    resources.push({
      kind: resourceKind(url.hostname),
      label: cleanLabel(rawLabel) || url.hostname.replace(/^www\./, ''),
      url: url.href,
      origin: 'description',
    });
  };

  for (const rawLine of lines) {
    const boundary = /^\s{0,3}(`{3,}|~{3,})/.exec(rawLine)?.[1];
    if (boundary) {
      if (!fence) fence = boundary;
      else if (boundary.startsWith(fence.slice(0, 1)) && boundary.length >= fence.length)
        fence = undefined;
      continue;
    }
    if (fence || REFERENCE_DEFINITION.test(rawLine)) continue;
    const line = rawLine
      .replace(/`[^`]*`/g, (match) => ' '.repeat(match.length))
      .replace(/<(?!https:\/\/)[^>]*>/gi, (match) => ' '.repeat(match.length));
    const covered: [number, number][] = [];
    for (const match of line.matchAll(INLINE_LINK_START)) {
      const destinationStart = match.index + match[0].length;
      let depth = 0;
      let end = destinationStart;
      for (; end < line.length; end += 1) {
        if (line[end] === '(') depth += 1;
        else if (line[end] === ')') {
          if (depth === 0) break;
          depth -= 1;
        }
      }
      if (end === line.length) continue;
      covered.push([match.index, end + 1]);
      const destination = line.slice(destinationStart, end).trim().replace(/^<|>$/g, '');
      if (!match[1]) add(destination, match[2] ?? '');
    }
    for (const match of line.matchAll(REFERENCE_LINK)) {
      const start = match.index;
      covered.push([start, start + match[0].length]);
      if (!match[1]) {
        const label = match[2] ?? '';
        const reference = (match[3]?.trim() ? match[3] : label).toLowerCase();
        const url = references.get(reference);
        if (url) add(url, label);
      }
    }
    for (const match of line.matchAll(BARE_URL)) {
      if (covered.some(([start, end]) => match.index >= start && match.index < end)) continue;
      add(match[0], line[match.index - 1] === '<' ? '' : line.slice(0, match.index));
    }
  }
  return resources;
}

/** Ajoute les liens de la description sans écraser les ressources éditées à la main. */
export function mergeDescriptionResources(
  existing: readonly Mention[],
  description: string,
  ownVideoId?: string,
): Mention[] {
  const detected = extractMarkdownResources(description).filter(
    (resource) => !ownVideoId || parseYouTubeVideoId(resource.url ?? '') !== ownVideoId,
  );
  const detectedUrls = new Set(detected.map((item) => item.url));
  const manualUrls = new Set(
    existing
      .filter((item) => item.origin !== 'description')
      .map((item) => normalizedUrl(item.url ?? '')?.href),
  );
  const result = existing.filter((item) => {
    if (item.origin !== 'description') return true;
    const url = normalizedUrl(item.url ?? '')?.href;
    return Boolean(url && detectedUrls.has(url) && !manualUrls.has(url));
  });
  const urls = new Set(result.map((item) => normalizedUrl(item.url ?? '')?.href));
  for (const resource of detected) {
    if (!resource.url || urls.has(resource.url)) continue;
    result.push(resource);
    urls.add(resource.url);
  }
  return result;
}

/** Liste unique utilisée par la fiche et la recherche, dans le même ordre. */
export function episodeResources(
  episode: Episode,
  projects: readonly PersonalProject[] = [],
): Mention[] {
  return mergeDescriptionResources(
    [
      ...episode.mentions,
      ...episode.sources.map((source) => ({
        kind: source.kind,
        label: source.label,
        url: source.url,
        note: source.publisher ?? mentionTag(source.kind),
      })),
    ],
    episode.description,
    episode.platforms.youtubeId,
  ).map((resource) => {
    const project = resourceProject(resource.url, projects);
    return project && !resource.label.toLowerCase().includes(project.name.toLowerCase())
      ? { ...resource, label: `${project.name} : ${resource.label}` }
      : resource;
  });
}
