/** Médias explicitement demandés par Lou le 18 octobre 2026. */
export const NEWS_MEDIA = [
  {
    id: 'taaft',
    name: "There's An AI For That",
    url: 'https://newsletter.theresanaiforthat.com/',
    path: '/p/',
  },
  { id: 'rundown', name: 'The Rundown AI', url: 'https://www.therundown.ai/', path: '/articles/' },
  { id: 'superhuman', name: 'Superhuman AI', url: 'https://www.superhuman.ai/', path: '/p/' },
  { id: 'tldr', name: 'TLDR AI', url: 'https://tldr.tech/ai/archives', path: '/ai/' },
  {
    id: 'techpresso',
    name: 'Techpresso',
    url: 'https://techpresso.co/',
    path: '/archives/techpresso-',
  },
  {
    id: 'deepview',
    name: 'The Deep View',
    url: 'https://www.thedeepview.com/',
    path: '/articles/',
  },
  { id: 'neuron', name: 'The Neuron', url: 'https://www.theneurondaily.com/', path: '/p/' },
  {
    id: 'aireport',
    name: 'The AI Report',
    url: 'https://www.theaireport.ai/',
    path: '/newsletter/',
  },
  { id: 'alphasignal', name: 'AlphaSignal', url: 'https://alphasignal.ai/', path: '/news/' },
  {
    id: 'futurepedia',
    name: 'Futurepedia',
    url: 'https://newsletter.futurepedia.io/',
    path: '/p/',
  },
] as const;
export type NewsMedia = (typeof NEWS_MEDIA)[number];
export const NEWS_ALLOWED_HOSTS = new Set([
  'github.com',
  'newsletter.taaft.com',
  ...NEWS_MEDIA.map((source) => new URL(source.url).hostname),
]);
