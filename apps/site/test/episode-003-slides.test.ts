import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import episode from '../public/slides/episode-003/content.json';
import shorts from '../public/slides/episode-003/shorts.json';
import rundown from '../public/slides/episode-003/rundown.json';
import {
  buildScenes,
  buildShortScenes,
  buildEpisodeScenes,
  isSelectable,
  restoreChoices,
  sceneIndex,
} from '../public/slides/episode-003/model.js';

const root = resolve(process.cwd(), 'public/slides/episode-003');
const scenes = buildScenes(episode);
const sourceSchema = z.object({ title: z.string().min(1), url: z.url().startsWith('https://') });
const newsSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  date: z.iso.date().refine((date) => date >= '2026-10-16' && date <= '2026-10-18'),
  publisher: z.string().min(1),
  image: z.string().regex(/^[a-z0-9-]+\.png$/),
  points: z.array(z.string().min(1)).length(3),
  hook: z.string().min(1),
  question: z.string().min(1),
  caution: z.string().min(1),
  dateEvidence: z.string().min(1),
  sources: z.array(sourceSchema).min(1),
});

describe('préparation des slides de l’épisode 003', () => {
  it('borne les dix actualités à la fenêtre demandée avec preuves, sources et captures locales', () => {
    const news = z.array(newsSchema).length(10).parse(episode.news);
    expect(new Set(news.map((item) => item.id)).size).toBe(10);
    for (const item of news) {
      expect(existsSync(resolve(root, 'assets/sources', item.image)), item.image).toBe(true);
      expect(
        readFileSync(resolve(root, 'assets/sources', item.image))
          .subarray(1, 4)
          .toString(),
      ).toBe('PNG');
    }
    expect(newsSchema.safeParse({ ...news[0], date: '2026-10-15' }).success).toBe(false);
    expect(newsSchema.safeParse({ ...news[0], date: '2026-10-19' }).success).toBe(false);
    expect(newsSchema.safeParse({ ...news[0], sources: [] }).success).toBe(false);
  });

  it('conserve huit essais documentés et distingue les installations de l’usage', () => {
    expect(episode.skills).toHaveLength(8);
    expect(new Set(episode.skills.map((skill) => skill.id)).size).toBe(8);
    for (const skill of episode.skills) {
      expect(z.url().safeParse(skill.url).success).toBe(true);
      expect(skill.demo.length).toBeGreaterThan(0);
      expect(skill.caution.length).toBeGreaterThan(0);
      expect(skill.prompt.length).toBeGreaterThan(0);
    }
    expect(episode.leaderboard.metric).toContain("ne mesure pas l'usage actif");
    expect(episode.social).toHaveLength(6);
    expect(episode.social.every((item) => item.scope.length > 0)).toBe(true);
  });

  it('conserve le réservoir initial sans choisir les actualités à la place de l’équipe', () => {
    expect(scenes).toHaveLength(27);
    expect(new Set(scenes.map((scene) => scene.id)).size).toBe(27);
    expect(
      scenes.filter((scene) => scene.kind === 'section').map((scene) => scene.chapter),
    ).toEqual(['Radar', 'Build', 'Clash', 'Bêta']);
    expect(scenes.filter((scene) => scene.kind === 'news')).toHaveLength(10);
    expect(scenes.filter((scene) => scene.kind === 'skill')).toHaveLength(8);
    expect(restoreChoices(null, scenes)).toEqual({});
    expect(restoreChoices({}, scenes)).toEqual({});
  });

  it('accepte les ancres connues et revient au début pour une ancre invalide', () => {
    expect(sceneIndex('#deepseek', scenes)).toBe(1);
    expect(sceneIndex('#2', scenes)).toBe(1);
    expect(sceneIndex('#skill-hyperframes', scenes)).toBe(13);
    for (const hash of ['', '#unknown', '#-1', '#1.5', '#999', '#0']) {
      expect(sceneIndex(hash, scenes)).toBe(0);
    }
  });

  it('restaure uniquement les décisions connues sur les sujets qui peuvent être triés', () => {
    expect(
      restoreChoices(
        {
          deepseek: 'keep',
          'skill-hyperframes': 'reserve',
          minecraft: 'drop',
          radar: 'keep',
          unknown: 'keep',
          beam: 'publier',
        },
        scenes,
      ),
    ).toEqual({ deepseek: 'keep', 'skill-hyperframes': 'reserve', minecraft: 'drop' });
    expect(restoreChoices(['keep'], scenes)).toEqual({});
    expect(restoreChoices(Object.create({ deepseek: 'keep' }), scenes)).toEqual({});
    expect(restoreChoices('invalid', scenes)).toEqual({});
  });

  it('sert les scripts localement et ne charge aucun lecteur social dans le support', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    expect(html).toContain("script-src 'self'");
    expect(html).toContain("object-src 'none'");
    expect(html).toContain('noindex, nofollow');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('allow-same-origin');
  });

  it('remplit la fenêtre sans cadre fixe et réserve quatre cinquièmes de la largeur aux images', () => {
    const css = readFileSync(resolve(root, 'show.css'), 'utf8');
    expect(css).toContain('height: 100dvh');
    expect(css).toContain('grid-template-rows: auto minmax(0, 1fr) auto auto');
    expect(css).toContain('grid-template-columns: minmax(0, 4fr) minmax(0, 1fr)');
    expect(css).not.toContain('max-width: 1920px');
    expect(css).not.toContain('min-height: 520px');
    expect(css).not.toContain('calc(100dvh -');
    expect(css).toMatch(/\.source-image\s*\{[^}]*object-fit: contain/s);
    expect(css).toMatch(/\.chapter-art\s*\{[^}]*object-fit: cover/s);
    expect(css).toContain('@media (max-aspect-ratio: 1/1)');
  });

  it('propose un mode live sans régie et une image seule sans modifier les séquences', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    const script = readFileSync(resolve(root, 'show.js'), 'utf8');
    const css = readFileSync(resolve(root, 'show.css'), 'utf8');
    for (const control of ['present', 'leave-live', 'image-only', 'fullscreen']) {
      expect(html).toContain(`id="${control}"`);
    }
    expect(script).toContain("presentationUrl.searchParams.get('live') === '1'");
    expect(script).toContain("document.addEventListener('fullscreenchange'");
    expect(script).toContain("if (scenes[current].kind !== 'news') return");
    expect(script).toContain(
      "if (scene.kind !== 'news') document.body.classList.remove('image-only')",
    );
    expect(script).toContain('aria-hidden="true"');
    expect(css).toMatch(/body\.presenting > footer\s*\{\s*display: none/);
    expect(css).toMatch(/body\.image-only \.news \.copy\s*\{\s*display: none/);
    expect(buildEpisodeScenes(episode, rundown)).toHaveLength(21);
  });

  it('prépare dix shorts sourcés avec preuve, déroulé et raison de revenir', () => {
    const pitchSchema = z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      title: z.string().min(1),
      hook: z.string().min(1),
      visual: z.string().min(1),
      follow: z.string().min(1),
      rationale: z.string().min(1),
      requirements: z.string().min(1),
      caution: z.string().min(1),
      status: z.literal("Proposition de tournage. Aucun résultat d'essai annoncé."),
      alternatives: z.array(z.string().min(1)).length(2),
      beats: z.array(z.object({ time: z.string().min(1), text: z.string().min(1) })).length(4),
      sources: z.array(sourceSchema).min(1),
    });
    expect(z.array(pitchSchema).length(10).safeParse(shorts.pitches).success).toBe(true);
    expect(
      shorts.pitches.filter((pitch) => pitch.priority === 'À tourner en premier'),
    ).toHaveLength(3);
    expect(shorts.comparisons).toHaveLength(3);
    for (const comparison of shorts.comparisons) {
      expect(comparison.scope.length).toBeGreaterThan(0);
      expect(z.array(sourceSchema).min(2).safeParse(comparison.sources).success).toBe(true);
    }
    expect(shorts.evidenceCaution).toContain('pas abonnements gagnés');
  });

  it('conserve les propositions de shorts et les choix déjà enregistrés', () => {
    const shortScenes = buildShortScenes(shorts);
    const allScenes = [...scenes, ...shortScenes];
    expect(shortScenes).toHaveLength(14);
    expect(new Set(allScenes.map((scene) => scene.id)).size).toBe(allScenes.length);
    expect(shortScenes.filter(isSelectable)).toHaveLength(10);
    expect(scenes.filter(isSelectable)).toHaveLength(18);
    expect(sceneIndex('#short-design', shortScenes)).toBe(3);
    expect(sceneIndex('#pattern', shortScenes)).toBe(1);
    expect(
      restoreChoices(
        { deepseek: 'keep', 'short-design': 'reserve', pattern: 'keep', 'short-unknown': 'drop' },
        allScenes,
      ),
    ).toEqual({ deepseek: 'keep', 'short-design': 'reserve' });
  });

  it('garde les quatre pages illustrées, dix actus et trois questions, sans les compléments', () => {
    const current = buildEpisodeScenes(episode, rundown);
    expect(current).toHaveLength(21);
    expect(new Set(current.map((scene) => scene.id)).size).toBe(21);
    expect(
      current.filter((scene) => scene.kind === 'section').map(({ id, image }) => ({ id, image })),
    ).toEqual(
      scenes.filter((scene) => scene.kind === 'section').map(({ id, image }) => ({ id, image })),
    );
    const chapters: string[] = [];
    for (const scene of current) {
      if (scene.kind === 'section') chapters.push(scene.chapter);
      expect(scene.chapter).toBe(chapters.at(-1));
    }
    expect(chapters).toEqual(['Radar', 'Build', 'Clash', 'Bêta']);
    expect(current[0]?.id).toBe('radar');
    expect(current.filter((scene) => scene.kind === 'news')).toEqual(
      scenes.filter((scene) => scene.kind === 'news'),
    );
    expect(current.filter((scene) => scene.kind === 'debate')).toHaveLength(3);
    expect(current.filter((scene) => scene.chapter === 'Clash')).toHaveLength(4);
    expect(current.filter((scene) => scene.chapter === 'Bêta')).toHaveLength(1);
    expect(current.filter(isSelectable)).toHaveLength(10);
    expect(
      current.some((scene) =>
        ['short', 'skill', 'pattern', 'leaderboard', 'evidence', 'measurement', 'social'].includes(
          scene.kind,
        ),
      ),
    ).toBe(false);
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    for (const anchor of ['radar', 'build', 'clash', 'beta']) {
      expect(html).toContain(`href="#${anchor}"`);
    }
    expect(html).not.toContain('view=shorts');
  });

  it('limite le Build à un sujet en quatre étapes et trente minutes, dans une émission de 60 à 90 minutes', () => {
    const minutes = z.number().int().positive();
    const segmentSchema = z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      minutes,
      minMinutes: minutes,
      maxMinutes: minutes,
    });
    const stepSchema = z.object({
      id: z.string().regex(/^build-[a-z-]+$/),
      title: z.string().min(1),
      label: z.string().min(1),
      minutes,
      points: z.array(z.string().min(1)).length(3),
      notes: z.array(z.string().min(1)).min(1),
    });
    const segments = z.array(segmentSchema).length(5).parse(rundown.segments);
    const steps = z.array(stepSchema).length(4).parse(rundown.build.steps);
    expect(segments.map((segment) => segment.id)).toEqual([
      'intro',
      'radar',
      'build',
      'clash',
      'beta',
    ]);
    expect(segments.reduce((total, segment) => total + segment.minutes, 0)).toBe(
      rundown.targetMinutes,
    );
    expect(segments.reduce((total, segment) => total + segment.minMinutes, 0)).toBe(
      rundown.minMinutes,
    );
    expect(segments.reduce((total, segment) => total + segment.maxMinutes, 0)).toBe(
      rundown.maxMinutes,
    );
    expect(rundown.targetMinutes).toBe(75);
    expect(rundown.minMinutes).toBe(60);
    expect(rundown.maxMinutes).toBe(90);
    for (const segment of segments) {
      expect(segment.minutes).toBeGreaterThanOrEqual(segment.minMinutes);
      expect(segment.minutes).toBeLessThanOrEqual(segment.maxMinutes);
    }
    expect(steps.reduce((total, step) => total + step.minutes, 0)).toBe(30);
    expect(segments.find((segment) => segment.id === 'build')?.maxMinutes).toBe(30);
    expect(episode.skills.some((skill) => skill.id === rundown.build.skillId)).toBe(true);
    const current = buildEpisodeScenes(episode, rundown);
    const build = current.filter((scene) => scene.kind === 'build-step');
    expect(build).toHaveLength(4);
    expect(new Set(build.map((scene) => scene.topicId))).toEqual(new Set(['frontend-design']));
    expect(build.reduce((total, scene) => total + (scene.durationMinutes ?? 0), 0)).toBe(30);
  });

  it('redirige les anciennes ancres sans réintroduire les sujets retirés', () => {
    const current = buildEpisodeScenes(episode, rundown);
    for (const [old, target] of [
      ['short-canvas', 'cursor-canvas'],
      ['short-minecraft', 'minecraft'],
      ['short-deepseek', 'deepseek'],
      ['short-design', 'build-brief'],
      ['skill-frontend-design', 'build-brief'],
      ['angle', 'build'],
      ['short-grill', 'clash'],
      ['measurement', 'beta'],
    ]) {
      expect(current[sceneIndex(`#${old}`, current)]?.id).toBe(target);
    }
    expect(sceneIndex('#unknown', current)).toBe(0);
    const saved = { deepseek: 'keep', 'skill-hyperframes': 'reserve', 'short-design': 'keep' };
    const restored = restoreChoices(saved, [...scenes, ...buildShortScenes(shorts)]);
    expect(restored).toEqual(saved);
    expect(
      restoreChoices({ ...restored, minecraft: 'keep' }, [...scenes, ...buildShortScenes(shorts)]),
    ).toEqual({ ...saved, minecraft: 'keep' });
    expect(restoreChoices(restored, current)).toEqual({ deepseek: 'keep' });
  });

  it('explique le skill et le cas concret avant toute comparaison non réalisée', () => {
    const introduction = rundown.build.steps[0];
    expect(introduction?.title).toBe("Un skill, c'est quoi ?");
    expect(introduction?.points.join(' ')).toContain("mode d'emploi");
    expect(introduction?.points.join(' ')).toContain('frontend-design');
    expect(introduction?.points.join(' ')).toContain("page d'inscription");
    expect(z.array(sourceSchema).min(2).safeParse(rundown.build.sources).success).toBe(true);
    const projectedCopy = rundown.build.steps
      .map((step) => [step.title, ...step.points].join(' '))
      .join(' ');
    expect(projectedCopy).not.toMatch(/vote|révélation|anonymisées/i);
    expect(projectedCopy).toContain('Le test reste à faire');
  });

  it('propose trois controverses datées d’octobre, sourcées et contradictoires en dix minutes', () => {
    const debateSchema = z.object({
      title: z
        .string()
        .min(1)
        .refine((title) => title.endsWith('?') && !/skill/i.test(title)),
      theme: z.string().min(1),
      date: z.iso.date().refine((date) => date >= '2026-10-01' && date <= episode.preparedAt),
      minutes: z.number().int().positive(),
      context: z.string().min(1),
      positions: z
        .array(z.object({ title: z.string().min(1), argument: z.string().min(1) }))
        .length(2),
      followUp: z.string().min(1),
      relevance: z.string().min(1),
      caution: z.string().min(1),
      sources: z.array(sourceSchema).min(2),
    });
    const debates = z.array(debateSchema).length(3).parse(episode.debates);
    expect(new Set(debates.map((debate) => debate.theme)).size).toBe(3);
    expect(debates.reduce((total, debate) => total + debate.minutes, 0)).toBe(10);
    for (const debate of debates) {
      expect(new Set(debate.positions.map((position) => position.title)).size).toBe(2);
    }
    const currentDebates = buildEpisodeScenes(episode, rundown).filter(
      (scene) => scene.kind === 'debate',
    );
    expect(currentDebates.map((scene) => scene.title)).toEqual(
      debates.map((debate) => debate.title),
    );
    expect(currentDebates.reduce((total, scene) => total + (scene.durationMinutes ?? 0), 0)).toBe(
      10,
    );
    expect(rundown.sections.clash.notes.join(' ')).toContain('Aucun classement exhaustif');
  });
});
