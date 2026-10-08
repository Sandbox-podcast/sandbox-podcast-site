const subdomainEntries = [
  {
    host: 'slides.sandboxpodcast.fr',
    destination: '/slides/episode-043/index.html',
  },
] as const;

export const subdomainRewriteRules = subdomainEntries.map(({ host, destination }) => ({
  source: '/',
  has: [{ type: 'host' as const, value: host }],
  destination,
}));
