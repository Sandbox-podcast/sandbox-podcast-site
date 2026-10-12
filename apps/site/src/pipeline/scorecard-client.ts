import { z } from 'zod';

const repositoryNameSchema = z.string().regex(/^[\w.-]+\/[\w.-]+$/);
const scorecardResultSchema = z.object({
  date: z.iso.datetime(),
  repo: z.object({ name: z.string().min(1) }),
  score: z.number().min(-1).max(10),
  checks: z
    .array(
      z.object({
        name: z.string().min(1),
        score: z.number().int().min(-1).max(10),
      }),
    )
    .nullable(),
});

export const SECURITY_CHECKS = [
  'Code-Review',
  'Security-Policy',
  'Dangerous-Workflow',
  'Token-Permissions',
  'Pinned-Dependencies',
  'Vulnerabilities',
  'Signed-Releases',
  'Branch-Protection',
  'CI-Tests',
] as const;

export interface ScorecardResult {
  score: number;
  overallScore: number;
  checksUsed: number;
  checkScores: Record<string, number>;
  assessedOn: string;
}

/** Le chemin API est fixe; la seule partie variable est un nom GitHub validé. */
export class ScorecardClient {
  private readonly options: { fetch?: typeof fetch };

  constructor(options: { fetch?: typeof fetch } = {}) {
    this.options = options;
  }

  async repository(fullName: string): Promise<ScorecardResult | null> {
    const name = repositoryNameSchema.parse(fullName);
    const url = new URL(`https://api.scorecard.dev/projects/github.com/${name}`);
    const response = await (this.options.fetch ?? fetch)(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`OpenSSF Scorecard HTTP ${response.status.toString()}.`);
    const result = scorecardResultSchema.parse(await response.json());
    if (result.repo.name.toLowerCase() !== `github.com/${name.toLowerCase()}`)
      throw new Error(`Identité OpenSSF discordante pour ${name}.`);
    if (result.score < 0 || !result.checks) return null;
    const selected = new Set<string>(SECURITY_CHECKS);
    const checkScores: Record<string, number> = {};
    for (const check of result.checks) {
      if (!selected.has(check.name) || check.score < 0) continue;
      if (checkScores[check.name] !== undefined)
        throw new Error(`Contrôle OpenSSF dupliqué : ${check.name}.`);
      checkScores[check.name] = check.score;
    }
    const checksUsed = Object.keys(checkScores).length;
    if (checksUsed < 6) return null;
    const score =
      (Object.values(checkScores).reduce((sum, value) => sum + value, 0) +
        5 * (SECURITY_CHECKS.length - checksUsed)) /
      SECURITY_CHECKS.length;
    return {
      score: Math.round(score * 100) / 100,
      overallScore: result.score,
      checksUsed,
      checkScores,
      assessedOn: result.date.slice(0, 10),
    };
  }
}
