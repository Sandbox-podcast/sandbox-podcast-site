import { describe, expect, it } from 'vitest';
import {
  awardSunday,
  awardPath,
  awardShareContent,
  awardWeekSchema,
  badgePath,
  badgeSnippets,
  badgeSvg,
  emptyRanking,
  escapeBadgeText,
  githubBadgeIdSchema,
  parisWeek,
  rankingEligibility,
  risingStarWinner,
  type AwardCandidate,
} from '../src/domain/badges.ts';

const now = new Date('2026-10-12T03:00:00Z');
describe('partage des récompenses', () => {
  it('partage une page permanente de la semaine et son aperçu social', () => {
    expect(awardPath('2026-W41')).toBe('/charts/awards/2026-W41');
    expect(awardShareContent('https://sandbox.test/path', '2026-W41', 'Projet de test')).toEqual({
      url: 'https://sandbox.test/charts/awards/2026-W41',
      image: 'https://sandbox.test/api/awards/2026-W41/image',
      text: 'Projet de test - Sandbox Rising Star 2026-W41\nhttps://sandbox.test/charts/awards/2026-W41',
    });
    expect(() => awardPath('invalid')).toThrow();
    expect(() => awardShareContent('javascript:alert(1)', '2026-W41', 'Projet')).toThrow();
    expect(() =>
      awardShareContent('https://secret:secret@sandbox.test', '2026-W41', 'Projet'),
    ).toThrow();
  });
});
function snapshot(count = 101) {
  return {
    chart: 'github',
    week: '2026-10-11',
    publishedAt: '2026-10-11T03:00:00Z',
    retrievedAt: '2026-10-11T02:00:00Z',
    provenance: 'auto',
    entries: Array.from({ length: count }, (_, index) => ({
      entity: `project-${index + 1}`,
      rank: index + 1,
      score: 100 - index / 2,
      dimensions: {},
      metrics: {},
    })),
  };
}
const candidate: AwardCandidate = {
  entityId: 'entity-1',
  githubId: 123,
  slug: 'project-1',
  name: 'Fixture project',
  rank: 1,
  score: 100,
  metadata: {
    project: { entityId: 'entity-1', slug: 'project-1', fullName: 'fixture/project' },
    rawMetrics: {
      stars: 1000,
      stars7d: 300,
      acceleration: 100,
      baselineDate: '2026-10-04',
      previousBaselineDate: '2026-09-27',
      collectedAt: '2026-10-11T02:00:00Z',
      insufficientHistory: false,
    },
    sourceEvidence: { score: 7, assessedOn: '2026-10-11' },
  },
};
const source = {
  id: 'edition',
  week: '2026-10-11',
  chart: 'rising',
  scoringVersion: 'rising-cross-source-v2',
  config: {},
  publishedAt: '2026-10-11T03:00:00Z',
  frozenAt: '2026-10-11T03:00:00Z',
  payload: { ...snapshot(1), chart: 'rising' },
};

describe('badges de classement', () => {
  it.each([1, 100])('reprend exactement le rang %i', (rank) => {
    const eligibility = rankingEligibility(snapshot(), `project-${rank}`, now);
    expect(eligibility.status).toBe('ranked');
    expect(eligibility.rank).toBe(rank);
    expect(badgeSvg({ kind: 'ranking', eligibility })).toContain(`TOP 100  #${rank}`);
  });
  it('rend neutres le rang 101, les sorties et les dépôts indisponibles', () => {
    expect(rankingEligibility(snapshot(), 'project-101', now).status).toBe('unranked');
    expect(rankingEligibility(snapshot(1), 'project-100', now).status).toBe('unranked');
    expect(rankingEligibility(snapshot(), 'project-1', now, false).status).toBe('unranked');
    expect(badgeSvg({ kind: 'ranking', eligibility: emptyRanking('unranked') })).not.toContain(
      'TOP 100',
    );
  });
  it('réactive le badge lors du retour, sans conserver un ancien rang', () => {
    expect(rankingEligibility(snapshot(1), 'project-100', now).rank).toBeNull();
    expect(rankingEligibility(snapshot(), 'project-100', now).rank).toBe(100);
  });
  it('refuse les données absentes, simulées, corrompues, futures ou anciennes', () => {
    expect(rankingEligibility(null, 'project-1', now).status).toBe('pending');
    expect(rankingEligibility({ ...snapshot(), provenance: 'mock' }, 'project-1', now).status).toBe(
      'unavailable',
    );
    expect(rankingEligibility({ ...snapshot(), entries: [] }, 'project-1', now).status).toBe(
      'unavailable',
    );
    expect(
      rankingEligibility(snapshot(), 'project-1', new Date('2026-10-10T00:00:00Z')).status,
    ).toBe('stale');
    expect(
      rankingEligibility(snapshot(), 'project-1', new Date('2026-10-13T02:00:00Z')).status,
    ).toBe('stale');
    expect(badgeSvg({ kind: 'ranking', eligibility: emptyRanking('stale') })).not.toContain(
      'TOP 100',
    );
  });
});
describe('identité, SVG et snippets', () => {
  it.each(['0', '-1', '001', '1.2', '1e3', '../repo', '<script>', '9007199254740992'])(
    'refuse le paramètre %s',
    (id) => {
      expect(githubBadgeIdSchema.safeParse(id).success).toBe(false);
    },
  );
  it('conserve une URL numérique permanente même lorsque le nom change', () => {
    expect(badgePath(123)).toBe('/badges/github/123/rank.svg');
    expect(badgePath(123, '2026-W41')).toBe('/badges/github/123/rising-star/2026-W41.svg');
    const before = badgeSnippets('https://sandbox.test', {
      githubId: 123,
      slug: 'old-slug-123',
      name: 'old',
    });
    const after = badgeSnippets('https://sandbox.test', {
      githubId: 123,
      slug: 'old-slug-123',
      name: 'new',
    });
    expect(before.image).toBe(after.image);
    expect(before.target).toBe(after.target);
  });
  it('construit un lien cliquable avec la configuration réelle, une attribution bornée et du HTML échappé', () => {
    const snippets = badgeSnippets('https://sandbox.test/base', {
      githubId: 123,
      slug: 'project-1',
      name: 'repo [x] "<img>',
    });
    expect(snippets.image).toBe('https://sandbox.test/badges/github/123/rank.svg');
    expect(snippets.markdown).toContain('repo \\[x\\]');
    expect(snippets.markdown).toContain(`](${snippets.target})`);
    expect(snippets.html).toContain('&amp;utm_medium=badge');
    expect(snippets.html).toContain('&quot;&lt;img&gt;');
    expect(snippets.alt).not.toContain('#');
    expect(() =>
      badgeSnippets('javascript:alert(1)', { githubId: 123, slug: 'project', name: 'x' }),
    ).toThrow();
  });
  it('échappe les textes XML et produit uniquement un SVG autonome', () => {
    expect(escapeBadgeText('\u0001<&"\'')).toBe('&lt;&amp;&quot;&apos;');
    const svg = badgeSvg({ kind: 'award', week: '<script>&', status: 'awarded' });
    expect(svg).toContain('&lt;script&gt;&amp;');
    expect(svg).not.toMatch(/<script|foreignObject|<image|href=|onload=|<style/);
    expect(Buffer.byteLength(svg)).toBeLessThan(3000);
  });
});
describe('clôture et Rising Star', () => {
  it('respecte Paris, les changements d’heure et les années ISO', () => {
    expect(parisWeek(new Date('2026-10-11T21:59:59Z'))).toBe('2026-W41');
    expect(parisWeek(new Date('2026-10-11T22:00:00Z'))).toBe('2026-W42');
    expect(parisWeek(new Date('2026-10-25T22:59:59Z'))).toBe('2026-W43');
    expect(parisWeek(new Date('2026-10-25T23:00:00Z'))).toBe('2026-W44');
    expect(parisWeek(new Date('2027-01-01T12:00:00Z'))).toBe('2026-W53');
    expect(awardSunday('2026-W53')).toBe('2027-01-03');
    expect(awardWeekSchema.safeParse('2025-W53').success).toBe(false);
    for (const invalidWeek of ['', 'invalid', '2026-W00', '2026-W54', '<script>'])
      expect(awardWeekSchema.safeParse(invalidWeek).success).toBe(false);
  });
  it('attribue au premier rang officiel et refuse toute clôture anticipée', () => {
    expect(risingStarWinner(source, [candidate], '2026-W41', now)?.githubId).toBe(123);
    expect(
      risingStarWinner(source, [candidate], '2026-W41', new Date('2026-10-11T21:59:59Z')),
    ).toBeNull();
    expect(
      risingStarWinner({ ...source, publishedAt: null }, [candidate], '2026-W41', now),
    ).toBeNull();
    expect(
      risingStarWinner({ ...source, week: '2026-10-10' }, [candidate], '2026-W41', now),
    ).toBeNull();
  });
  it('conserve le départage officiel même à score égal', () => {
    const second = {
      ...candidate,
      entityId: 'entity-2',
      githubId: 124,
      slug: 'project-2',
      rank: 2,
    };
    const tied = {
      ...source,
      payload: {
        ...snapshot(2),
        chart: 'rising',
        entries: snapshot(2).entries.map((item) => ({ ...item, score: 100 })),
      },
    };
    expect(risingStarWinner(tied, [second, candidate], '2026-W41', now)?.entityId).toBe('entity-1');
  });
  it('refuse les doublons, les preuves manquantes, les fixtures et les données incohérentes', () => {
    expect(risingStarWinner(source, [candidate, candidate], '2026-W41', now)).toBeNull();
    expect(risingStarWinner(source, [{ ...candidate, metadata: {} }], '2026-W41', now)).toBeNull();
    expect(risingStarWinner(source, [{ ...candidate, score: 99 }], '2026-W41', now)).toBeNull();
    expect(
      risingStarWinner(
        { ...source, payload: { ...snapshot(1), chart: 'rising', provenance: 'mock' } },
        [candidate],
        '2026-W41',
        now,
      ),
    ).toBeNull();
    const proof = candidate.metadata;
    if (!proof || typeof proof !== 'object' || !('rawMetrics' in proof))
      throw new Error('Preuve absente');
    expect(
      risingStarWinner(
        { ...source, config: { maximumRisingStars: 500 } },
        [candidate],
        '2026-W41',
        now,
      ),
    ).toBeNull();
    expect(
      risingStarWinner(
        source,
        [
          {
            ...candidate,
            metadata: {
              ...proof,
              rawMetrics: {
                stars: 1000,
                stars7d: 300,
                acceleration: 100,
                baselineDate: '2026-09-01',
                previousBaselineDate: '2026-08-25',
                collectedAt: '2026-10-11T02:00:00Z',
                insufficientHistory: false,
              },
            },
          },
        ],
        '2026-W41',
        now,
      ),
    ).toBeNull();
  });
});
