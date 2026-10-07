const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export interface ImportedResource {
  kind: 'repo' | 'model' | 'paper' | 'tweet' | 'video' | 'site';
  label: string;
  url: string;
  at?: number;
}

export interface ParsedVideoDescription {
  summary: string;
  chapters: { at: number; title: string }[];
  resources: ImportedResource[];
  spotifyUrl?: string;
  appleUrl?: string;
}

export function parseYouTubeVideoId(value: string): string | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    return undefined;
  }

  const candidate =
    url.hostname.toLowerCase() === 'youtu.be'
      ? url.pathname.split('/').find(Boolean)
      : (url.searchParams.get('v') ?? url.pathname.split('/').filter(Boolean).at(-1));
  return candidate && VIDEO_ID.test(candidate) ? candidate : undefined;
}

/** Durée ISO 8601 renvoyée par videos.list (jour, heure, minute, seconde). */
export function parseYouTubeDuration(value: string): number | undefined {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value);
  if (!match) return undefined;
  const [, days = '0', hours = '0', minutes = '0', seconds = '0'] = match;
  const duration =
    Number(days) * 86_400 + Number(hours) * 3_600 + Number(minutes) * 60 + Number(seconds);
  return Number.isSafeInteger(duration) && duration > 0 ? duration : undefined;
}

function timestampSeconds(value: string): number | undefined {
  const parts = value.split(':').map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isInteger(part)))
    return undefined;
  const seconds = parts.at(-1) ?? 0;
  const minutes = parts.at(-2) ?? 0;
  const hours = parts.length === 3 ? (parts[0] ?? 0) : 0;
  if (seconds > 59 || minutes > 59 || hours > 99) return undefined;
  return hours * 3_600 + minutes * 60 + seconds;
}

function resourceKind(host: string): ImportedResource['kind'] {
  if (host === 'github.com' || host === 'gitlab.com') return 'repo';
  if (host === 'huggingface.co') return 'model';
  if (host === 'arxiv.org' || host === 'doi.org') return 'paper';
  if (host === 'x.com' || host === 'twitter.com') return 'tweet';
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'vimeo.com') return 'video';
  return 'site';
}

/** N'invente ni chapitres ni liens : tout provient de la description publiée sur YouTube. */
export function parseYouTubeDescription(description: string): ParsedVideoDescription {
  const lines = description.replace(/\r\n?/g, '\n').split('\n');
  const chapters: ParsedVideoDescription['chapters'] = [];
  const resources: ImportedResource[] = [];
  const seenUrls = new Set<string>();
  let spotifyUrl: string | undefined;
  let appleUrl: string | undefined;
  const summaryLines: string[] = [];
  let summaryStarted = false;
  let summaryFinished = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    let isChapter = false;
    const chapter = /^(?:[-*•]\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:[-–—|:]\s*)?(.+)$/.exec(line);
    if (chapter) {
      const at = timestampSeconds(chapter[1] ?? '');
      const title = (chapter[2] ?? '').replace(/https?:\/\/\S+/g, '').trim();
      if (at !== undefined && title && !/^https?:\/\//i.test(title)) {
        if (!chapters.some((item) => item.at === at)) chapters.push({ at, title });
        isChapter = true;
      }
    }

    const links = line.match(/https?:\/\/[^\s<>]+/gi) ?? [];
    for (const rawLink of links) {
      const candidate = rawLink.replace(/[),.;!?\]}]+$/g, '');
      let url: URL;
      try {
        url = new URL(candidate);
      } catch {
        continue;
      }
      if (url.protocol !== 'https:') continue;
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      if (host === 'open.spotify.com') {
        spotifyUrl ??= url.toString();
        continue;
      }
      if (host === 'podcasts.apple.com') {
        appleUrl ??= url.toString();
        continue;
      }
      const normalized = url.toString();
      if (seenUrls.has(normalized)) continue;
      seenUrls.add(normalized);
      const preceding = line
        .slice(0, line.indexOf(rawLink))
        .replace(/^[\s\-–—•*]+|[\s:–—-]+$/g, '');
      const label = preceding && preceding.length <= 120 ? preceding : host;
      resources.push({ kind: resourceKind(host), label, url: normalized });
    }

    if (isChapter || links.length > 0 || /^#\w+/.test(line)) continue;
    if (!line) {
      if (summaryStarted) summaryFinished = true;
      continue;
    }
    if (!summaryFinished) {
      summaryStarted = true;
      summaryLines.push(line);
    }
  }

  chapters.sort((a, b) => a.at - b.at);
  const summary = summaryLines.join(' ').slice(0, 320).trim();
  return {
    summary,
    chapters,
    resources,
    ...(spotifyUrl ? { spotifyUrl } : {}),
    ...(appleUrl ? { appleUrl } : {}),
  };
}
