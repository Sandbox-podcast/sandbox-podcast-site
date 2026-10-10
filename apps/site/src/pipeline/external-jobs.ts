import { createHash } from 'node:crypto';
import { desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.ts';
import { chartsJobRuns } from '../db/schema.ts';
import {
  externalEntitySchema,
  externalObservationSchema,
  normalizeModelAlias,
  scoreModels,
  scoreSkills,
  slugifyExternalId,
  type ExternalEntity,
  type ExternalObservation,
  type ExternalProvider,
  type ModelScoreInput,
  type SkillScoreInput,
} from '../domain/external-charts.ts';
import { closestBaseline, utcDate, type DailyGithubSnapshot } from '../domain/github-charts.ts';
import { beginChartsJob, finishChartsJob, requireChartsDatabase } from '../lib/charts-store.ts';
import {
  externalCandidates,
  freezeExternalEdition,
  saveExternalBatch,
  type CompetitiveEditionEntry,
  type ExternalCandidate,
} from '../lib/external-charts-store.ts';
import { GithubClient } from './github-client.ts';
import {
  ARENA_CONFIGS,
  ArenaClient,
  HuggingFaceClient,
  OpenRouterClient,
  SkillsClient,
  type ArenaModelResult,
  type ArtificialAnalysisResult,
  type HuggingFaceModel,
  type OpenRouterModel,
  type SkillsItem,
} from './external-clients.ts';

export interface ExternalJobSummary {
  processed: number;
  succeeded: number;
  failed: number;
  snapshotsCreated: number;
  status: string;
  details: string[];
}
const emptySummary = (): ExternalJobSummary => ({
  processed: 0,
  succeeded: 0,
  failed: 0,
  snapshotsCreated: 0,
  status: 'success',
  details: [],
});

async function runLogged(
  kind: string,
  operation: (summary: ExternalJobSummary) => Promise<void>,
): Promise<ExternalJobSummary> {
  requireChartsDatabase();
  const id = await beginChartsJob(kind);
  if (!id) return { ...emptySummary(), status: 'skipped', details: ['Ce job est déjà en cours.'] };
  const summary = emptySummary();
  try {
    await operation(summary);
    if (summary.failed && summary.status === 'success') summary.status = 'partial';
  } catch (error) {
    summary.status = 'failed';
    summary.failed++;
    summary.details.push(error instanceof Error ? error.message : 'Collecte externe indisponible.');
  }
  await finishChartsJob(id, summary);
  return summary;
}

async function mapLimited<T, R>(
  values: readonly T[],
  limit: number,
  operation: (value: T) => Promise<R>,
): Promise<{ succeeded: R[]; failed: { value: T; error: string }[] }> {
  const succeeded: R[] = [];
  const failed: { value: T; error: string }[] = [];
  for (let offset = 0; offset < values.length; offset += limit) {
    const results = await Promise.allSettled(values.slice(offset, offset + limit).map(operation));
    results.forEach((result, index) => {
      const value = values[offset + index];
      if (result.status === 'fulfilled') succeeded.push(result.value);
      else if (value !== undefined)
        failed.push({
          value,
          error: result.reason instanceof Error ? result.reason.message : 'Source indisponible.',
        });
    });
  }
  return { succeeded, failed };
}

const githubRepoNameSchema = z.string().regex(/^[\w.-]+\/[\w.-]+$/);
const skillTopicGroups: Record<string, string[]> = {
  Coding: ['coding', 'code', 'programming', 'developer-tools', 'ai-coding'],
  Research: ['research', 'science', 'papers', 'academic'],
  Productivity: ['productivity', 'workflow', 'automation', 'agent'],
  Design: ['design', 'ui', 'ux', 'frontend', 'figma'],
  Marketing: ['marketing', 'seo', 'content', 'social-media'],
  Data: ['data', 'database', 'analytics', 'machine-learning'],
  DevOps: ['devops', 'infrastructure', 'deployment', 'cloud'],
  Browser: ['browser', 'web-scraping', 'playwright'],
};
function skillCategory(topics: readonly string[]): string {
  const normalized = new Set(topics.map((topic) => topic.toLowerCase()));
  return (
    Object.entries(skillTopicGroups).find(([, group]) =>
      group.some((topic) => normalized.has(topic)),
    )?.[0] ?? 'Productivity'
  );
}
function stableSlug(prefix: string, identity: string): string {
  const readable = slugifyExternalId(identity).slice(0, 78);
  const suffix = createHash('sha256').update(identity.toLowerCase()).digest('hex').slice(0, 8);
  return `${prefix}-${readable || 'item'}-${suffix}`;
}
function skillIdentity(skill: SkillsItem): string {
  return skill.id;
}
function sourceFor(
  entity: ExternalEntity,
  provider: ExternalProvider,
  externalId?: string,
): ExternalEntity['sources'][number] {
  const source = entity.sources.find(
    (item) =>
      item.provider === provider && (externalId === undefined || item.externalId === externalId),
  );
  if (!source) throw new Error(`Référence de source ${provider} absente pour ${entity.slug}.`);
  return source;
}

export async function collectSkills(oidcToken?: string): Promise<ExternalJobSummary> {
  return runLogged('skills_daily_sync', async (summary) => {
    const githubToken = process.env['GITHUB_TOKEN'];
    if (!githubToken) throw new Error('GITHUB_TOKEN requis pour croiser les Skills.sh et GitHub.');
    const client = new SkillsClient(oidcToken ? { token: oidcToken } : {});
    const pages = await Promise.all(
      (['all-time', 'trending'] as const).flatMap((view) =>
        [0, 1].map((page) => client.list(view, page)),
      ),
    );
    const skillsById = new Map<string, SkillsItem>();
    for (const skill of pages.flat()) skillsById.set(skill.id, skill);
    const skills = [...skillsById.values()];
    summary.processed = skills.length;
    const repositories = [
      ...new Set(
        skills.flatMap((skill) => {
          const parsed = githubRepoNameSchema.safeParse(skill.source);
          return parsed.success ? [parsed.data] : [];
        }),
      ),
    ];
    const github = new GithubClient({ token: githubToken });
    const repoResults = await mapLimited(repositories, 12, async (fullName) => ({
      fullName,
      repository: await github.repository(fullName),
    }));
    if (repoResults.failed.length) {
      summary.failed += repoResults.failed.length;
      summary.details.push(
        `${repoResults.failed.length.toString()} dépôts Skills.sh n’ont pas pu être lus sur GitHub.`,
      );
    }
    const repos = new Map(repoResults.succeeded.map((item) => [item.fullName, item.repository]));
    const now = new Date().toISOString();
    const day = utcDate(new Date(now));
    const entities: ExternalEntity[] = [];
    const observations: ExternalObservation[] = [];
    for (const skill of skills) {
      const repository = repos.get(skill.source);
      if (!repository || repository.archived || repository.fork || repository.disabled) continue;
      const entitySlug = stableSlug('skill', skillIdentity(skill));
      const githubUrl = `https://github.com/${repository.full_name}`;
      const entity = externalEntitySchema.parse({
        slug: entitySlug,
        type: 'skill',
        name: skill.name,
        organization: repository.owner.login,
        description: repository.description ?? `${skill.name} · compétence publiée sur Skills.sh.`,
        category: skillCategory(repository.topics),
        license: null,
        openWeights: null,
        sourceUrl: skill.url,
        websiteUrl: repository.homepage?.startsWith('https://') ? repository.homepage : null,
        sources: [
          { provider: 'skills-sh', externalId: skill.id, url: skill.url, label: 'Skills.sh' },
          { provider: 'github', externalId: repository.full_name, url: githubUrl, label: 'GitHub' },
        ],
      });
      entities.push(entity);
      const skillsSource = sourceFor(entity, 'skills-sh');
      const githubSource = sourceFor(entity, 'github');
      observations.push(
        externalObservationSchema.parse({
          entitySlug,
          source: skillsSource,
          observedOn: day,
          collectedAt: now,
          metrics: { installs: skill.installs },
        }),
        externalObservationSchema.parse({
          entitySlug,
          source: githubSource,
          observedOn: day,
          collectedAt: now,
          metrics: {
            stars: repository.stargazers_count,
            forks: repository.forks_count,
            pushedAt: repository.pushed_at,
            createdAt: repository.created_at,
            archived: repository.archived,
            fork: repository.fork,
            disabled: repository.disabled,
            topics: repository.topics,
          },
        }),
      );
    }
    summary.succeeded = entities.length;
    summary.snapshotsCreated = await saveExternalBatch(entities, observations);
    summary.details.push(
      `${entities.length.toString()} skills reliés à leurs dépôts GitHub; les deltas attendent sept jours de relevés.`,
    );
  });
}

interface ModelRecord {
  provider: ExternalProvider;
  externalId: string;
  url: string;
  label: string;
  name: string;
  organization: string | null;
  description: string | null;
  metrics: Record<string, unknown>;
}

function organizationForModel(identifier: string | null | undefined): string | null {
  if (!identifier) return null;
  const value = identifier.split('/')[0]?.trim();
  return value?.length ? value : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}
function numberAt(value: unknown, key: string): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return toNumber((value as Record<string, unknown>)[key]);
}
function hfLicense(model: HuggingFaceModel): string | null {
  return model.tags.find((tag) => tag.startsWith('license:'))?.slice('license:'.length) ?? null;
}
function hfGated(model: HuggingFaceModel): boolean {
  return model.gated === true || (typeof model.gated === 'string' && model.gated !== 'false');
}

function arenaKey(result: ArenaModelResult): string {
  return `${result.organization ?? 'unknown'}/${result.model_name}`;
}
function arenaModelRecords(rows: readonly ArenaModelResult[], day: string): ModelRecord[] {
  const grouped = new Map<
    string,
    { name: string; organization: string | null; metrics: Record<string, unknown> }
  >();
  for (const row of rows) {
    if (row.category && row.category.toLowerCase() !== 'overall') continue;
    const key = arenaKey(row);
    const current = grouped.get(key) ?? {
      name: row.model_name,
      organization: row.organization ?? null,
      metrics: {},
    };
    const votes = row.vote_count ?? row.observation_count ?? 0;
    const score = votes >= 1000 ? (row.rating ?? row.score) : undefined;
    if (score !== undefined) current.metrics[row.config] = score;
    if (row.rank !== undefined) current.metrics[`${row.config}Rank`] = row.rank;
    if (row.vote_count !== undefined || row.observation_count !== undefined)
      current.metrics[`${row.config}Votes`] = votes;
    if (row.observation_count !== undefined)
      current.metrics[`${row.config}Observations`] = row.observation_count;
    current.metrics[`${row.config}PublishedAt`] = row.leaderboard_publish_date ?? day;
    grouped.set(key, current);
  }
  return [...grouped].map(([externalId, value]) => ({
    provider: 'arena',
    externalId,
    url: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset',
    label: 'Arena via Hugging Face',
    name: value.name,
    organization: value.organization,
    description: null,
    metrics: value.metrics,
  }));
}

function huggingFaceRecord(model: HuggingFaceModel): ModelRecord {
  const license = hfLicense(model);
  return {
    provider: 'huggingface',
    externalId: model.id,
    url: `https://huggingface.co/${model.id}`,
    label: 'Hugging Face Hub',
    name: model.id.split('/').at(-1) ?? model.id,
    organization: model.author ?? organizationForModel(model.id),
    description: null,
    metrics: {
      downloads30d: model.downloads ?? null,
      downloadsAllTime: model.downloadsAllTime ?? null,
      likes: model.likes ?? null,
      gated: hfGated(model),
      license,
      pipeline: model.pipeline_tag ?? null,
      lastModified: model.lastModified ?? null,
      contextLength: null,
    },
  };
}

function openRouterRecords(models: readonly OpenRouterModel[]): ModelRecord[] {
  return models.map((model) => {
    const id = model.canonical_slug ?? model.id;
    return {
      provider: 'openrouter',
      externalId: id,
      url: `https://openrouter.ai/models/${id}`,
      label: 'OpenRouter',
      name: model.name,
      organization: organizationForModel(id),
      description: model.description ?? null,
      metrics: {
        promptPricePerMillion:
          toNumber(model.pricing?.prompt) === null
            ? null
            : (toNumber(model.pricing?.prompt) ?? 0) * 1_000_000,
        completionPricePerMillion:
          toNumber(model.pricing?.completion) === null
            ? null
            : (toNumber(model.pricing?.completion) ?? 0) * 1_000_000,
        contextLength: model.context_length ?? null,
        inputModalities: model.architecture?.input_modalities ?? [],
        outputModalities: model.architecture?.output_modalities ?? [],
        topWeeklyRank: model.topWeeklyRank,
        throughputRank: model.throughputRank,
      },
    };
  });
}

function artificialAnalysisRecords(rows: readonly ArtificialAnalysisResult[]): ModelRecord[] {
  return rows.map((row) => ({
    provider: 'artificial-analysis',
    externalId: row.model_permaslug,
    url: 'https://openrouter.ai/docs/api/api-reference/benchmarks/get-benchmarks',
    label: 'Artificial Analysis via OpenRouter',
    name: row.display_name ?? row.model_permaslug.split('/').at(-1) ?? row.model_permaslug,
    organization: organizationForModel(row.model_permaslug),
    description: null,
    metrics: {
      intelligenceIndex: row.intelligence_index ?? null,
      codingIndex: row.coding_index ?? null,
      agenticIndex: row.agentic_index ?? null,
    },
  }));
}

function canonicalOrganization(value: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeModelAlias(value);
  const aliases: Record<string, string> = {
    anthropic: 'anthropic',
    openai: 'openai',
    meta: 'meta',
    metallama: 'meta',
    metallamaorganization: 'meta',
    google: 'google',
    googledeepmind: 'google',
    deepmind: 'google',
    qwen: 'qwen',
    qwenai: 'qwen',
    alibaba: 'qwen',
    alibabagroup: 'qwen',
    mistral: 'mistral',
    mistralai: 'mistral',
    deepseek: 'deepseek',
    microsoft: 'microsoft',
    xai: 'xai',
    moonshot: 'moonshot',
    moonshotai: 'moonshot',
    zai: 'zai',
    zaiorg: 'zai',
  };
  return aliases[normalized] ?? normalized;
}

function mergeModelRecords(
  records: readonly ModelRecord[],
  day: string,
): {
  entities: ExternalEntity[];
  observations: ExternalObservation[];
  ambiguousMatches: number;
} {
  const byAlias = new Map<string, ModelRecord[]>();
  for (const record of records) {
    const alias = normalizeModelAlias(record.name.length > 0 ? record.name : record.externalId);
    if (!alias) continue;
    const group = byAlias.get(alias) ?? [];
    group.push(record);
    byAlias.set(alias, group);
  }
  const entities: ExternalEntity[] = [];
  const observations: ExternalObservation[] = [];
  let ambiguousMatches = 0;
  for (const [alias, group] of byAlias) {
    const byOrg = new Map<string, ModelRecord[]>();
    for (const record of group) {
      const org = canonicalOrganization(record.organization) ?? 'unknown';
      const items = byOrg.get(org) ?? [];
      items.push(record);
      byOrg.set(org, items);
    }
    const distinctOrganizations = byOrg.size > 1;
    for (const [org, organizationRecords] of byOrg) {
      const byProvider = new Map<ExternalProvider, ModelRecord[]>();
      for (const record of organizationRecords) {
        const items = byProvider.get(record.provider) ?? [];
        items.push(record);
        byProvider.set(record.provider, items);
      }
      const ambiguous = [...byProvider.values()].some((items) => items.length > 1);
      const partitions = ambiguous
        ? organizationRecords.map((record) => [record])
        : [organizationRecords];
      if (ambiguous) ambiguousMatches += organizationRecords.length;
      for (const partition of partitions) {
        const chosen = (provider: ExternalProvider) =>
          partition.find((item) => item.provider === provider);
        const hf = chosen('huggingface');
        const openRouter = chosen('openrouter');
        const arena = chosen('arena');
        const artificial = chosen('artificial-analysis');
        const main = arena ?? artificial ?? openRouter ?? hf ?? partition[0];
        if (!main) continue;
        const identity = ambiguous
          ? `${alias}-${main.provider}-${slugifyExternalId(main.externalId)}`
          : distinctOrganizations
            ? `${alias}-${slugifyExternalId(org)}`
            : alias;
        const slug = slugifyExternalId(identity);
        const sources = partition.map((record) => ({
          provider: record.provider,
          externalId: record.externalId,
          url: record.url,
          label: record.label,
        }));
        const license =
          hf && typeof hf.metrics['license'] === 'string' ? hf.metrics['license'] : null;
        const gated = hf ? hf.metrics['gated'] === true : null;
        const normalizedLicense = license?.toLowerCase() ?? null;
        const openWeights =
          !hf || gated === null
            ? null
            : gated
              ? false
              : normalizedLicense && OPEN_WEIGHT_LICENSES.has(normalizedLicense)
                ? true
                : null;
        const entity = externalEntitySchema.parse({
          slug,
          type: 'model',
          name: arena?.name ?? openRouter?.name ?? hf?.name ?? main.name,
          organization:
            arena?.organization ??
            hf?.organization ??
            openRouter?.organization ??
            main.organization,
          description: openRouter?.description ?? hf?.description ?? null,
          category: 'Models',
          license,
          openWeights,
          sourceUrl: hf?.url ?? openRouter?.url ?? arena?.url ?? main.url,
          websiteUrl: null,
          sources,
        });
        entities.push(entity);
        for (const record of partition) {
          observations.push(
            externalObservationSchema.parse({
              entitySlug: slug,
              source: sourceFor(entity, record.provider, record.externalId),
              observedOn: day,
              collectedAt: new Date().toISOString(),
              metrics: record.metrics,
            }),
          );
        }
      }
    }
  }
  const kept = new Map<string, ExternalEntity>();
  for (const entity of entities) {
    const current = kept.get(entity.slug);
    if (!current || entity.sources.length > current.sources.length) kept.set(entity.slug, entity);
  }
  const sourceKeys = new Set(
    [...kept.values()].flatMap((entity) =>
      entity.sources.map((source) =>
        JSON.stringify([entity.slug, source.provider, source.externalId]),
      ),
    ),
  );
  return {
    entities: [...kept.values()],
    observations: observations.filter((observation) =>
      sourceKeys.has(
        JSON.stringify([
          observation.entitySlug,
          observation.source.provider,
          observation.source.externalId,
        ]),
      ),
    ),
    ambiguousMatches,
  };
}

export async function collectModels(): Promise<ExternalJobSummary> {
  return runLogged('models_daily_sync', async (summary) => {
    const day = utcDate();
    const arenaClient = new ArenaClient();
    const [hfResult, arenaResults] = await Promise.all([
      new HuggingFaceClient().listModels(500),
      Promise.all(ARENA_CONFIGS.map((config) => arenaClient.latest(config))),
    ]);
    const records: ModelRecord[] = hfResult.map(huggingFaceRecord);
    records.push(...arenaModelRecords(arenaResults.flat(), day));
    summary.details.push(
      `${hfResult.length.toString()} modèles Hugging Face et ${arenaResults.flat().length.toString()} lignes Arena reçus.`,
    );

    const openRouterToken = process.env['OPENROUTER_API_KEY'];
    if (openRouterToken) {
      const client = new OpenRouterClient({ token: openRouterToken });
      const results = await Promise.allSettled([client.catalog(), client.artificialAnalysis()]);
      const catalog = results[0];
      const analysis = results[1];
      if (catalog.status === 'fulfilled') records.push(...openRouterRecords(catalog.value));
      else {
        summary.failed++;
        summary.details.push('La liste OpenRouter est indisponible.');
      }
      if (analysis.status === 'fulfilled')
        records.push(...artificialAnalysisRecords(analysis.value));
      else {
        summary.failed++;
        summary.details.push('Les indices Artificial Analysis via OpenRouter sont indisponibles.');
      }
    } else {
      summary.failed++;
      summary.details.push(
        'OPENROUTER_API_KEY absent : prix, contexte, débit et indices Artificial Analysis restent absents.',
      );
    }
    const merged = mergeModelRecords(records, day);
    if (merged.ambiguousMatches)
      summary.details.push(
        `${merged.ambiguousMatches.toString()} identités ambiguës sont restées séparées; aucun rapprochement approximatif n’a été fait.`,
      );
    summary.processed = records.length;
    summary.succeeded = merged.entities.length;
    summary.snapshotsCreated = await saveExternalBatch(merged.entities, merged.observations);
    summary.details.push(
      `${merged.entities.length.toString()} entités modèles enregistrées avec leurs références de source.`,
    );
  });
}

const OPEN_WEIGHT_LICENSES = new Set([
  'apache-2.0',
  'cc-by-4.0',
  'cc-by-sa-4.0',
  'llama2',
  'llama3.1',
  'llama3.2',
  'llama3.3',
  'llama4',
  'mit',
  'openrail',
  'openrail++',
]);

function candidateSource(candidate: ExternalCandidate, provider: ExternalProvider) {
  const matching = candidate.sources
    .filter((item) => item.ref.provider === provider)
    .flatMap((item) => item.snapshots.map((snapshot) => ({ source: item.ref, snapshot })))
    .toSorted((a, b) => a.snapshot.observedOn.localeCompare(b.snapshot.observedOn));
  return matching.at(-1);
}
function payloadNumber(payload: Record<string, unknown>, key: string): number | null {
  return toNumber(payload[key]);
}
function closestPayload(
  candidate: ExternalCandidate,
  provider: ExternalProvider,
  day: string,
  valueKey: string,
): { snapshotDate: string; value: number } | undefined {
  const source = candidate.sources.find((item) => item.ref.provider === provider);
  if (!source) return undefined;
  const snapshots: DailyGithubSnapshot[] = source.snapshots.map((snapshot) => ({
    projectId: source.ref.id,
    date: snapshot.observedOn,
    stars: payloadNumber(snapshot.payload, valueKey) ?? 0,
    forks: 0,
    watchers: null,
    openIssues: 0,
    contributors: null,
    commits: null,
    releases: null,
    pushedAt: null,
    collectedAt: snapshot.collectedAt,
  }));
  const baseline = closestBaseline(snapshots, day, 7, 1);
  const found = baseline?.stars;
  return baseline && found !== undefined
    ? { snapshotDate: baseline.date, value: found }
    : undefined;
}

function skillScoreInputs(
  candidates: readonly ExternalCandidate[],
  day: string,
): SkillScoreInput[] {
  return candidates.flatMap((candidate) => {
    const skillSnapshot = candidateSource(candidate, 'skills-sh');
    const githubSnapshot = candidateSource(candidate, 'github');
    if (
      !skillSnapshot ||
      !githubSnapshot ||
      skillSnapshot.snapshot.observedOn !== day ||
      githubSnapshot.snapshot.observedOn !== day
    )
      return [];
    const skillPayload = skillSnapshot.snapshot.payload;
    const githubPayload = githubSnapshot.snapshot.payload;
    if (
      githubPayload['archived'] === true ||
      githubPayload['fork'] === true ||
      githubPayload['disabled'] === true
    )
      return [];
    const installs = payloadNumber(skillPayload, 'installs');
    const stars = payloadNumber(githubPayload, 'stars');
    const forks = payloadNumber(githubPayload, 'forks');
    const pushedAt =
      typeof githubPayload['pushedAt'] === 'string' ? githubPayload['pushedAt'] : null;
    if (installs === null || stars === null || forks === null || !pushedAt) return [];
    const oldInstalls = closestPayload(candidate, 'skills-sh', day, 'installs');
    const oldStars = closestPayload(candidate, 'github', day, 'stars');
    if (!oldInstalls || !oldStars) return [];
    const ageDays = Math.max(0, (Date.parse(`${day}T00:00:00Z`) - Date.parse(pushedAt)) / 86400000);
    const sourceRefs = candidate.sources.map(({ ref }) => ({
      provider: ref.provider,
      externalId: ref.externalId,
      url: ref.url,
      label: ref.label,
    }));
    const entity = externalEntitySchema.parse({
      slug: candidate.entity.slug,
      type: 'skill',
      name: candidate.entity.name,
      organization: candidate.entity.organization,
      description: candidate.entity.description,
      category: candidate.entity.category,
      license: null,
      openWeights: null,
      sourceUrl: candidate.entity.sourceUrl,
      websiteUrl: candidate.entity.websiteUrl,
      sources: sourceRefs,
    });
    return [
      {
        entity,
        metrics: {
          installs,
          installs7d: installs - oldInstalls.value,
          stars,
          stars7d: stars - oldStars.value,
          forks,
          freshness: 100 * Math.exp(-ageDays / 30),
        },
        sourceObservedAt: [skillSnapshot.snapshot.collectedAt, githubSnapshot.snapshot.collectedAt],
      },
    ];
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function modelScoreInputs(
  candidates: readonly ExternalCandidate[],
  day: string,
): ModelScoreInput[] {
  return candidates.flatMap((candidate) => {
    const latest = new Map<
      ExternalProvider,
      {
        snapshot: (typeof candidate.sources)[number]['snapshots'][number];
        source: (typeof candidate.sources)[number]['ref'];
      }
    >();
    for (const { ref, snapshots } of candidate.sources) {
      const snapshot = snapshots.at(-1);
      if (snapshot?.observedOn === day)
        latest.set(ref.provider as ExternalProvider, { snapshot, source: ref });
    }
    const arena = latest.get('arena')?.snapshot.payload;
    const aa = latest.get('artificial-analysis')?.snapshot.payload;
    const hf = latest.get('huggingface')?.snapshot.payload;
    const openRouter = latest.get('openrouter')?.snapshot.payload;
    const qualityValuesExist =
      numberAt(arena, 'text_style_control') !== null || numberAt(aa, 'intelligenceIndex') !== null;
    if (!qualityValuesExist) return [];
    const sources = [...latest.values()].map(({ source }) => ({
      provider: source.provider as ExternalProvider,
      externalId: source.externalId,
      url: source.url,
      label: source.label,
    }));
    const license = typeof hf?.['license'] === 'string' ? hf['license'] : null;
    const entity = externalEntitySchema.parse({
      slug: candidate.entity.slug,
      type: 'model',
      name: candidate.entity.name,
      organization: candidate.entity.organization,
      description: candidate.entity.description,
      category: candidate.entity.category,
      license,
      openWeights: candidate.entity.openWeights,
      sourceUrl: candidate.entity.sourceUrl,
      websiteUrl: candidate.entity.websiteUrl,
      sources,
    });
    const sourceObservedAt = [...latest.values()].map(({ snapshot }) => snapshot.collectedAt);
    return [
      {
        entity,
        metrics: {
          arenaQuality: numberAt(arena, 'text_style_control'),
          artificialAnalysisIntelligence: numberAt(aa, 'intelligenceIndex'),
          arenaCoding: numberAt(arena, 'webdev'),
          artificialAnalysisCoding: numberAt(aa, 'codingIndex'),
          arenaAgent: numberAt(arena, 'agent'),
          artificialAnalysisAgentic: numberAt(aa, 'agenticIndex'),
          arenaVision: numberAt(arena, 'vision_style_control'),
          arenaSearch: numberAt(arena, 'search'),
          verifiedReasoning: {},
          verifiedMaths: {},
          downloads30d: payloadNumber(asRecord(hf), 'downloads30d'),
          likes: payloadNumber(asRecord(hf), 'likes'),
          openRouterWeeklyRank: payloadNumber(asRecord(openRouter), 'topWeeklyRank'),
          openRouterThroughputRank: payloadNumber(asRecord(openRouter), 'throughputRank'),
          contextLength: payloadNumber(asRecord(openRouter), 'contextLength'),
          promptPricePerMillion: payloadNumber(asRecord(openRouter), 'promptPricePerMillion'),
          completionPricePerMillion: payloadNumber(
            asRecord(openRouter),
            'completionPricePerMillion',
          ),
        },
        sourceObservedAt,
      },
    ];
  });
}

function editionEntries(
  ranked: ReturnType<typeof scoreSkills | typeof scoreModels>,
): CompetitiveEditionEntry[] {
  return ranked.map((entry) => ({
    slug: entry.entity.slug,
    identity: {
      name: entry.entity.name,
      organization: entry.entity.organization,
      sourceUrl: entry.entity.sourceUrl,
      license: entry.entity.license,
      openWeights: entry.entity.openWeights,
    },
    rank: entry.rank,
    score: entry.score,
    dimensions: entry.dimensions,
    metrics: entry.metrics,
    sourceObservedAt: entry.sourceObservedAt,
    sources: entry.entity.sources,
  }));
}

async function readyDailySources(today: string): Promise<{ skills: boolean; models: boolean }> {
  const jobs = await getDb()
    .select()
    .from(chartsJobRuns)
    .where(inArray(chartsJobRuns.kind, ['skills_daily_sync', 'models_daily_sync']))
    .orderBy(desc(chartsJobRuns.startedAt));
  const latestByKind = new Map<string, (typeof jobs)[number]>();
  for (const job of jobs) {
    if (!latestByKind.has(job.kind)) latestByKind.set(job.kind, job);
  }
  const ready = (kind: 'skills_daily_sync' | 'models_daily_sync') => {
    const current = latestByKind.get(kind);
    return Boolean(
      current?.finishedAt &&
      utcDate(new Date(current.finishedAt)) === today &&
      ['success', 'partial'].includes(current.status),
    );
  };
  return { skills: ready('skills_daily_sync'), models: ready('models_daily_sync') };
}

export async function freezeExternalCharts(
  options: {
    date?: string | undefined;
    dryRun?: boolean | undefined;
    publish?: boolean | undefined;
  } = {},
): Promise<ExternalJobSummary> {
  const date = z.iso.date().parse(options.date ?? utcDate());
  if (options.dryRun) {
    const summary = emptySummary();
    await calculateExternalWeek(date, options, summary);
    return summary;
  }
  return runLogged('external_weekly_ranking', (summary) =>
    calculateExternalWeek(date, options, summary),
  );
}

async function calculateExternalWeek(
  date: string,
  options: { dryRun?: boolean | undefined; publish?: boolean | undefined },
  summary: ExternalJobSummary,
): Promise<void> {
  if (date > utcDate()) throw new Error('Une édition future ne peut pas être calculée.');
  const ready = await readyDailySources(date);
  if (!ready.skills && !ready.models) {
    summary.status = 'skipped';
    summary.details.push(
      'Les collectes Skills.sh/GitHub et Models doivent être terminées le jour du gel.',
    );
    return;
  }
  const week = date;
  const [skillCandidates, modelCandidates] = await Promise.all([
    ready.skills ? externalCandidates('skill', date) : Promise.resolve([]),
    ready.models ? externalCandidates('model', date) : Promise.resolve([]),
  ]);
  const skills = scoreSkills(skillScoreInputs(skillCandidates, date), 20);
  const models = scoreModels(modelScoreInputs(modelCandidates, date), 20);
  summary.processed = skillCandidates.length + modelCandidates.length;
  summary.succeeded = skills.length + models.length;
  summary.details.push(
    `${skills.length.toString()} skills et ${models.length.toString()} modèles disposent de l’historique et des signaux requis.`,
  );
  if (options.dryRun) {
    const skillsShort = ready.skills && skills.length < 20;
    const modelsShort = ready.models && models.length < 20;
    summary.status = skillsShort || modelsShort ? 'insufficient_history' : 'success';
    summary.details.push('Simulation : aucune édition ni journal de job écrit.');
    return;
  }
  let written = 0;
  if (!ready.skills)
    summary.details.push('Collecte Skills absente ou en échec : aucune édition Skills.');
  else if (skills.length >= 20)
    written += await freezeExternalEdition(
      'skills',
      week,
      date,
      'skills-cross-source-v1',
      {
        size: 20,
        weights: { installs7d: 0.5, githubStars7d: 0.3, repositoryFreshness: 0.2 },
        minimumDays: 7,
      },
      editionEntries(skills),
      options.publish ?? true,
    );
  else summary.failed++;
  if (!ready.models)
    summary.details.push('Collecte Models absente ou en échec : aucune édition Models.');
  else if (models.length >= 20)
    written += await freezeExternalEdition(
      'models',
      week,
      date,
      'models-cross-source-v1',
      {
        size: 20,
        minimumQualityCandidates: 20,
        qualityWeights: { arenaText: 0.5, artificialAnalysis: 0.5 },
        valueWeights: { quality: 0.6, price: 0.4 },
      },
      editionEntries(models),
      options.publish ?? true,
    );
  else summary.failed++;
  summary.snapshotsCreated = written;
  if (summary.failed) summary.status = written ? 'partial' : 'insufficient_history';
}

export async function collectExternalCharts(oidcToken?: string): Promise<ExternalJobSummary> {
  const [skills, models] = await Promise.all([collectSkills(oidcToken), collectModels()]);
  return {
    processed: skills.processed + models.processed,
    succeeded: skills.succeeded + models.succeeded,
    failed: skills.failed + models.failed,
    snapshotsCreated: skills.snapshotsCreated + models.snapshotsCreated,
    status:
      skills.status === 'failed' && models.status === 'failed'
        ? 'failed'
        : skills.status !== 'success' || models.status !== 'success'
          ? 'partial'
          : 'success',
    details: [...skills.details, ...models.details].slice(0, 100),
  };
}
