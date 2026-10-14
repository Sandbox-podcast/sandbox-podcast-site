import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  extractSlideTitle,
  listSlideDecks,
  renderSlidesIndexHtml,
  slidesPublicRoot,
} from '../src/domain/slide-decks';
import {
  SLIDES_HOST,
  isSlidesHost,
  slidesBrowserRedirect,
  slidesRewriteDestination,
} from '../src/domain/subdomain-routing';

const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('slide decks', () => {
  it('extrait le titre HTML ou retombe sur le slug', () => {
    expect(extractSlideTitle('<title>Sandbox — épisode 001</title>', 'episode-001')).toBe(
      'Sandbox — épisode 001',
    );
    expect(extractSlideTitle('<html></html>', 'episode-001')).toBe('episode-001');
  });

  it('liste les dossiers qui contiennent un index.html', () => {
    const root = mkdtempSync(join(tmpdir(), 'slides-'));
    temps.push(root);
    mkdirSync(join(root, 'episode-001'));
    mkdirSync(join(root, 'episode-044'));
    mkdirSync(join(root, 'draft-empty'));
    writeFileSync(join(root, 'episode-044', 'index.html'), '<title>Épisode 044</title>');
    writeFileSync(join(root, 'episode-001', 'index.html'), '<title>Sandbox — épisode 001</title>');

    expect(listSlideDecks(root)).toEqual([
      {
        slug: 'episode-001',
        title: 'Sandbox — épisode 001',
        href: './episode-001/index.html',
      },
      {
        slug: 'episode-044',
        title: 'Épisode 044',
        href: './episode-044/index.html',
      },
    ]);
  });

  it('rend une page d’index statique sans bundle Next', () => {
    const html = renderSlidesIndexHtml([
      {
        slug: 'episode-001',
        title: 'Sandbox — épisode 001',
        href: './episode-001/index.html',
      },
    ]);
    expect(html).toContain('<title>Présentations Sandbox</title>');
    expect(html).toContain('href="./episode-001/index.html"');
    expect(html.includes('/_next/')).toBe(false);
  });

  it('place les neuf actualités dans le Radar, puis conserve la Bêta et le Clash', () => {
    const html = readFileSync(
      join(slidesPublicRoot(process.cwd()), 'episode-002', 'index.html'),
      'utf8',
    );
    expect(html).toContain('<title>Sandbox — épisode 002</title>');

    const deckDataScript = /<script\s+id="deckData"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    const deckJson = deckDataScript?.[1];
    expect(deckJson).toBeDefined();
    if (!deckJson) throw new Error('Les données des diapositives sont absentes.');

    const deck = JSON.parse(deckJson) as {
      meta: { main: number; betaMain: number; annexes: number; title: string };
      slides: {
        layout: string;
        n: number;
        title: string;
        items: unknown[];
        note: string;
        sources: string[];
      }[];
    };

    expect(deck.meta).toMatchObject({
      main: 22,
      betaMain: 5,
      annexes: 0,
      title: "Comment utiliser l'IA quand on est un artisan ou un commerçant ?",
    });
    expect(deck.slides.map(({ n }) => n)).toEqual(
      Array.from({ length: 22 }, (_, index) => index + 1),
    );
    expect(deck.slides[0]).toMatchObject({
      n: 1,
      layout: 'section-radar',
      title: 'Le Radar',
    });
    expect(deck.slides[1]).toMatchObject({
      layout: 'radar-muse-wonder',
      title: 'Meta lance Muse Wonder',
      sources: ['metaMuseWonder', 'metaMuseWonderModel'],
    });
    expect(deck.slides[1]?.items).toHaveLength(3);
    expect(deck.slides[1]?.note).toContain('12 octobre 2026');
    expect(html).toContain('href="https://research.meta.ai/blog/muse-wonder"');
    expect(html).toContain('href="https://dev.meta.ai/models/muse-wonder"');
    expect(deck.slides.slice(2, 7).map(({ layout }) => layout)).toEqual([
      'radar-gemini-argon',
      'radar-self-replication',
      'radar-claude-unintended-actions',
      'radar-maia-300',
      'radar-ai-glasses',
    ]);
    expect(deck.slides.slice(2, 7).map(({ sources }) => sources)).toEqual([
      ['googleGeminiArgon'],
      ['anthropicReplication'],
      ['anthropicUnintendedActions'],
      ['microsoftMaia'],
      ['apAiGlasses'],
    ]);
    expect(deck.slides[2]?.note).toContain('pas une évaluation indépendante');
    expect(deck.slides[3]?.note).toContain('ne montre pas un ver IA autonome');
    expect(deck.slides[4]?.note).toContain('impact a été faible');
    expect(deck.slides[5]?.title).toBe('Maia 300 : Microsoft veut moins dépendre de Nvidia');
    expect(deck.slides[5]?.note).toContain(
      'ne signifie pas que Microsoft cesse de travailler avec Nvidia',
    );
    expect(deck.slides[6]?.note).toContain('pas une interdiction générale adoptée');
    expect(deck.slides[7]).toMatchObject({
      layout: 'radar-rea',
      title: 'REA : l’IA peut-elle refaire ton logiciel ?',
      sources: ['reaGithub', 'reaDxBall', 'reaArtCraft', 'reaArtCraftCleanRoom'],
    });
    expect(deck.slides[7]?.note).toContain('ne prétend pas récupérer le code source');
    expect(deck.slides[7]?.note).toContain('Ne pas attribuer cette suite à REA');
    expect(deck.slides[8]).toMatchObject({
      layout: 'radar-runway-claude',
      title: 'Claude devient-il Spielberg ?',
      sources: ['runwaySkills', 'runwayMcp', 'runwayElevenLabs', 'runwayApp'],
    });
    expect(deck.slides[8]?.note).toContain('ce connecteur est distinct du dépôt GitHub');
    expect(deck.slides[9]).toMatchObject({
      layout: 'radar-supermarket-cold-chain',
      title: 'Des frigos de supermarché forcés à chauffer',
      sources: ['supermarketCERTFR', 'supermarketLeMonde', 'supermarketAP'],
    });
    expect(deck.slides[9]?.note).toContain('Danfoss AK-SM et AK-SC');
    expect(deck.slides[9]?.note).toContain('Le Monde rapporte');
    expect(deck.slides[9]?.note).toContain('L’AP rapporte 80 magasins U');
    expect(deck.slides[9]?.note).toContain('Metro a indiqué au Monde');
    expect(deck.slides[9]?.note).toContain('pas une déclaration de perte totale du groupement');
    expect(deck.slides[9]?.note).toContain('aucune revendication publique');
    expect(deck.slides.slice(2, 10).every(({ items }) => items.length === 3)).toBe(true);
    expect(deck.slides[10]).toMatchObject({
      layout: 'radar-ai-persuasion',
      title: 'Une IA peut-elle faire changer d’avis ?',
      sources: [
        'conspiracyScience',
        'conspiracyScienceConcern',
        'conspiracyScienceCorrection',
        'redditCMVMods',
        'redditCMVReporting',
      ],
    });
    expect(deck.slides[10]?.note).toContain('2 190 personnes');
    expect(deck.slides[10]?.note).toContain('baisse moyenne d’environ 20 %');
    expect(deck.slides[10]?.note).toContain('expression de préoccupation');
    expect(deck.slides[10]?.note).toContain('99e percentile');
    expect(deck.slides[10]?.note).toContain('hypothèse de discussion');
    expect(deck.slides[11]).toMatchObject({ layout: 'section-build', title: 'Le Build' });
    expect(deck.slides[12]).toMatchObject({
      layout: 'beta-question',
      title: "Comment utiliser l'IA\nquand on est un artisan\nou un commerçant ?",
    });
    expect(deck.slides.slice(12, 17).map(({ layout }) => layout)).toEqual([
      'beta-question',
      'beta-roi',
      'beta-tools',
      'beta-method',
      'beta-comments',
    ]);
    expect(deck.slides[17]).toMatchObject({ layout: 'section-clash', title: 'Le Clash' });
    expect(deck.slides.slice(18).map(({ layout }) => layout)).toEqual([
      'clash-tickets',
      'clash-legacy',
      'clash-code-review',
      'clash-coding-skill',
    ]);
    expect(deck.slides.slice(18).map(({ title }) => title)).toEqual([
      'Est-ce que les développeurs ont encore besoin de lire les tickets ?',
      'À l’ère de l’IA, est-ce qu’il faut encore sauver le legacy ?',
      'Tu relis vraiment le code généré par l’IA ?',
      'Est-ce qu’on aura encore besoin de développeurs « qui savent coder » ?',
    ]);
    expect(deck.slides.slice(18).every(({ title }) => title.endsWith('?'))).toBe(true);
    expect(deck.slides.slice(18).every(({ items }) => items.length === 0)).toBe(true);
    expect(deck.slides[13]?.items).toHaveLength(8);
    expect([...html.matchAll(/class="roi-sector"/g)]).toHaveLength(8);
    expect(deck.slides[13]?.sources).toEqual([
      'franceUsages',
      'dgeCommerce',
      'cmaArtisans',
      'cnil',
    ]);
    expect(deck.slides[13]?.note).toContain('pas un classement de ROI mesuré');
    expect(deck.slides[13]?.note).toContain('temps de relecture et de correction');
    expect(deck.slides[14]?.items).toHaveLength(5);
    expect(deck.slides[15]?.note).toContain('Mobbin');
    expect(deck.slides[15]?.note).toContain('Landbook');
    expect(deck.slides[15]?.note).toContain('vidéo');
    expect([...html.matchAll(/id="beta-slide-(\d+)"/g)].map((match) => Number(match[1]))).toEqual(
      Array.from({ length: 5 }, (_, index) => index + 1),
    );
    expect(/<template\s+id="annexes"\s*>/.test(html)).toBe(true);
    expect(html.includes('data:image/')).toBe(false);
  });

  it('reprend les visuels 1, 9 et 18, le vrai logo et le style de l’épisode 001', () => {
    const root = slidesPublicRoot(process.cwd());
    const reference = readFileSync(join(root, 'episode-001', 'index.html'), 'utf8');
    const html = readFileSync(join(root, 'episode-002', 'index.html'), 'utf8');
    const sections = (markup: string) =>
      [...markup.matchAll(/<section\b[\s\S]*?<\/section>/g)].map(([section]) =>
        section.replace(/\s+/g, ' ').trim(),
      );
    const original = sections(reference);
    const updated = sections(html);
    expect(updated).toHaveLength(22);
    expect(updated[0]).toBe(original[0]);
    expect(updated[11]).toBe(original[8]);
    expect(updated[17]).toBe(original[17]);
    expect(
      updated
        .slice(18)
        .every(
          (section) =>
            section.includes('clash-single-question') &&
            (section.match(/<h2\b/g) ?? []).length === 1 &&
            !section.includes('<h3') &&
            !section.includes('clash-questions'),
        ),
    ).toBe(true);
    expect(html).toContain('src="../episode-001/assets/sandbox-logov2.png"');
    expect(html).toContain('aria-label="Commandes de présentation"');
    expect(html.includes('class="toolbar"')).toBe(false);

    const originalCss = /<style>([\s\S]*?)<\/style>/.exec(reference)?.[1];
    expect(originalCss).toBeDefined();
    const copiedCss = readFileSync(join(root, 'episode-002/assets/episode-001.css'), 'utf8');
    expect(copiedCss.replace(/\s+/g, ' ').trim()).toBe(
      originalCss
        ?.replaceAll("url('./assets/", "url('../../episode-001/assets/")
        .replace(/\s+/g, ' ')
        .trim(),
    );
  });

  it('conserve la démo Bêta isolée et interdit ses connexions réseau', () => {
    const root = slidesPublicRoot(process.cwd());
    const html = readFileSync(join(root, 'episode-002', 'index.html'), 'utf8');
    const demo = readFileSync(join(root, 'episode-002/assets/beta-demo.html'), 'utf8');
    expect(html).toContain('sandbox="allow-scripts allow-forms"');
    expect(html.includes('allow-same-origin')).toBe(false);
    expect(demo).toContain("default-src 'none'");
    expect(demo).toContain("connect-src 'none'");
    expect(demo).toContain("form-action 'none'");
    expect(demo).toContain('62 + 38 = 100');
  });

  it('place les huit slides de la Bêta après son intertitre', () => {
    const root = slidesPublicRoot(process.cwd());
    const html = readFileSync(join(root, 'episode-001', 'index.html'), 'utf8');
    const slideCount = [...html.matchAll(/<section\s+class="slide[^"]*"/g)].length;
    const betaSlides = [...html.matchAll(/id="beta-slide-(\d+)"/g)].map((match) =>
      Number(match[1]),
    );

    expect(slideCount).toBe(27);
    expect(betaSlides).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(html.indexOf('id="beta-slide-1"')).toBeGreaterThan(
      html.indexOf('aria-label="Séquence La Bêta"'),
    );
    expect(html).toContain('sandbox="allow-scripts"');

    const demo = readFileSync(join(root, 'episode-001', 'assets', 'beta-demo.html'), 'utf8');
    expect(demo).toContain("default-src 'none'");
    expect(demo).toContain("connect-src 'none'");
  });

  it('garde public/slides/index.html aligné avec les decks du dépôt', () => {
    const decks = listSlideDecks(slidesPublicRoot(process.cwd()));
    const actual = readFileSync(join(process.cwd(), 'public/slides/index.html'), 'utf8');
    expect(decks.length).toBeGreaterThan(0);
    expect(actual.includes('/_next/')).toBe(false);
    for (const deck of decks) {
      expect(actual).toContain(`href="${deck.href}"`);
      expect(actual).toContain(deck.title);
      expect(actual).toContain(deck.slug);
    }
  });
});

describe('subdomain routing', () => {
  it('reconnaît l’hôte slides', () => {
    expect(SLIDES_HOST).toBe('slides.sandboxpodcast.fr');
    expect(isSlidesHost('slides.sandboxpodcast.fr')).toBe(true);
    expect(isSlidesHost('www.sandboxpodcast.fr')).toBe(false);
  });

  it('canonise les decks vers index.html pour éviter la boucle de slash', () => {
    expect(slidesBrowserRedirect('/episode-001')).toBe('/episode-001/index.html');
    expect(slidesBrowserRedirect('/episode-001/')).toBe('/episode-001/index.html');
    expect(slidesBrowserRedirect('/episode-001/index.html')).toBeNull();
    expect(slidesBrowserRedirect('/')).toBeNull();
  });

  it('réécrit vers des fichiers index.html et préserve les assets', () => {
    expect(slidesRewriteDestination('/')).toBe('/slides/index.html');
    expect(slidesRewriteDestination('/episode-001/index.html')).toBe(
      '/slides/episode-001/index.html',
    );
    expect(slidesRewriteDestination('/episode-001/assets/logo.png')).toBe(
      '/slides/episode-001/assets/logo.png',
    );
    expect(slidesRewriteDestination('/slides/index.html')).toBeNull();
    expect(slidesRewriteDestination('/_next/static/chunk.js')).toBeNull();
  });
});
