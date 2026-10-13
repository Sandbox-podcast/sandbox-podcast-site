import { describe, expect, it, vi } from 'vitest';
import { ScorecardClient, SECURITY_CHECKS } from '../src/pipeline/scorecard-client.ts';

describe('client OpenSSF Scorecard', () => {
  it('valide le dépôt, la date et le score publiés', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          date: '2026-10-04T12:00:00Z',
          repo: { name: 'github.com/example/repo', commit: 'abc' },
          score: 7.4,
          checks: SECURITY_CHECKS.slice(0, 6).map((name) => ({ name, score: 8 })),
        }),
      ),
    );
    const result = await new ScorecardClient({ fetch: fetcher }).repository('example/repo');
    expect(result).toMatchObject({
      score: 7,
      overallScore: 7.4,
      checksUsed: 6,
      assessedOn: '2026-10-04',
    });
    const request = fetcher.mock.calls[0]?.[0];
    if (!(request instanceof URL)) throw new Error('URL OpenSSF absente.');
    expect(request.href).toBe('https://api.scorecard.dev/projects/github.com/example/repo');
  });

  it('n’accepte ni identité discordante ni résultat hors échelle', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          date: '2026-10-04T12:00:00Z',
          repo: { name: 'github.com/other/repo' },
          score: 12,
        }),
      ),
    );
    await expect(
      new ScorecardClient({ fetch: fetcher }).repository('example/repo'),
    ).rejects.toThrow();
  });

  it('traite un dépôt non couvert comme une mesure manquante', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 404 }));
    await expect(
      new ScorecardClient({ fetch: fetcher }).repository('example/repo'),
    ).resolves.toBeNull();
  });

  it('ne transforme pas un rapport presque vide en preuve', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          date: '2026-10-04T12:00:00Z',
          repo: { name: 'github.com/example/repo' },
          score: 8,
          checks: [{ name: 'CI-Tests', score: 10 }],
        }),
      ),
    );
    await expect(
      new ScorecardClient({ fetch: fetcher }).repository('example/repo'),
    ).resolves.toBeNull();
  });
});
