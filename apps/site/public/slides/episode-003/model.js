export const decisions = ['pending', 'keep', 'reserve', 'drop'];

export function isSelectable(scene) {
  return ['news', 'skill', 'short'].includes(scene.kind);
}

export function buildShortScenes(shorts) {
  return [
    { ...shorts.angle, id: 'angle', kind: 'angle', chapter: 'Shorts' },
    { ...shorts.pattern, id: 'pattern', kind: 'pattern', chapter: 'Shorts' },
    {
      id: 'evidence',
      kind: 'evidence',
      chapter: 'Shorts',
      title: 'Un même compte. Des écarts énormes.',
    },
    ...shorts.pitches.map((pitch) => ({
      ...pitch,
      id: `short-${pitch.id}`,
      kind: 'short',
      chapter: 'Shorts',
    })),
    { ...shorts.measurement, id: 'measurement', kind: 'measurement', chapter: 'Shorts' },
  ];
}

export function buildEpisodeScenes(episode, rundown) {
  const originalScenes = buildScenes(episode);
  return originalScenes.flatMap((scene) => {
    if (scene.kind === 'section') {
      const segment = rundown.segments.find((item) => item.id === scene.id);
      const section = {
        ...scene,
        ...rundown.sections[scene.id],
        durationMinutes: segment.minutes,
      };
      return scene.id === 'build'
        ? [
            section,
            ...rundown.build.steps.map((step) => ({
              ...step,
              kind: 'build-step',
              chapter: 'Build',
              topicId: rundown.build.skillId,
              durationMinutes: step.minutes,
            })),
          ]
        : [section];
    }
    return ['news', 'debate'].includes(scene.kind) ? [scene] : [];
  });
}

export function buildScenes(episode) {
  return [
    {
      id: 'radar',
      kind: 'section',
      chapter: 'Radar',
      title: 'Le Radar',
      subtitle: '16 au 18 octobre 2026',
      image: 'radar',
    },
    ...episode.news.map((item) => ({ ...item, kind: 'news', chapter: 'Radar' })),
    {
      id: 'build',
      kind: 'section',
      chapter: 'Build',
      title: 'Le Build',
      subtitle: 'Les skills qui donnent envie de les essayer',
      image: 'build',
    },
    {
      id: 'leaderboard',
      kind: 'leaderboard',
      chapter: 'Build',
      title: 'Les skills les plus installés',
    },
    ...episode.skills.map((item) => ({
      ...item,
      id: `skill-${item.id}`,
      kind: 'skill',
      chapter: 'Build',
    })),
    {
      id: 'social',
      kind: 'social',
      chapter: 'Build',
      title: "Ce qu'on voit passer dans les shorts",
    },
    {
      id: 'clash',
      kind: 'section',
      chapter: 'Clash',
      title: 'Le Clash',
      subtitle: "Les controverses IA d'octobre 2026",
      image: 'clash',
    },
    ...episode.debates.map((debate, index) => ({
      ...debate,
      id: `clash-${index + 1}`,
      kind: 'debate',
      chapter: 'Clash',
      durationMinutes: debate.minutes,
    })),
    {
      id: 'beta',
      kind: 'section',
      chapter: 'Bêta',
      title: 'La Bêta',
      subtitle: episode.audience,
      image: 'beta',
    },
  ];
}

export function sceneIndex(hash, scenes) {
  const anchor = hash.replace(/^#/, '');
  const byId = scenes.findIndex((scene) => scene.id === anchor);
  if (byId >= 0) return byId;
  const aliases = {
    'short-canvas': 'cursor-canvas',
    'short-minecraft': 'minecraft',
    'short-deepseek': 'deepseek',
    'short-design': 'build-brief',
    'short-grill': 'clash',
    'skill-frontend-design': 'build-brief',
  };
  const target =
    aliases[anchor] ||
    (['angle', 'pattern', 'evidence', 'leaderboard', 'social'].includes(anchor) ||
    /^(short-|skill-)/.test(anchor)
      ? 'build'
      : anchor === 'measurement'
        ? 'beta'
        : null);
  const byAlias = scenes.findIndex((scene) => scene.id === target);
  if (byAlias >= 0) return byAlias;
  const numeric = Number(anchor) - 1;
  return Number.isInteger(numeric) && numeric >= 0 && numeric < scenes.length ? numeric : 0;
}

export function restoreChoices(value, scenes) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    scenes
      .filter(isSelectable)
      .filter((scene) => Object.hasOwn(value, scene.id) && decisions.includes(value[scene.id]))
      .map((scene) => [scene.id, value[scene.id]]),
  );
}
