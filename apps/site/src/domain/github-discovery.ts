import { z } from 'zod';
import { dateDaysAgo } from './github-charts.ts';

/** Aucun filtre de sujet ni de langue sur les partitions générales. */
export function githubDiscoveryPlan(date: string): string[] {
  z.iso.date().parse(date);
  const bands = [
    '100..199',
    '200..499',
    '500..999',
    '1000..2499',
    '2500..4999',
    '5000..9999',
    '10000..24999',
    '25000..49999',
    '50000..99999',
    '>=100000',
  ];
  const common = `is:public fork:false archived:false pushed:>=${dateDaysAgo(date, 90)}`;
  const queries = [
    ...bands.map((band) => `${common} stars:${band}`),
    ...[
      'TypeScript',
      'Python',
      'JavaScript',
      'Rust',
      'Go',
      'Java',
      'C',
      'C++',
      'C#',
      'Ruby',
      'PHP',
      'Swift',
      'Kotlin',
      'Shell',
      'Dart',
      'R',
      'Lua',
      'Julia',
    ].map((language) => `${common} stars:>=100 language:"${language}"`),
    `${common} stars:>=100 created:>=${dateDaysAgo(date, 30)}`,
  ];
  const offset = Math.floor(Date.parse(date) / 86400000) % queries.length;
  return [...queries.slice(offset), ...queries.slice(0, offset)];
}

/** HTML traité comme donnée. Seuls les titres de dépôts dans les articles Trending sont admis. */
export function parseGithubTrending(html: string): string[] {
  if (Buffer.byteLength(html, 'utf8') > 2_000_000)
    throw new Error('Page Trending trop volumineuse.');
  const repositories: string[] = [];
  for (const article of html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi)) {
    const heading = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(article[0])?.[1];
    const href = heading && /<a\b[^>]*\bhref=["']\/([\w.-]+\/[\w.-]+)["']/i.exec(heading)?.[1];
    if (href && !href.endsWith('.git')) repositories.push(href);
  }
  const unique = [...new Set(repositories.map((name) => name.toLowerCase()))];
  if (!unique.length || unique.length > 100)
    throw new Error('Format GitHub Trending inconnu ou liste vide.');
  return unique;
}
