import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import process from 'node:process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { timeMachineDataSchema } from '../src/domain/time-machine.ts';
import { historyArtworkSubject } from '../src/domain/time-machine-artwork.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = timeMachineDataSchema.parse(
  JSON.parse(await readFile(resolve(root, 'content/ai-history.json'), 'utf8')),
);
const brandSources = JSON.parse(
  await readFile(resolve(root, 'scripts/time-machine-artwork/brand-sources.json'), 'utf8'),
);
const destination = resolve(root, 'public/images/time-machine/events');
const checkOnly = process.argv.includes('--check');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const escape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
const f = (value) => Number(value.toFixed(2));
const palettes = {
  openai: '#63dfd6',
  claude: '#df9975',
  google: '#7dacf8',
  meta: '#67a3ff',
  mistral: '#ffab54',
  nvidia: '#76b900',
  qwen: '#a994ff',
  deepseek: '#83a5ff',
  xai: '#f0f0e7',
  pytorch: '#ff885b',
  artificial: '#75d7e5',
  science: '#82d9e7',
};
const logos = new Map();
for (const [brand, source] of Object.entries(brandSources)) {
  const svg = await readFile(resolve(root, 'public', source.path.slice(1)), 'utf8');
  if (hash(svg) !== source.sha256) throw new Error('Logo modifié : ' + brand);
  if (
    /<(?:script|foreignObject|image|style)\b|\bon\w+\s*=|href\s*=|url\(|<!DOCTYPE|<!ENTITY/i.test(
      svg,
    )
  )
    throw new Error('Logo actif ou externe : ' + brand);
  logos.set(brand, {
    viewBox: source.viewBox,
    content: svg.replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, ''),
  });
}
function brandOf(event) {
  if (/^claude|model-context-protocol/.test(event.id)) return 'claude';
  if (/openai/i.test(event.organization)) return 'openai';
  if (/mistral/i.test(event.organization)) return 'mistral';
  if (/meta|facebook/i.test(event.organization)) return 'meta';
  if (/google|deepmind/i.test(event.organization)) return 'google';
  if (/deepseek/i.test(event.organization)) return 'deepseek';
  if (/qwen/i.test(event.organization)) return 'qwen';
  if (/xai/i.test(event.organization)) return 'xai';
  if (/nvidia/i.test(event.organization)) return 'nvidia';
  if (/pytorch/i.test(event.organization)) return 'pytorch';
  if (/Artificial Analysis/.test(event.organization)) return 'artificial';
  return null;
}
const specificModes = {
  'gemini-1': 'gemini-first-prism',
  'gemini-1-5': 'gemini-layered-prisms',
  'gemini-2': 'gemini-twin-core',
  'gemini-2-5': 'gemini-thinking-rings',
  'gemini-3': 'gemini-triple-core',
  'gemini-3-1-pro': 'gemini-portals',
  'gemini-3-8-flash': 'gemini-flash',
  'gemini-4-argon': 'argon-orbits',
  'mistral-3': 'mistral-three-ribbons',
  'mistral-large-4': 'mistral-four-pillars',
  'mixtral-8x7b': 'mixtral-eight-experts',
  'gpt-1': 'gpt-first-layer',
  'gpt-2': 'gpt-token-plane',
  'gpt-3-paper': 'gpt-three-contexts',
  'gpt-4': 'gpt-four-channels',
  'gpt-5': 'gpt-five-core',
  'gpt-5-4': 'gpt-reasoning-portals',
  'gpt-5-5': 'gpt-five-interlace',
  'claude-3': 'claude-three-pages',
  'claude-4': 'claude-four-panels',
  'claude-opus-5-5': 'claude-opus-score',
  'claude-haiku-5-5': 'claude-haiku-stanzas',
  'claude-fable-mythos-5': 'claude-fable-book',
  'deep-blue-first-game': 'chess-search',
  'deep-blue-match': 'chess-crown',
  alphazero: 'three-games',
  'alphago-lee-sedol': 'go-board',
  lstm: 'memory-cell',
  'deep-belief-nets': 'layered-net',
  word2vec: 'word-vectors',
  vae: 'bottleneck',
  'sequence-to-sequence': 'sequence',
  resnet: 'skip-net',
  transformer: 'attention',
  bert: 'masked-tokens',
  t5: 'text-transform',
  'nobel-physics-ai': 'physics-medal',
  'lenet-5': 'digit-convolution',
  imagenet: 'image-library',
  alexnet: 'vision-stack',
  deepface: 'face-landmarks',
  clip: 'image-text',
  'cuda-1': 'gpu-grid',
  tensorflow: 'tensor-flow',
  'pytorch-first-release': 'dynamic-graph',
  chinchilla: 'scaling-curve',
  palm: 'parameter-grid',
  'watson-jeopardy': 'question-board',
  'siri-iphone': 'voice-phone',
  wavenet: 'sound-wave',
  whisper: 'transcription',
  'gpt-4o': 'multimodal-orbits',
  'grok-voice-3': 'voice-orbits',
  halicin: 'molecule',
  'alphafold-2': 'protein-fold',
  'alphafold-database-200m': 'protein-library',
  rfdiffusion: 'protein-diffusion',
  alphamissense: 'dna-mutation',
  'alphafold-3': 'protein-complex',
  alphaproteo: 'protein-binder',
  'nobel-chemistry-alphafold': 'chemistry-medal',
  'ai-co-scientist': 'lab-flask',
  'rentosertib-phase-2a': 'clinical-pill',
  alphagenome: 'genome-map',
  'claude-art-enzyme': 'enzyme-scissors',
  alphatensor: 'matrix-cube',
  alphadev: 'sorting-network',
  funsearch: 'search-tree',
  alphageometry: 'geometry-proof',
  'alphaproof-imo': 'proof-tree',
  alphaevolve: 'evolution-tree',
  'gemini-imo-gold': 'gold-medal',
  aletheia: 'theorem-surface',
  'erdos-unit-distance': 'unit-distance',
  'jacobian-counterexample': 'jacobian-map',
  'openai-ten-math-advances': 'ten-theorems',
  'navier-stokes-proposed-proof': 'fluid-field',
  'openai-math-repository': 'theorem-library',
  'deep-review': 'document-review',
  graphcast: 'weather-globe',
  'earth-ai-agents': 'earth-map',
  'hiro-ace-v2': 'climate-stream',
  'plasma-control': 'tokamak',
  gnome: 'crystal-lattice',
  'dqn-atari': 'arcade-screen',
  'darpa-grand-challenge-2005': 'autonomous-route',
  'rt-2': 'robot-gripper',
  'gemini-robotics': 'robot-arm',
  'aa-robotics': 'robot-benchmark',
  'ai-act-effective': 'law-scales',
  'openai-announcement': 'research-lab',
  'anthropic-cyber-mission': 'security-shield',
  'gpt-6-astra': 'astra-constellation',
  'gpt-6-sol-luna': 'sun-moon',
  'gpt-6-1-sol': 'solar-orbits',
  'gpt-5-6-sol': 'solar-network',
  chatgpt: 'conversation',
  'gpt-3-api': 'api-route',
  'github-copilot': 'code-assistant',
  'codex-cloud-agent': 'cloud-code',
  'openai-dots': 'dots-orchestra',
  'grok-team-bots': 'team-network',
  'grok-bot': 'agent-memory',
  'chatgpt-space': 'collaboration-pages',
  'decisions-api': 'decision-tree',
  'agents-api-computer-use': 'computer-agent',
  'gpt-6-intelligent-ui': 'interface-panels',
  'x-subscription': 'subscription-orbit',
  'model-context-protocol': 'protocol-plugs',
};
function modeOf(event, subject, brand) {
  if (specificModes[event.id]) return specificModes[event.id];
  if (subject === 'model') return (brand ?? 'language') + '-model';
  return subject + '-' + event.id;
}
function concept(event, subject, brand) {
  const mode = modeOf(event, subject, brand);
  const seed = parseInt(hash(event.id).slice(0, 8), 16);
  const random = (() => {
    let x = seed;
    return () => {
      x = (1664525 * x + 1013904223) >>> 0;
      return x / 4294967296;
    };
  })();
  const variation = (seed % 100003) / 100003;
  const c = palettes[brand ?? 'science'];
  const a = '#e6b477';
  const light = '#e6eff1';
  const out = [];
  const line = (x1, y1, x2, y2, color = c, width = 2, opacity = 1) =>
    out.push(
      `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`,
    );
  const circle = (x, y, r, color = c, fill = 'none', width = 2, opacity = 1) =>
    out.push(
      `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" stroke="${color}" fill="${fill}" stroke-width="${width}" opacity="${opacity}"/>`,
    );
  const rect = (x, y, w, h, color = c, fill = 'none', radius = 0, width = 2, opacity = 1) =>
    out.push(
      `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${radius}" stroke="${color}" fill="${fill}" stroke-width="${width}" opacity="${opacity}"/>`,
    );
  const path = (d, color = c, width = 2, fill = 'none', opacity = 1) =>
    out.push(
      `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="${fill}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  const text = (value, x, y, size = 20, color = light) =>
    out.push(
      `<text x="${f(x)}" y="${f(y)}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" text-anchor="middle">${escape(value)}</text>`,
    );
  const polygon = (points, color = c, fill = 'none', opacity = 1) =>
    out.push(
      `<polygon points="${points.map((p) => p.map(f).join(',')).join(' ')}" stroke="${color}" stroke-width="2" fill="${fill}" opacity="${opacity}"/>`,
    );
  const polar = (angle, r, cx = 500, cy = 480) => [
    cx + Math.cos(angle) * r,
    cy + Math.sin(angle) * r,
  ];
  const n = 5 + (seed % 8);
  const network = (layers = 4, width = 440, count = 4) => {
    const nodes = Array.from({ length: layers }, (_, i) =>
      Array.from({ length: count + ((i + seed) % 3) }, (_, j) => [
        500 - width / 2 + (i * width) / (layers - 1),
        360 + (j * 240) / (count + 1),
      ]),
    );
    nodes.forEach((layer, i) =>
      layer.forEach((p, j) => {
        if (i < nodes.length - 1)
          nodes[i + 1].forEach((q, k) => {
            if ((j + k + seed) % 3 !== 0) line(...p, ...q, c, 1, 0.3);
          });
        circle(...p, 7, c, '#0c1820', 2);
      }),
    );
  };
  const helix = (turns = 3, mutation = false) => {
    for (let i = 0; i < 52; i++) {
      const y = 305 + i * 7;
      const theta = (i / 51) * Math.PI * turns * 2;
      const x = 500 + Math.sin(theta) * 115;
      const xx = 500 - Math.sin(theta) * 115;
      if (i % 3 === 0) line(x, y, xx, y, mutation && i > 23 && i < 29 ? a : c, 2, 0.7);
      circle(x, y, 3, c, c, 0);
      circle(xx, y, 3, a, a, 0);
    }
  };
  const orbit = (arms = n, r = 180) => {
    circle(500, 480, r, c, 'none', 1, 0.35);
    circle(500, 480, r * 0.65, a, 'none', 1, 0.55);
    for (let i = 0; i < arms; i++) {
      const angle = (i / arms) * Math.PI * 2 + random() * 0.4;
      const p = polar(angle, r);
      const q = polar(angle + 0.6, r * 0.65);
      line(500, 480, ...p, c, 1, 0.5);
      line(...p, ...q, a, 2, 0.75);
      circle(...p, 8 + (i % 3), c, '#152531', 2);
      circle(...q, 4, a, a, 0);
    }
    circle(500, 480, 35, c, '#0c1a25', 3);
  };
  const wave = (rows = 5, amplitude = 65) => {
    for (let r = 0; r < rows; r++) {
      let d = '';
      for (let i = 0; i <= 80; i++) {
        const x = 260 + i * 6;
        const y =
          370 +
          r * 32 +
          Math.sin(i / (6 + variation * 2) + r * 0.47 + variation * 6) *
            amplitude *
            Math.sin((i / 80) * Math.PI);
        d += (i ? ' L' : 'M') + f(x) + ',' + f(y);
      }
      path(d, r % 2 ? c : a, r === 2 ? 3 : 1.4, 'none', 0.35 + (r / rows) * 0.6);
    }
  };
  const matrix = (cols = 6, rows = 5) => {
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const h = 10 + random() * 30;
        rect(
          500 - cols * 30 + x * 60,
          330 + y * 58,
          44,
          44,
          (x + y) % 3 ? a : c,
          (x + y + seed) % 4 === 0 ? c : '#0a1720',
          6,
          1.3,
          0.8,
        );
        if ((x + y + seed) % 4 !== 0)
          line(
            500 - cols * 30 + x * 60 + 9,
            330 + y * 58 + h,
            500 - cols * 30 + x * 60 + 33,
            330 + y * 58 + h,
            c,
            2,
            0.7,
          );
      }
  };
  const tree = (depth = 4, top = 320, width = 440) => {
    const levels = Array.from({ length: depth }, (_, i) =>
      Array.from({ length: 2 ** i }, (_, j) => [
        500 -
          width / 2 +
          ((j + 0.5) * width) / 2 ** i +
          Math.sin((j + 1) * (i + 1) + variation * 7) * 12,
        top + i * 95,
      ]),
    );
    levels.forEach((l, i) =>
      l.forEach((p, j) => {
        if (i) line(...levels[i - 1][Math.floor(j / 2)], ...p, i % 2 ? a : c, 2, 0.7);
        circle(...p, 9, i % 2 ? a : c, '#10212c', 2);
      }),
    );
  };
  const trophy = (kind) => {
    circle(500, 460, 130, a, '#18232a', 3);
    circle(500, 460, 110, a, 'none', 1, 0.6);
    for (let i = 0; i < 24; i++) {
      const p = polar((i / 24) * Math.PI * 2, 119, 500, 460);
      const q = polar((i / 24) * Math.PI * 2, 127, 500, 460);
      line(...p, ...q, a, 2);
    }
    path('M410 585 L390 700 L500 650 L610 700 L590 585', c, 3, '#0f2633');
    if (kind === 'physics') network(3, 150, 2);
    else if (kind === 'chemistry') helix(1);
    else
      polygon(
        [
          [500, 375],
          [525, 435],
          [590, 440],
          [540, 480],
          [555, 545],
          [500, 510],
          [445, 545],
          [460, 480],
          [410, 440],
          [475, 435],
        ],
        a,
        '#433c2d',
      );
  };
  if (mode.startsWith('gemini-')) {
    if (mode === 'gemini-flash') {
      polygon(
        [
          [540, 270],
          [370, 490],
          [490, 490],
          [430, 710],
          [650, 430],
          [520, 430],
        ],
        c,
        '#244a81',
      );
      for (let i = 0; i < 5; i++)
        path(`M${320 + i * 20} 350 L${300 + i * 20} 600`, a, 3, 'none', 0.5);
    } else if (mode === 'gemini-thinking-rings' || mode === 'gemini-portals') {
      for (let i = 0; i < (mode === 'gemini-portals' ? 3 : 5); i++) {
        const x = mode === 'gemini-portals' ? 350 + i * 150 : 500;
        out.push(
          `<ellipse cx="${x}" cy="480" rx="${mode === 'gemini-portals' ? 75 : 190 - i * 25}" ry="${mode === 'gemini-portals' ? 180 : 60 + i * 22}" transform="rotate(${mode === 'gemini-portals' ? 0 : i * 31} ${x} 480)" stroke="${i % 2 ? c : a}" stroke-width="4" fill="none"/>`,
        );
      }
    } else {
      const cores =
        mode === 'gemini-twin-core'
          ? 2
          : mode === 'gemini-triple-core'
            ? 3
            : mode === 'gemini-layered-prisms'
              ? 4
              : 1;
      for (let i = 0; i < cores; i++) {
        const x = 500 + (i - (cores - 1) / 2) * 100,
          r = cores === 1 ? 200 : 125;
        polygon(
          [
            [x, 480 - r],
            [x + r * 0.7, 480],
            [x, 480 + r],
            [x - r * 0.7, 480],
          ],
          c,
          i % 2 ? '#163461' : '#203c56',
        );
        line(x, 480 - r, x, 480 + r, a, 2);
        line(x - r * 0.7, 480, x + r * 0.7, 480, c, 2);
      }
    }
  } else if (mode === 'argon-orbits') {
    for (let i = 0; i < 4; i++)
      out.push(
        `<ellipse cx="500" cy="480" rx="210" ry="75" transform="rotate(${i * 45} 500 480)" stroke="${i % 2 ? c : a}" stroke-width="3" fill="none"/>`,
      );
    circle(500, 480, 55, c, '#245398', 4);
    for (let i = 0; i < 18; i++) {
      const p = polar((i / 18) * Math.PI * 2, 200);
      circle(...p, 7, a, a, 0);
    }
  } else if (mode.startsWith('gpt-')) {
    const count =
      mode === 'gpt-first-layer'
        ? 1
        : mode === 'gpt-token-plane'
          ? 2
          : mode === 'gpt-three-contexts'
            ? 3
            : mode === 'gpt-four-channels'
              ? 4
              : 5;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + variation * 0.3;
      const p = polar(angle, 130);
      if (mode === 'gpt-token-plane') {
        rect(315, 340 + i * 170, 370, 120, c, '#123435', 16, 3);
        for (let j = 0; j < 7; j++)
          rect(340 + j * 47, 370 + i * 170, 28, 60, c, j % 2 ? '#27666b' : '#174248', 4, 1);
      } else {
        out.push(
          `<rect x="${f(p[0] - 80)}" y="${f(p[1] - 95)}" width="160" height="190" rx="18" transform="rotate(${f(i * 18 + variation * 20)} ${f(p[0])} ${f(p[1])})" stroke="${i % 2 ? c : a}" stroke-width="4" fill="#153438" fill-opacity=".82"/>`,
        );
        line(500, 480, ...p, c, 3, 0.6);
      }
    }
    circle(500, 480, 40, c, '#183d40', 3);
  } else if (mode.startsWith('claude-') && mode !== 'claude-model') {
    if (mode === 'claude-opus-score') {
      for (let i = 0; i < 5; i++) line(290, 390 + i * 35, 710, 390 + i * 35, c, 2);
      for (let i = 0; i < 7; i++) {
        const x = 330 + i * 55,
          y = 400 + ((i + seed) % 5) * 35;
        circle(x, y, 12, a, a, 0);
        line(x + 10, y, x + 10, y - 75, a, 3);
      }
    } else {
      const count =
        mode === 'claude-three-pages' || mode === 'claude-haiku-stanzas'
          ? 3
          : mode === 'claude-four-panels'
            ? 4
            : 2;
      for (let i = 0; i < count; i++) {
        const x = 300 + i * 110,
          y = 330 + (i % 2) * 55;
        rect(x, y, 170, 260, c, '#3c2925', 12, 3);
        for (let j = 0; j < (mode === 'claude-haiku-stanzas' ? 3 : 5); j++)
          line(x + 25, y + 50 + j * 32, x + 135 - (j % 2) * 25, y + 50 + j * 32, a, 4, 0.8);
      }
    }
  } else if (
    (mode.startsWith('mistral-') && mode !== 'mistral-model') ||
    mode === 'mixtral-eight-experts'
  ) {
    const count = mode === 'mistral-four-pillars' ? 4 : mode === 'mixtral-eight-experts' ? 8 : 3;
    for (let i = 0; i < count; i++) {
      const x = 290 + (i * 420) / (count - 1);
      path(
        `M${f(x - 35)} 330 Q${f(x + 80)} 430 ${f(x - 10)} 520 Q${f(x - 90)} 600 ${f(x + 25)} 680`,
        i % 2 ? c : a,
        mode === 'mistral-four-pillars' ? 30 : mode === 'mixtral-eight-experts' ? 12 : 22,
        'none',
        0.8,
      );
    }
  } else if (mode === 'fluid-field') {
    for (let row = 0; row < 11; row++)
      for (let col = 0; col < 12; col++) {
        const x = 290 + col * 38,
          y = 300 + row * 36;
        const angle = Math.atan2(y - 480, x - 500) + Math.PI / 2 + Math.sin(row * 0.4) * 0.5;
        const dx = Math.cos(angle) * 22,
          dy = Math.sin(angle) * 22;
        line(x, y, x + dx, y + dy, row % 2 ? c : a, 2.5, 0.8);
        line(
          x + dx,
          y + dy,
          x + dx - Math.cos(angle - 0.6) * 7,
          y + dy - Math.sin(angle - 0.6) * 7,
          c,
          2,
          0.8,
        );
      }
  } else if (/chess|three-games/.test(mode)) {
    const offset = mode === 'chess-search' ? 0 : mode === 'chess-crown' ? 1 : 2;
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 6; col++)
        polygon(
          [
            [300 + col * 60 + row * 13, 400 + row * 33],
            [360 + col * 60 + row * 13, 400 + row * 33],
            [373 + col * 60 + row * 13, 433 + row * 33],
            [313 + col * 60 + row * 13, 433 + row * 33],
          ],
          '#385663',
          (row + col) % 2 ? '#172c3b' : '#263d45',
          0.85,
        );
    const x = 440 + offset * 55;
    path(
      `M${x - 55} 540 L${x + 55} 540 L${x + 44} 515 L${x + 30} 505 L${x + 27} 450 L${x + 44} 420 L${x + 25} 385 L${x - 5} 370 L${x - 35} 400 L${x - 20} 420 L${x - 35} 450 L${x - 30} 505 L${x - 44} 515 Z`,
      a,
      3,
      '#a57b43',
    );
    circle(x, 380, 7, a, a, 0);
    if (mode === 'chess-search') tree(3, 290, 250);
    if (mode === 'three-games') {
      circle(675, 370, 38, c, '#0d1b26', 2);
      rect(300, 300, 70, 70, c, 'none', 4);
    }
  } else if (mode === 'go-board') {
    for (let i = 0; i < 9; i++) {
      line(310 + i * 47, 300, 310 + i * 47, 676, a, 1, 0.6);
      line(310, 300 + i * 47, 686, 300 + i * 47, a, 1, 0.6);
    }
    for (let i = 0; i < 24; i++) {
      const x = 310 + ((seed + i * 37) % 9) * 47;
      const y = 300 + ((i * 23) % 9) * 47;
      circle(x, y, 16, i % 2 ? light : '#162833', i % 2 ? light : '#162833', 2);
    }
  } else if (/medal/.test(mode)) trophy(mode.split('-')[0]);
  else if (/protein|molecule|lab-flask|clinical-pill|enzyme/.test(mode)) {
    if (mode === 'clinical-pill') {
      rect(385, 330, 230, 360, light, '#16242b', 110, 3);
      path('M390 510 H610', a, 4);
      for (let i = 0; i < 10; i++) circle(420 + random() * 160, 550 + random() * 95, 5, a, a, 0);
    } else if (mode === 'lab-flask') {
      path(
        'M460 315 V420 L350 650 Q340 685 380 690 H620 Q660 685 650 650 L540 420 V315 M440 315 H560 M400 550 H600',
        c,
        4,
        '#10232b',
      );
      for (let i = 0; i < 9; i++)
        circle(420 + random() * 160, 565 + random() * 90, 5 + (i % 3), a, 'none', 2);
    } else if (mode === 'enzyme-scissors') {
      helix(2);
      line(330, 430, 650, 610, a, 7);
      line(330, 610, 650, 430, a, 7);
      circle(325, 430, 36, a, '#0f2530', 5);
      circle(325, 610, 36, a, '#0f2530', 5);
    } else if (mode === 'molecule') {
      const pts = Array.from({ length: 6 }, (_, i) => polar((i / 6) * Math.PI * 2, 130));
      polygon(pts, c, '#0e212b');
      pts.forEach((p, i) => {
        circle(...p, 14, i % 2 ? a : c, '#11252f', 3);
        const q = polar((i / 6) * Math.PI * 2, 210);
        line(...p, ...q, c, 3);
        circle(...q, 8, a, a, 0);
      });
    } else if (mode === 'protein-library') {
      for (let i = 0; i < 9; i++) {
        const x = 340 + (i % 3) * 150,
          y = 340 + Math.floor(i / 3) * 130;
        path(
          `M${x - 45} ${y} C${x - 20} ${y - 65} ${x + 35} ${y + 75} ${x + 45} ${y}`,
          i % 2 ? a : c,
          8,
          'none',
          0.9,
        );
      }
    } else {
      const loops =
        mode === 'protein-complex'
          ? 3
          : mode === 'protein-binder'
            ? 2
            : mode === 'protein-diffusion'
              ? 7
              : 1;
      for (let l = 0; l < loops; l++) {
        let d = '';
        for (let i = 0; i < 95; i++) {
          const theta = (i / 94) * Math.PI * (5 + (seed % 4));
          const radius = 105 + Math.cos(theta * 2.4 + l) * 50;
          const x =
            500 +
            Math.sin(theta) * radius +
            (loops > 1 ? Math.cos((l / loops) * Math.PI * 2) * 60 : 0);
          const y =
            480 +
            Math.cos(theta * 0.6) * 145 +
            (loops > 1 ? Math.sin((l / loops) * Math.PI * 2) * 60 : 0);
          d += (i ? ' L' : 'M') + f(x) + ',' + f(y);
        }
        path(d, l % 2 ? a : c, mode === 'protein-fold' ? 10 : 5, 'none', 0.7);
      }
    }
  } else if (/dna|genome/.test(mode)) {
    helix(mode === 'genome-map' ? 4 : 3, mode === 'dna-mutation');
    if (mode === 'genome-map')
      for (let i = 0; i < 15; i++) rect(280, 305 + i * 24, 30 + random() * 60, 10, c, c, 2, 0, 0.7);
  } else if (/tokamak/.test(mode)) {
    for (let i = 0; i < 10; i++) {
      const y = 360 + i * 20;
      path(
        `M300 ${y} C300 ${y - 120} 700 ${y - 120} 700 ${y} C700 ${y + 120} 300 ${y + 120} 300 ${y}`,
        i % 2 ? c : a,
        2,
        'none',
        0.4 + i * 0.05,
      );
    }
    circle(500, 470, 90, c, '#0d2230', 3);
    circle(500, 470, 65, a, 'none', 5);
  } else if (/crystal/.test(mode) || (brand === 'google' && subject === 'model')) {
    const pts = Array.from({ length: n }, (_, i) =>
      polar((i / n) * Math.PI * 2 + variation * 0.4, 175 + random() * 25),
    );
    const top = [500, 290],
      bottom = [500, 670];
    pts.forEach((p, i) => {
      polygon([top, p, pts[(i + 1) % n]], i % 2 ? c : a, i % 2 ? '#102637' : '#1a2832', 0.8);
      line(...p, ...bottom, c, 1.5, 0.6);
    });
  } else if (/fluid|climate|weather|earth/.test(mode)) {
    if (mode === 'weather-globe' || mode === 'earth-map') {
      circle(500, 480, 180, c, '#0b2130', 2);
      for (let i = -3; i <= 3; i++) {
        const y = 480 + i * 42;
        const x = Math.sqrt(180 ** 2 - (i * 42) ** 2);
        line(500 - x, y, 500 + x, y, c, 1, 0.4);
      }
      for (let i = 0; i < 5; i++) {
        const rx = 35 + i * 30;
        out.push(
          `<ellipse cx="500" cy="480" rx="${rx}" ry="180" stroke="${c}" fill="none" opacity=".4"/>`,
        );
      }
      if (mode === 'earth-map')
        for (let i = 0; i < 12; i++) circle(390 + random() * 220, 350 + random() * 240, 5, a, a, 0);
    } else wave(mode === 'fluid-field' ? 12 : 8, mode === 'fluid-field' ? 95 : 60);
  } else if (/matrix|tensor|parameter|gpu/.test(mode)) {
    matrix(5 + (seed % 3), 5);
    if (mode === 'matrix-cube') {
      polygon(
        [
          [300, 320],
          [500, 250],
          [700, 320],
          [500, 390],
        ],
        a,
        '#192d35',
      );
      line(500, 390, 500, 670, a, 3);
    }
    if (mode === 'gpu-grid') {
      rect(320, 320, 360, 300, c, 'none', 12, 4);
      for (let i = 0; i < 12; i++) {
        line(330 + i * 30, 290, 330 + i * 30, 320, c, 4);
        line(330 + i * 30, 620, 330 + i * 30, 650, c, 4);
      }
    }
  } else if (/geometry|unit-distance|jacobian|theorem-surface/.test(mode)) {
    if (mode === 'geometry-proof') {
      const pts = [
        [330, 610],
        [525, 305],
        [710, 610],
      ];
      polygon(pts, c, '#10212b');
      circle(520, 492, 125, a, 'none', 2);
      line(525, 305, 520, 610, c, 2);
      line(330, 610, 650, 500, a, 2);
    } else if (mode === 'unit-distance') {
      const pts = Array.from({ length: 8 }, (_, i) => polar((i / 8) * Math.PI * 2, 180));
      pts.forEach((p, i) => {
        circle(...p, 7, a, a, 0);
        for (let j = i + 1; j < pts.length; j++)
          if ((j - i) % 3 !== 0) line(...p, ...pts[j], c, 1, 0.6);
      });
    } else {
      for (let i = 0; i < 11; i++) {
        let d = '';
        for (let j = 0; j <= 30; j++) {
          const x = 300 + j * 13.3;
          const y = 330 + i * 30 + Math.sin((j / 30) * Math.PI * 2 + i * 0.25) * (i - 5) * 13;
          d += (j ? ' L' : 'M') + f(x) + ',' + f(y);
        }
        path(d, i % 2 ? c : a, 1.8, 'none', 0.65);
      }
    }
  } else if (/tree|proof|sorting|decision/.test(mode)) {
    if (mode === 'sorting-network') {
      for (let row = 0; row < 7; row++) {
        line(280, 340 + row * 45, 720, 340 + row * 45, c, 2, 0.4);
        for (let x = 0; x < 5; x++) {
          const next = (row + x + seed) % 7;
          line(320 + x * 80, 340 + row * 45, 320 + x * 80, 340 + next * 45, x % 2 ? a : c, 2, 0.5);
          circle(320 + x * 80, 340 + row * 45, 4, c, c, 0);
        }
      }
    } else tree(mode === 'evolution-tree' ? 5 : 4, 300, 450);
  } else if (/library|document|theorems|pages/.test(mode)) {
    const count = mode === 'ten-theorems' ? 10 : mode === 'collaboration-pages' ? 3 : 6;
    for (let i = 0; i < count; i++) {
      const x = 320 + (i % 5) * 78,
        y = 330 + Math.floor(i / 5) * 170;
      rect(x, y, 64, 135, c, '#10212b', 4, 2);
      for (let j = 0; j < 4; j++)
        line(
          x + 12,
          y + 30 + j * 20,
          x + 50 - ((j + seed) % 3) * 7,
          y + 30 + j * 20,
          j % 2 ? c : a,
          2,
          0.8,
        );
    }
  } else if (/face/.test(mode)) {
    path('M390 350 Q500 250 610 350 L640 480 Q620 610 500 670 Q380 610 360 480 Z', c, 3, '#0b1e2a');
    for (const p of [
      [430, 440],
      [570, 440],
      [500, 490],
      [455, 560],
      [545, 560],
      [500, 590],
    ])
      circle(...p, 6, a, a, 0);
    line(430, 440, 500, 490, c, 2);
    line(570, 440, 500, 490, c, 2);
    line(500, 490, 455, 560, c, 2);
    line(500, 490, 545, 560, c, 2);
  } else if (/vision|convolution|image-library|image-text/.test(mode)) {
    const count = mode === 'vision-stack' ? 5 : mode === 'image-library' ? 8 : 3;
    for (let i = 0; i < count; i++) {
      const x = 310 + (i % 4) * 100,
        y = 330 + Math.floor(i / 4) * 140;
      rect(x, y, 90, 120, c, '#0e202d', 4, 2);
      polygon(
        [
          [x + 10, y + 95],
          [x + 38, y + 50],
          [x + 59, y + 78],
          [x + 78, y + 38],
          [x + 80, y + 100],
        ],
        a,
        '#243f4b',
      );
      circle(x + 30, y + 25, 7, a, a, 0);
    }
    if (mode === 'digit-convolution') text('5', 500, 635, 95, c);
  } else if (/arcade|phone|computer|interface|code|api|protocol|assistant/.test(mode)) {
    const x = 300,
      y = 310,
      w = 400,
      h = 300;
    rect(x, y, w, h, c, '#0b1b29', 18, 3);
    line(x, y + 40, x + w, y + 40, c, 1, 0.6);
    for (let i = 0; i < 3; i++)
      circle(x + 25 + i * 22, y + 20, 4, i === 0 ? a : c, i === 0 ? a : c, 0);
    if (mode === 'arcade-screen') {
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 5; j++)
          rect(345 + j * 60, 380 + i * 32, 38, 14, i % 2 ? a : c, i % 2 ? a : c, 2, 0);
      rect(450, 565, 100, 10, light, light, 2, 0);
      circle(500, 525, 8, a, a, 0);
    } else if (mode === 'voice-phone') {
      rect(410, 355, 180, 230, c, 'none', 16, 3);
      wave(3, 22);
    } else {
      for (let i = 0; i < 6; i++) {
        const yy = 390 + i * 29;
        line(335, yy, 370 + random() * 245, yy, i % 3 ? a : c, 6, 0.7);
      }
      path('M355 410 L330 430 L355 450 M645 410 L670 430 L645 450', light, 4);
      if (/cloud|agent/.test(mode)) {
        circle(660, 610, 55, a, '#142632', 3);
        path('M635 615 L650 630 L685 590', a, 4);
      }
    }
    line(440, 610, 420, 660, c, 3);
    line(560, 610, 580, 660, c, 3);
    line(400, 660, 600, 660, c, 3);
  } else if (/robot|autonomous/.test(mode)) {
    if (mode === 'autonomous-route') {
      path('M300 660 C600 600 340 500 650 330', c, 30, 'none', 0.15);
      path('M300 660 C600 600 340 500 650 330', a, 3);
      rect(390, 440, 150, 80, c, '#17343e', 20, 3);
      circle(420, 525, 22, a, '#0c1721', 3);
      circle(520, 525, 22, a, '#0c1721', 3);
    } else {
      const pts =
        mode === 'robot-gripper'
          ? [
              [370, 650],
              [390, 520],
              [530, 480],
              [610, 380],
            ]
          : [
              [350, 650],
              [410, 510],
              [540, 430],
              [610, 320],
            ];
      pts.slice(0, -1).forEach((p, i) => {
        line(...p, ...pts[i + 1], c, 32, 0.35);
        line(...p, ...pts[i + 1], c, 3, 0.9);
        circle(...p, 22, a, '#132733', 3);
      });
      path('M610 320 L570 285 L550 320 M610 320 L650 285 L670 320', a, 5);
      rect(300, 660, 160, 26, c, c, 4, 0, 0.5);
    }
  } else if (/law|shield/.test(mode)) {
    if (mode === 'security-shield')
      path(
        'M500 300 L680 365 L650 560 Q600 655 500 700 Q400 655 350 560 L320 365 Z',
        c,
        4,
        '#102734',
      );
    else {
      line(500, 310, 500, 670, a, 5);
      line(340, 385, 660, 385, a, 4);
      for (const x of [360, 640]) {
        line(x, 385, x - 65, 525, c, 2);
        line(x, 385, x + 65, 525, c, 2);
        path(`M${x - 65} 525 Q${x} 610 ${x + 65} 525 Z`, c, 3, '#122d3b');
      }
      line(420, 670, 580, 670, a, 5);
    }
  } else if (/sound|voice|transcription|multimodal/.test(mode)) {
    if (mode === 'transcription') {
      wave(4, 40);
      for (let i = 0; i < 5; i++)
        line(340, 620 + i * 16, 660 - ((i + seed) % 4) * 30, 620 + i * 16, c, 3, 0.7);
    } else if (mode === 'multimodal-orbits') {
      orbit(4, 185);
      circle(500, 480, 60, a, 'none', 2);
      wave(3, 25);
    } else wave(7, 85);
  } else if (
    /attention|masked|memory|bottleneck|sequence|skip|vectors|layered|dynamic|text-transform/.test(
      mode,
    )
  ) {
    if (mode === 'attention') {
      matrix(7, 5);
      for (let i = 0; i < 7; i++) line(305 + i * 60, 300, 500, 270, a, 2, 0.4);
    } else if (mode === 'masked-tokens') {
      for (let i = 0; i < 7; i++) {
        rect(280 + i * 63, 440, 50, 74, c, i === 3 ? a : '#142e39', 6);
        if (i !== 3) text(['A', 'B', 'C', 'D', 'E', 'F', 'G'][i], 305 + i * 63, 485, 20, light);
      }
      network(3, 420, 2);
    } else if (mode === 'memory-cell') {
      for (let i = 0; i < 3; i++) {
        rect(290 + i * 150, 400, 120, 140, c, '#10232d', 12, 3);
        circle(350 + i * 150, 470, 22, a, 'none', 2);
        if (i < 2) line(410 + i * 150, 470, 440 + i * 150, 470, c, 3);
      }
      path('M300 390 V330 H680 V390', a, 2);
    } else if (mode === 'bottleneck') {
      polygon(
        [
          [290, 310],
          [490, 450],
          [490, 530],
          [290, 670],
        ],
        c,
        '#102934',
      );
      polygon(
        [
          [710, 310],
          [510, 450],
          [510, 530],
          [710, 670],
        ],
        a,
        '#242d30',
      );
      line(490, 490, 510, 490, light, 6);
    } else if (mode === 'word-vectors') {
      line(350, 620, 700, 620, c, 2);
      line(350, 620, 350, 300, c, 2);
      line(350, 620, 590, 350, a, 3);
      line(350, 620, 670, 460, c, 3);
      for (let i = 0; i < 14; i++)
        circle(400 + random() * 240, 340 + random() * 230, 5, i % 2 ? a : c, i % 2 ? a : c, 0);
    } else network(3 + (seed % 3), 440, 3 + (seed % 2));
  } else if (/sun|solar/.test(mode)) {
    circle(500, 480, 105, a, '#403325', 3);
    for (let i = 0; i < n + 16; i++) {
      const p = polar((i / (n + 16)) * Math.PI * 2, 122),
        q = polar((i / (n + 16)) * Math.PI * 2, 175 + (i % 3) * 12);
      line(...p, ...q, a, 3, 0.7);
    }
    if (mode === 'sun-moon') {
      circle(630, 390, 90, c, '#152735', 3);
      circle(660, 360, 70, '#0a111b', '#0a111b', 0);
    }
  } else if (/conversation|agent|team|dots|collaboration|subscription/.test(mode)) {
    if (mode === 'conversation') {
      rect(290, 330, 340, 145, c, '#102730', 30, 3);
      path('M350 475 L330 515 L410 475', c, 3, '#102730');
      rect(390, 515, 320, 130, a, '#242b30', 25, 3);
      for (let i = 0; i < 3; i++) circle(420 + i * 55, 400, 10, c, c, 0);
      for (let i = 0; i < 3; i++) circle(485 + i * 50, 580, 8, a, a, 0);
    } else orbit(mode === 'team-network' ? 8 : mode === 'dots-orchestra' ? 12 : n, 190);
  } else if (subject === 'image') {
    const rings = 6 + (seed % 8);
    for (let i = 0; i < rings; i++) {
      const side = 75 + i * 28;
      out.push(
        `<rect x="${f(500 - side / 2)}" y="${f(480 - side / 2)}" width="${side}" height="${side}" rx="${(i % 3) * 8}" transform="rotate(${f(i * (4 + (seed % 9)))} 500 480)" fill="none" stroke="${i % 2 ? c : a}" stroke-width="2" opacity="${f(0.35 + (i / rings) * 0.6)}"/>`,
      );
    }
  } else if (subject === 'video') {
    for (let i = 0; i < 4 + (seed % 3); i++) {
      const x = 290 + i * (45 + variation * 20),
        y = 330 + i * (15 + variation * 20);
      rect(x, y, 240, 280, i % 2 ? c : a, '#0d1d29', 10, 2, 0.7);
    }
    polygon(
      [
        [465, 430],
        [465, 565],
        [580, 497],
      ],
      c,
      '#183544',
    );
  } else if (brand === 'claude') {
    const steps = 9 + (seed % 9);
    for (let i = 0; i < steps; i++) {
      const y = 335 + i * 18;
      const length = 160 + Math.sin(i * 0.8 + seed) * 100;
      line(500 - length / 2, y, 500 + length / 2, y, c, 3, 0.5 + (i / steps) * 0.5);
    }
    circle(500, 480, 185, a, 'none', 1, 0.4);
    orbit(4 + (seed % 7), 130);
  } else if (brand === 'meta') {
    for (let i = 0; i < 4 + (seed % 5); i++) {
      let d = '';
      for (let j = 0; j <= 100; j++) {
        const t = (j / 100) * Math.PI * 2 + variation;
        const x = 500 + Math.cos(t) * (170 - i * 16);
        const y = 480 + Math.sin(t * 2) * (72 + i * 8 + variation * 24);
        d += (j ? ' L' : 'M') + f(x) + ',' + f(y);
      }
      path(d, i % 2 ? c : a, 2, 'none', 0.5 + i * 0.1);
    }
  } else if (brand === 'mistral') {
    wave(10, 85 + (seed % 35));
  } else if (brand === 'qwen') {
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const points = Array.from({ length: 5 + (seed % 3) }, (_, j) =>
        polar(
          angle + (j / (5 + (seed % 3))) * Math.PI * 2,
          80 + random() * 100,
          500 + Math.cos(angle) * 65,
          480 + Math.sin(angle) * 65,
        ),
      );
      polygon(points, i % 2 ? c : a, '#19273b', 0.75);
    }
  } else if (brand === 'deepseek') {
    wave(9, 100);
    path('M320 520 Q400 350 560 420 Q650 350 700 430 Q610 560 470 580 Z', c, 3, '#142f43');
  } else if (/astra/.test(mode)) {
    const pts = Array.from({ length: 11 }, () => [300 + random() * 400, 300 + random() * 340]);
    pts.forEach((p, i) => {
      circle(...p, 5 + (i % 3), c, c, 0);
      if (i) line(...pts[i - 1], ...p, c, 2, 0.7);
    });
  } else {
    orbit(n, 160 + (seed % 50));
    network(3 + (seed % 3), 300, 2);
  }
  return {
    mode,
    markup: out.join(''),
    geometryHash: hash(out.join('').replace(/<text\b[\s\S]*?<\/text>/g, '')),
  };
}

await mkdir(destination, { recursive: true });
const manifest = [];
for (const event of data.events) {
  const subject = historyArtworkSubject(event),
    brand = brandOf(event),
    c = palettes[brand ?? 'science'];
  const drawing = concept(event, subject, brand);
  const seed = parseInt(hash(event.id).slice(0, 6), 16);
  const decoration = Array.from({ length: 38 }, (_, i) => {
    const x = (seed * (i + 7) * 17) % 1000,
      y = (seed * (i + 3) * 31) % 850;
    return `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.8 : 0.8}" fill="${c}" opacity="${0.12 + (i % 4) * 0.08}"/>`;
  }).join('');
  const logo = brand && logos.get(brand);
  const labels = {
    chatgpt: '',
    'gpt-1': 'GPT-1',
    'gpt-2': 'GPT-2',
    'gpt-3-paper': 'GPT-3',
    'gpt-3-api': 'API',
    'gpt-4': 'GPT-4',
    'gpt-4o': '4o',
    'gpt-5': 'GPT-5',
    'gpt-5-4': '5.4',
    'gpt-5-5': '5.5',
    'gpt-5-6-sol': '5.6 SOL',
    'gpt-6-astra': 'ASTRA',
    'gpt-6-sol-luna': 'SOL / LUNA',
    'gpt-6-1-sol': '6.1 SOL',
    'claude-1': '',
    'claude-3': '3',
    'claude-3-5-sonnet': 'SONNET 3.5',
    'claude-3-7-code': '3.7 / CODE',
    'claude-4': '4',
    'claude-fable-mythos-5': 'FABLE 5',
    'claude-opus-5-5': 'OPUS 5.5',
    'claude-sonnet-5-5': 'SONNET 5.5',
    'claude-haiku-5-5': 'HAIKU 5.5',
    transformer: 'ATTENTION',
    lstm: 'M�MOIRE',
    'alphafold-2': 'PROT�INES',
    'alphafold-3': 'COMPLEXES',
    'navier-stokes-proposed-proof': 'FLUIDES',
    graphcast: 'M�T�O',
    'deep-blue-first-game': '�CHECS',
    'deep-blue-match': 'DEEP BLUE',
    'alphago-lee-sedol': 'GO',
    alphatensor: 'MATRICES',
    'cuda-1': 'CUDA 1.0',
    'mistral-7b': '7B',
    'mistral-3': '3',
    'mistral-large-4': 'LARGE 4',
    'mixtral-8x7b': '8�7B',
  };
  const label =
    labels[event.id] ?? (event.category === 'model' ? event.shortTitle.toUpperCase() : '');
  const words = label.split(' ');
  const titleLines = [];
  let titleLine = '';
  for (const word of words) {
    if ((titleLine + ' ' + word).trim().length > 18 && titleLine) {
      titleLines.push(titleLine);
      titleLine = word;
    } else titleLine = (titleLine + ' ' + word).trim();
  }
  if (titleLine) titleLines.push(titleLine);
  const widestLine = Math.max(
    1,
    ...titleLines.map((line) =>
      [...line].reduce(
        (width, char) =>
          width +
          (/[MW]/.test(char) ? 0.9 : char === ' ' ? 0.32 : /[I1.,/]/.test(char) ? 0.3 : 0.64),
        0,
      ),
    ),
  );
  const titleSize = Math.min(112, Math.floor(490 / widestLine));
  const titleMarkup = titleLines
    .map(
      (line, i) =>
        `<text x="500" y="${430 + i * (titleSize * 1.05)}" fill="${brand === 'nvidia' ? '#0b1018' : '#fcfcf4'}" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="700" letter-spacing="-3" text-anchor="middle">${escape(line)}</text>`,
    )
    .join('');

  const brandMarkup = logo
    ? `<svg x="350" y="245" width="300" height="${brand === 'openai' || brand === 'qwen' || brand === 'artificial' ? 110 : 70}" viewBox="${logo.viewBox}" fill="currentColor" color="${brand === 'nvidia' ? '#0b1018' : '#f3f2e9'}" preserveAspectRatio="xMidYMid meet">${logo.content}</svg>`
    : `<text x="500" y="285" fill="#b6c9cf" text-anchor="middle" font-family="Arial, sans-serif" font-size="${event.organization.length > 40 ? 14 : 19}">${escape(event.organization)}</text>`;
  const background = brand === 'nvidia' ? '#e9eee0' : '#080f18';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><title>${escape(event.shortTitle)}</title><desc>Affiche de concept éditoriale, ${escape(event.organization)}. Composition originale propre à ${escape(event.id)}.</desc><rect width="1000" height="1000" fill="${background}"/>${Array.from({ length: 18 }, (_, i) => `<circle cx="500" cy="450" r="${80 + i * 26}" fill="${c}" opacity=".025"/>`).join('')}<g opacity=".45">${decoration}</g><path d="M180 140 H820 M180 760 H820" stroke="${c}" stroke-opacity=".18"/><g id="concept" transform="translate(-225 -200) scale(1.45)" opacity=".72">${drawing.markup}</g>${brandMarkup}${titleMarkup}</svg>\n`;
  const file = event.id + '.svg';
  if (checkOnly) {
    if ((await readFile(resolve(destination, file), 'utf8')) !== svg)
      throw new Error('Affiche p�rim�e : ' + event.id);
  } else await writeFile(resolve(destination, file), svg);
  manifest.push({
    id: event.id,
    path: '/images/time-machine/events/' + file,
    subject,
    brand,
    mode: drawing.mode,
    geometryHash: drawing.geometryHash,
    sha256: hash(svg),
    bytes: Buffer.byteLength(svg),
    source: event.sources[0]?.url,
  });
}
if (new Set(manifest.map((x) => x.geometryHash)).size !== data.events.length) {
  const groups = Map.groupBy(manifest, (e) => e.geometryHash);
  console.log(
    [...groups.values()].filter((g) => g.length > 1).map((g) => g.map((e) => [e.id, e.mode])),
  );
  throw new Error('Deux compositions identiques');
}
const manifestPath = resolve(root, 'scripts/time-machine-artwork/artwork-manifest.json');
const manifestJson =
  JSON.stringify({ version: 2, generatedAt: '2026-10-16', events: manifest }, null, 2) + '\n';
if (checkOnly) {
  if ((await readFile(manifestPath, 'utf8')) !== manifestJson) throw new Error('Manifeste p�rim�');
} else await writeFile(manifestPath, manifestJson);
console.log(
  JSON.stringify({
    events: manifest.length,
    bytes: manifest.reduce((n, e) => n + e.bytes, 0),
    largest: Math.max(...manifest.map((e) => e.bytes)),
    brands: logos.size,
    geometryHashes: new Set(manifest.map((e) => e.geometryHash)).size,
  }),
);
