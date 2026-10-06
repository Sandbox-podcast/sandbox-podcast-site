import type { Metrics } from '../../domain/scoring.ts';
import { interp, noise } from './util.ts';

/**
 * Séries GitHub de DÉMONSTRATION. Aucune de ces valeurs ne vient de l'API GitHub.
 * Une série est décrite par quelques paramètres : le dépôt gagne `base` stars par semaine, multiplié par une courbe
 * définie par points (`ramp`, indexée par semaine depuis la S26), avec un bruit déterministe de ±7 %.
 */
export interface RepoSeries {
  entity: string;
  /** Stars avant la première semaine. */
  stars0: number;
  /** Stars gagnées par semaine avant application de la courbe. */
  base: number;
  /** Points [semaine depuis S26, multiplicateur], interpolés linéairement. */
  ramp: [number, number][];
  forkRatio: number;
  contributors0: number;
  contributorsPerWeek: number;
  commitsBase: number;
}

export const REPO_SERIES: readonly RepoSeries[] = [
  {
    entity: 'claude-code',
    stars0: 36000,
    base: 3200,
    ramp: [
      [0, 0.9],
      [8, 1.1],
      [11, 1.5],
      [13, 1.8],
      [14, 2.1],
      [15, 4.4],
    ],
    forkRatio: 0.075,
    contributors0: 120,
    contributorsPerWeek: 3,
    commitsBase: 160,
  },
  {
    entity: 'codex',
    stars0: 28000,
    base: 2600,
    ramp: [
      [0, 1.2],
      [6, 1.1],
      [11, 0.9],
      [15, 0.8],
    ],
    forkRatio: 0.12,
    contributors0: 260,
    contributorsPerWeek: 4,
    commitsBase: 900,
  },
  {
    entity: 'gemini-cli',
    stars0: 52000,
    base: 2400,
    ramp: [
      [0, 1.4],
      [8, 0.8],
      [15, 0.5],
    ],
    forkRatio: 0.12,
    contributors0: 400,
    contributorsPerWeek: 3,
    commitsBase: 700,
  },
  {
    entity: 'n8n',
    stars0: 120000,
    base: 2300,
    ramp: [
      [0, 1],
      [15, 1.05],
    ],
    forkRatio: 0.15,
    contributors0: 500,
    contributorsPerWeek: 3,
    commitsBase: 450,
  },
  {
    entity: 'ollama',
    stars0: 140000,
    base: 2100,
    ramp: [
      [0, 1],
      [15, 1],
    ],
    forkRatio: 0.115,
    contributors0: 580,
    contributorsPerWeek: 3,
    commitsBase: 300,
  },
  {
    entity: 'llama-cpp',
    stars0: 85000,
    base: 2000,
    ramp: [
      [0, 1],
      [10, 1.1],
      [15, 1.15],
    ],
    forkRatio: 0.13,
    contributors0: 1100,
    contributorsPerWeek: 6,
    commitsBase: 600,
  },
  {
    entity: 'open-webui',
    stars0: 100000,
    base: 1800,
    ramp: [
      [0, 1],
      [15, 0.95],
    ],
    forkRatio: 0.13,
    contributors0: 400,
    contributorsPerWeek: 3,
    commitsBase: 350,
  },
  {
    entity: 'comfyui',
    stars0: 82000,
    base: 1700,
    ramp: [
      [0, 1],
      [15, 0.95],
    ],
    forkRatio: 0.095,
    contributors0: 270,
    contributorsPerWeek: 3,
    commitsBase: 450,
  },
  {
    entity: 'uv',
    stars0: 65000,
    base: 1900,
    ramp: [
      [0, 1],
      [15, 1.1],
    ],
    forkRatio: 0.045,
    contributors0: 350,
    contributorsPerWeek: 5,
    commitsBase: 700,
  },
  {
    entity: 'zed',
    stars0: 60000,
    base: 1500,
    ramp: [
      [0, 1],
      [9, 1.05],
      [12, 1.35],
      [15, 1.2],
    ],
    forkRatio: 0.06,
    contributors0: 800,
    contributorsPerWeek: 5,
    commitsBase: 900,
  },
  {
    entity: 'vllm',
    stars0: 55000,
    base: 1300,
    ramp: [
      [0, 1],
      [10, 1.1],
      [12, 1.9],
      [14, 2.3],
      [15, 1.9],
    ],
    forkRatio: 0.15,
    contributors0: 1400,
    contributorsPerWeek: 12,
    commitsBase: 1100,
  },
  {
    entity: 'dify',
    stars0: 105000,
    base: 1900,
    ramp: [
      [0, 1],
      [15, 0.9],
    ],
    forkRatio: 0.15,
    contributors0: 800,
    contributorsPerWeek: 4,
    commitsBase: 280,
  },
  {
    entity: 'browser-use',
    stars0: 55000,
    base: 2000,
    ramp: [
      [0, 1],
      [6, 1.4],
      [9, 3.2],
      [10, 3.8],
      [12, 1.6],
      [15, 1.1],
    ],
    forkRatio: 0.11,
    contributors0: 200,
    contributorsPerWeek: 4,
    commitsBase: 350,
  },
  {
    entity: 'firecrawl',
    stars0: 52000,
    base: 1500,
    ramp: [
      [0, 1],
      [15, 1.1],
    ],
    forkRatio: 0.08,
    contributors0: 120,
    contributorsPerWeek: 2,
    commitsBase: 400,
  },
  {
    entity: 'mastra',
    stars0: 14000,
    base: 700,
    ramp: [
      [0, 0.8],
      [9, 1.2],
      [11, 2.6],
      [15, 4.5],
    ],
    forkRatio: 0.08,
    contributors0: 150,
    contributorsPerWeek: 6,
    commitsBase: 700,
  },
  {
    entity: 'openhands',
    stars0: 55000,
    base: 1100,
    ramp: [
      [0, 1],
      [15, 1.2],
    ],
    forkRatio: 0.13,
    contributors0: 450,
    contributorsPerWeek: 6,
    commitsBase: 800,
  },
  {
    entity: 'anthropic-skills',
    stars0: 20000,
    base: 2800,
    ramp: [
      [0, 0.7],
      [8, 1.2],
      [12, 1.8],
      [15, 2.4],
    ],
    forkRatio: 0.12,
    contributors0: 40,
    contributorsPerWeek: 3,
    commitsBase: 120,
  },
  {
    entity: 'superpowers',
    stars0: 3000,
    base: 1800,
    ramp: [
      [0, 0.5],
      [6, 1.5],
      [11, 2.6],
      [14, 3.0],
      [15, 5.6],
    ],
    forkRatio: 0.09,
    contributors0: 15,
    contributorsPerWeek: 1,
    commitsBase: 80,
  },
  {
    entity: 'spec-kit',
    stars0: 28000,
    base: 2400,
    ramp: [
      [0, 1.3],
      [8, 0.9],
      [15, 0.8],
    ],
    forkRatio: 0.1,
    contributors0: 100,
    contributorsPerWeek: 2,
    commitsBase: 160,
  },
  {
    entity: 'mcp-servers',
    stars0: 40000,
    base: 1900,
    ramp: [
      [0, 1],
      [15, 0.9],
    ],
    forkRatio: 0.12,
    contributors0: 700,
    contributorsPerWeek: 5,
    commitsBase: 140,
  },
  {
    entity: 'context7',
    stars0: 22000,
    base: 2100,
    ramp: [
      [0, 1.1],
      [15, 0.9],
    ],
    forkRatio: 0.06,
    contributors0: 90,
    contributorsPerWeek: 3,
    commitsBase: 160,
  },
  {
    entity: 'playwright-mcp',
    stars0: 16000,
    base: 1100,
    ramp: [
      [0, 1],
      [15, 1.2],
    ],
    forkRatio: 0.075,
    contributors0: 50,
    contributorsPerWeek: 2,
    commitsBase: 120,
  },
  {
    entity: 'awesome-claude-code',
    stars0: 9000,
    base: 1500,
    ramp: [
      [0, 1],
      [10, 1.3],
      [15, 1.6],
    ],
    forkRatio: 0.06,
    contributors0: 90,
    contributorsPerWeek: 3,
    commitsBase: 100,
  },
  {
    entity: 'openai-agents-python',
    stars0: 14000,
    base: 900,
    ramp: [
      [0, 1],
      [15, 1],
    ],
    forkRatio: 0.15,
    contributors0: 90,
    contributorsPerWeek: 2,
    commitsBase: 120,
  },
  {
    entity: 'langgraph',
    stars0: 14000,
    base: 1000,
    ramp: [
      [0, 1],
      [15, 1],
    ],
    forkRatio: 0.13,
    contributors0: 200,
    contributorsPerWeek: 3,
    commitsBase: 300,
  },
  {
    entity: 'crewai',
    stars0: 33000,
    base: 1000,
    ramp: [
      [0, 1],
      [15, 0.8],
    ],
    forkRatio: 0.13,
    contributors0: 250,
    contributorsPerWeek: 3,
    commitsBase: 180,
  },
  {
    entity: 'goose',
    stars0: 17000,
    base: 1100,
    ramp: [
      [0, 1],
      [15, 1],
    ],
    forkRatio: 0.08,
    contributors0: 150,
    contributorsPerWeek: 4,
    commitsBase: 350,
  },
  {
    entity: 'cline',
    stars0: 38000,
    base: 1200,
    ramp: [
      [0, 1],
      [15, 0.9],
    ],
    forkRatio: 0.13,
    contributors0: 250,
    contributorsPerWeek: 4,
    commitsBase: 400,
  },
  {
    entity: 'adk-python',
    stars0: 12000,
    base: 1000,
    ramp: [
      [0, 1],
      [13, 1.1],
      [14, 2.2],
      [15, 5.5],
    ],
    forkRatio: 0.14,
    contributors0: 120,
    contributorsPerWeek: 2,
    commitsBase: 250,
  },
  {
    entity: 'aider',
    stars0: 36000,
    base: 900,
    ramp: [
      [0, 1],
      [15, 0.7],
    ],
    forkRatio: 0.12,
    contributors0: 400,
    contributorsPerWeek: 3,
    commitsBase: 150,
  },
];

/** Candidats de chaque classement GitHub : un dépôt peut figurer dans plusieurs pools. */
export const GITHUB_POOLS: Readonly<Record<string, readonly string[]>> = {
  github: [
    'claude-code',
    'codex',
    'gemini-cli',
    'n8n',
    'ollama',
    'llama-cpp',
    'open-webui',
    'comfyui',
    'uv',
    'zed',
    'vllm',
    'dify',
    'browser-use',
    'firecrawl',
    'mastra',
    'openhands',
  ],
  skills: [
    'anthropic-skills',
    'superpowers',
    'spec-kit',
    'mcp-servers',
    'context7',
    'playwright-mcp',
    'awesome-claude-code',
    'openai-agents-python',
    'langgraph',
    'crewai',
    'goose',
    'cline',
    'aider',
    'adk-python',
    'openhands',
    'browser-use',
  ],
};

export function repoMetricsAt(series: RepoSeries, weekIndex: number): Metrics {
  let stars = series.stars0;
  let gain = 0;
  for (let i = 0; i <= weekIndex; i++) {
    gain = Math.round(series.base * interp(series.ramp, i) * noise(series.entity, i, 0.07));
    stars += gain;
  }
  const commitNoise = noise(series.entity, weekIndex + 100, 0.12);
  return {
    stars,
    stars7d: gain,
    forks: Math.round(stars * series.forkRatio),
    contributors: series.contributors0 + Math.round(series.contributorsPerWeek * weekIndex),
    commits30d: Math.round(series.commitsBase * commitNoise),
  };
}
