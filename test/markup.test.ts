import { describe, expect, it } from 'vitest';
import {
  formatCompact,
  formatDelta,
  formatDuration,
  formatNumber,
  formatTimestamp,
  padRank,
} from '../src/domain/format.ts';
import { parseInline, plainText, safeHref } from '../src/domain/markup.ts';

describe('balisage en ligne', () => {
  it('interprète gras, italique, code, liens et références', () => {
    const nodes = parseInline(
      'Un **gras**, du `code`, _de l’italique_ et [un lien](https://example.com) vers [[entity:claude-code]].',
    );
    const kinds = nodes.map((n) => n.t);
    expect(kinds).toContain('strong');
    expect(kinds).toContain('code');
    expect(kinds).toContain('em');
    expect(kinds).toContain('link');
    expect(nodes.find((n) => n.t === 'ref')).toEqual({
      t: 'ref',
      kind: 'entity',
      id: 'claude-code',
    });
  });

  it('refuse les URL dangereuses : javascript:, data:, protocole relatif et http en clair', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeHref('//evil.example/x')).toBeNull();
    expect(safeHref('http://example.com')).toBeNull();
    expect(safeHref('/charts/github')).toEqual({ href: '/charts/github', external: false });
    expect(safeHref('https://example.com/a')?.external).toBe(true);
  });

  it('laisse tel quel un lien dangereux : il reste du texte, jamais un lien actif', () => {
    const nodes = parseInline('[clic](javascript:alert(1))');
    expect(nodes.some((n) => n.t === 'link')).toBe(false);
  });

  it('ne produit jamais de balisage : le HTML saisi reste du texte', () => {
    const nodes = parseInline('<script>alert(1)</script> <b>x</b>');
    expect(nodes).toEqual([{ t: 'text', v: '<script>alert(1)</script> <b>x</b>' }]);
  });

  it('ne confond pas les underscores des identifiants avec de l’italique', () => {
    expect(plainText('snake_case_name et _vrai italique_')).toBe(
      'snake_case_name et vrai italique',
    );
  });

  it('retire le balisage pour les extraits', () => {
    expect(plainText('**Gras** et [[entity:ollama]] et [lien](https://example.com)')).toBe(
      'Gras et ollama et lien',
    );
  });
});

describe('formats', () => {
  it('écrit les nombres à la française', () => {
    expect(formatNumber(8420)).toBe('8 420');
    expect(formatNumber(94.25, 1)).toBe('94,3');
    expect(formatNumber(-12)).toBe('−12');
  });

  it('compacte les grands compteurs', () => {
    expect(formatCompact(950)).toBe('950');
    expect(formatCompact(14406)).toBe('14,4k');
    expect(formatCompact(108914)).toBe('109k');
    expect(formatCompact(2_400_000)).toBe('2,4M');
  });

  it('signe les variations', () => {
    expect(formatDelta(3)).toBe('+3');
    expect(formatDelta(-2)).toBe('−2');
    expect(formatDelta(0)).toBe('0');
  });

  it('formate les durées et les horodatages', () => {
    expect(formatDuration(4580)).toBe('1 h 16');
    expect(formatDuration(3300)).toBe('55 min');
    expect(formatTimestamp(312)).toBe('5:12');
    expect(formatTimestamp(4105)).toBe('1:08:25');
    expect(padRank(3)).toBe('03');
  });
});
