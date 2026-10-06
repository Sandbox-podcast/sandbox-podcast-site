/**
 * Balisage en ligne minimal pour les textes éditoriaux. Aucun HTML : le texte devient un arbre de nœuds
 * que React affiche en l'échappant, donc un texte ne peut pas injecter de balisage ni de script.
 *
 *   **gras**   _italique_   `code`   [libellé](https://…)   [libellé](/chemin)
 *   [[entity:claude-code]]   [[chart:github]]   [[episode:42]]   [[story:mon-article]]
 */

export type InlineNode =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: InlineNode[] }
  | { t: 'em'; c: InlineNode[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; external: boolean; c: InlineNode[] }
  | { t: 'ref'; kind: 'entity' | 'chart' | 'episode' | 'story'; id: string };

/** Une URL est sûre si elle est en https ou si c'est un chemin interne. Tout le reste (javascript:, data:…) est refusé. */
export function safeHref(href: string): { href: string; external: boolean } | null {
  if (/^\/(?!\/)/.test(href)) return { href, external: false };
  if (/^https:\/\//i.test(href)) {
    try {
      return { href: new URL(href).toString(), external: true };
    } catch {
      return null;
    }
  }
  return null;
}

const REF = /^\[\[(entity|chart|episode|story):([a-z0-9-]+)\]\]/;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)/;

export function parseInline(input: string): InlineNode[] {
  const out: InlineNode[] = [];
  let buffer = '';
  const flush = (): void => {
    if (buffer) out.push({ t: 'text', v: buffer });
    buffer = '';
  };

  let i = 0;
  while (i < input.length) {
    const rest = input.slice(i);

    const ref = REF.exec(rest);
    if (ref) {
      flush();
      out.push({
        t: 'ref',
        kind: ref[1] as 'entity' | 'chart' | 'episode' | 'story',
        id: ref[2] ?? '',
      });
      i += ref[0].length;
      continue;
    }

    const link = LINK.exec(rest);
    if (link) {
      const safe = safeHref(link[2] ?? '');
      if (safe) {
        flush();
        out.push({
          t: 'link',
          href: safe.href,
          external: safe.external,
          c: parseInline(link[1] ?? ''),
        });
        i += link[0].length;
        continue;
      }
    }

    if (rest.startsWith('**')) {
      const end = rest.indexOf('**', 2);
      if (end > 2) {
        flush();
        out.push({ t: 'strong', c: parseInline(rest.slice(2, end)) });
        i += end + 2;
        continue;
      }
    }

    if (rest.startsWith('`')) {
      const end = rest.indexOf('`', 1);
      if (end > 1) {
        flush();
        out.push({ t: 'code', v: rest.slice(1, end) });
        i += end + 1;
        continue;
      }
    }

    if (rest.startsWith('_') && (i === 0 || /[\s(«"]/.test(input[i - 1] ?? ''))) {
      const end = rest.indexOf('_', 1);
      if (end > 1 && !/\w/.test(rest[end + 1] ?? ' ')) {
        flush();
        out.push({ t: 'em', c: parseInline(rest.slice(1, end)) });
        i += end + 1;
        continue;
      }
    }

    buffer += input[i] ?? '';
    i += 1;
  }
  flush();
  return out;
}

/** Texte brut d'un balisage : pour les métadonnées et les extraits. */
export function plainText(input: string): string {
  const walk = (nodes: InlineNode[]): string =>
    nodes
      .map((n) => {
        switch (n.t) {
          case 'text':
          case 'code':
            return n.v;
          case 'strong':
          case 'em':
          case 'link':
            return walk(n.c);
          case 'ref':
            return n.id;
        }
      })
      .join('');
  return walk(parseInline(input));
}
