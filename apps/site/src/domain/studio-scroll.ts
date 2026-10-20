const clamp = (value: number) => Math.min(1, Math.max(0, value));
const segment = (value: number, from: number, to: number) => {
  const p = clamp((value - from) / (to - from));
  return p * p * (3 - 2 * p);
};

/** Une progression rejouable : allumage, pause, avancée et retournement vers les replays. */
export function studioScrollState(progress: number) {
  const p = Number.isFinite(progress) ? clamp(progress) : 0;
  return {
    light: segment(p, 0.02, 0.28),
    charts: segment(p, 0.08, 0.18),
    news: segment(p, 0.15, 0.25),
    projects: segment(p, 0.22, 0.32),
    history: segment(p, 0.29, 0.39),
    copy: 1 - segment(p, 0.38, 0.5),
    approach: segment(p, 0.45, 0.63),
    turn: segment(p, 0.56, 0.82),
    wall: segment(p, 0.66, 0.84),
    phase: p < 0.28 ? 'lights' : p < 0.56 ? 'explore' : p < 0.84 ? 'turn' : 'replays',
  };
}
