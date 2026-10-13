import type { ChartsEntity } from './sandbox-charts';

const githubOwnerPattern = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;
const providerOwners: Readonly<Record<string, string>> = {
  anthropic: 'anthropics',
  openai: 'openai',
  'google deepmind': 'google-deepmind',
  google: 'google',
  xai: 'xai-org',
  'moonshot ai': 'MoonshotAI',
  deepseek: 'deepseek-ai',
  'alibaba qwen': 'QwenLM',
  qwen: 'QwenLM',
  'z.ai': 'zai-org',
  minimax: 'MiniMax-AI',
  meta: 'facebook',
  'mistral ai': 'mistralai',
  ai2: 'allenai',
  microsoft: 'microsoft',
  nvidia: 'NVIDIA',
};

type LogoEntity = Pick<ChartsEntity, 'kind' | 'name' | 'org' | 'github' | 'links'>;

/** Identité déclarée du dépôt ou éditeur connu, jamais déduite du nom du modèle. */
export function chartLogoOwner(entity: LogoEntity): string | null {
  if (entity.kind === 'model') {
    const provider = entity.org?.trim().toLowerCase() ?? '';
    return Object.hasOwn(providerOwners, provider) ? (providerOwners[provider] ?? null) : null;
  }
  const owner = entity.github?.repo.split('/')[0];
  if (owner && githubOwnerPattern.test(owner)) return owner;
  for (const link of entity.links) {
    if (link.kind !== 'github') continue;
    const url = URL.parse(link.url);
    if (
      url?.protocol !== 'https:' ||
      url.hostname !== 'github.com' ||
      url.username ||
      url.password ||
      url.port
    )
      continue;
    const segments = url.pathname.split('/').filter(Boolean);
    const candidate = segments[0];
    if (segments.length >= 2 && candidate && githubOwnerPattern.test(candidate)) return candidate;
  }
  return null;
}

export function chartLogoUrl(entity: LogoEntity): string | null {
  const owner = chartLogoOwner(entity);
  return owner ? 'https://github.com/' + owner + '.png?size=80' : null;
}

export function chartLogoInitials(name: string): string {
  const parts = name
    .trim()
    .split(/[\s._/-]+/)
    .filter(Boolean);
  return parts.length > 1
    ? parts
        .slice(0, 2)
        .map((part) => Array.from(part)[0] ?? '')
        .join('')
        .toUpperCase()
    : Array.from(parts[0] ?? '?')
        .slice(0, 2)
        .join('')
        .toUpperCase();
}
