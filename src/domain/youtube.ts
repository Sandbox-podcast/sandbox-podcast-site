const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

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
