import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface SlideDeck {
  slug: string;
  title: string;
  href: string;
}

const TITLE_RE = /<title[^>]*>([^<]*)<\/title>/i;

export function extractSlideTitle(html: string, fallback: string): string {
  const match = TITLE_RE.exec(html);
  const title = match?.[1]?.replace(/\s+/g, ' ').trim();
  return title && title.length > 0 ? title : fallback;
}

export function listSlideDecks(slidesRoot: string): SlideDeck[] {
  if (!existsSync(slidesRoot)) return [];

  return readdirSync(slidesRoot)
    .filter((name) => {
      const dir = join(slidesRoot, name);
      return statSync(dir).isDirectory() && existsSync(join(dir, 'index.html'));
    })
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((slug) => {
      const html = readFileSync(join(slidesRoot, slug, 'index.html'), 'utf8');
      return {
        slug,
        title: extractSlideTitle(html, slug),
        href: `./${slug}/`,
      };
    });
}

export function slidesPublicRoot(siteRoot: string): string {
  return join(siteRoot, 'public', 'slides');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Page d’index statique : aucun bundle `/_next`, compatible avec le sous-domaine slides. */
export function renderSlidesIndexHtml(decks: SlideDeck[]): string {
  const items =
    decks.length === 0
      ? '<p class="empty">Aucune présentation n’est disponible pour le moment.</p>'
      : `<ul>${decks
          .map(
            (deck) => `<li>
  <a href="${escapeHtml(deck.href)}">
    <span class="title">${escapeHtml(deck.title)}</span>
    <span class="slug">${escapeHtml(deck.slug)}</span>
  </a>
</li>`,
          )
          .join('\n')}</ul>`;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#05090d" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="description" content="Liste des supports de présentation des épisodes Sandbox." />
    <title>Présentations Sandbox</title>
    <style>
      :root {
        color-scheme: dark;
        --ink: #f4f7fa;
        --muted: #9baebb;
        --line: #294457;
        --cyan: #3cd6fc;
        --bg: #05090d;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background: var(--bg);
        color: var(--ink);
        font-family: Inter, 'Segoe UI', Arial, sans-serif;
      }
      main {
        max-width: 42rem;
        margin: 0 auto;
        padding: 3rem 1.25rem 4rem;
      }
      .eyebrow {
        margin: 0 0 0.75rem;
        color: var(--cyan);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0 0 0.75rem;
        font-size: 2rem;
        line-height: 1.15;
      }
      .lead {
        margin: 0 0 2rem;
        color: var(--muted);
        line-height: 1.5;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      li { border-top: 1px solid var(--line); }
      a {
        display: block;
        padding: 1rem 0;
        color: var(--ink);
        text-decoration: none;
      }
      .title { display: block; font-weight: 700; }
      .slug {
        display: block;
        margin-top: 0.25rem;
        color: var(--muted);
      }
      .empty { color: var(--muted); }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Sandbox</p>
      <h1>Présentations</h1>
      <p class="lead">
        Choisissez un support pour l’afficher en plein écran. Les flèches du clavier
        permettent de naviguer dans chaque deck.
      </p>
      ${items}
    </main>
  </body>
</html>
`;
}
