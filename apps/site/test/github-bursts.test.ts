import { describe, expect, it } from 'vitest';
import { detectGithubBursts, type StarObservation } from '../src/domain/github-bursts.ts';
import { githubDiscoveryPlan, parseGithubTrending } from '../src/domain/github-discovery.ts';
const sample = (hour: number, stars: number, projectId = 'a'): StarObservation => ({
  projectId,
  stars,
  observedAt: new Date(Date.UTC(2026, 9, 13, hour)).toISOString(),
});
describe('détection précoce des étoiles', () => {
  it('détecte une poussée avant une édition quotidienne et conserve ses deux compteurs', () => {
    const event = detectGithubBursts(sample(12, 600), [sample(11, 500)])[0];
    expect(event).toMatchObject({
      gain: 100,
      starsPerHour: 100,
      windowHours: 1,
      stars: 600,
      baselineStars: 500,
      acceleration: null,
    });
  });
  it('attend une vraie baseline de la fenêtre, sans fabriquer un zéro initial', () => {
    expect(detectGithubBursts(sample(12, 2000), [])).toEqual([]);
    expect(detectGithubBursts(sample(12, 2000), [sample(8, 1)])).toEqual([]);
  });
  it('ignore les relevés futurs et les autres dépôts', () => {
    expect(detectGithubBursts(sample(12, 2000), [sample(13, 1), sample(11, 1, 'other')])).toEqual(
      [],
    );
  });
  it('ne transforme pas une baisse en poussée et filtre les petites variations', () => {
    expect(detectGithubBursts(sample(12, 400), [sample(11, 500)])).toEqual([]);
    expect(detectGithubBursts(sample(12, 520), [sample(11, 500)])).toEqual([]);
  });
  it('rapporte le gain à la durée réellement observée et protège les petits dénominateurs', () => {
    const current = { ...sample(12, 101), observedAt: '2026-10-13T12:15:00.000Z' };
    const event = detectGithubBursts(current, [sample(11, 1)])[0];
    expect(event?.elapsedHours).toBe(1.25);
    expect(event?.starsPerHour).toBe(80);
    expect(event?.relativeGrowth).toBe(0.5);
  });
  it('peut détecter un gain exceptionnel sur un grand projet sans exiger 5 % de croissance', () => {
    expect(detectGithubBursts(sample(12, 100250), [sample(11, 100000)])[0]?.gain).toBe(250);
  });
  it('mesure l accélération uniquement avec une période précédente positive', () => {
    expect(
      detectGithubBursts(sample(12, 600), [sample(10, 480), sample(11, 500)])[0]?.acceleration,
    ).toBe(4);
    expect(
      detectGithubBursts(sample(12, 600), [sample(10, 500), sample(11, 500)])[0]?.acceleration,
    ).toBeNull();
  });
  it('refuse des compteurs contradictoires au même instant', () => {
    expect(() => detectGithubBursts(sample(12, 600), [sample(11, 500), sample(11, 400)])).toThrow();
  });
});
describe('découverte GitHub', () => {
  it('couvre aussi les projets hors IA, fait tourner ses partitions et expose les petits projets', () => {
    const first = githubDiscoveryPlan('2026-10-13');
    expect(
      first.some(
        (query) =>
          query.includes('stars:100..199') &&
          !query.includes('topic:') &&
          !query.includes('language:'),
      ),
    ).toBe(true);
    expect(first.some((query) => query.includes('language:"Rust"'))).toBe(true);
    expect(first[0]).not.toBe(githubDiscoveryPlan('2026-10-14')[0]);
  });
  it('ne lit que les liens de dépôts des titres Trending et déduplique', () => {
    const html =
      '<a href="/noise/link">Noise</a><article class="Box-row"><h2><a href="/org/repo">Repo</a></h2><a href="/org/repo/stargazers">Stars</a></article><article><h2><a href="/ORG/Repo">Duplicate</a></h2></article><article><h2><a href="https://evil.example/org/repo">Fake</a></h2></article>';
    expect(parseGithubTrending(html)).toEqual(['org/repo']);
    expect(() => parseGithubTrending('<html>Layout changed</html>')).toThrow();
  });
});
