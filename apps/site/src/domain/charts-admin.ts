import { z } from 'zod';
import {
  chartCategorySchema,
  githubChartConfigSchema,
  trackingStatusSchema,
} from './github-charts.ts';
import { chartEditionSchema, snapshotEntrySchema, weekIdSchema } from './schema.ts';

export const chartsAdminWriteSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('repository'),
      id: z.string().min(1),
      status: trackingStatusSchema.nullable().optional(),
      category: chartCategorySchema.optional(),
      featured: z.boolean().optional(),
    })
    .strict(),
  z.object({ action: z.literal('config'), config: githubChartConfigSchema }).strict(),
  z
    .object({
      action: z.literal('job'),
      job: z.enum(['discover', 'collect', 'weekly', 'external-collect', 'external-weekly']),
      dryRun: z.boolean().default(false),
    })
    .strict(),
  z.object({ action: z.literal('publish'), week: weekIdSchema }).strict(),
  z
    .object({
      action: z.literal('editorial'),
      editionId: z.string().min(1),
      edition: chartEditionSchema,
      layer: z.enum(['draft', 'published']),
      expectedEtag: z.string().nullable(),
    })
    .strict(),
]);
export const chartsAdminResponseSchema = z.object({
  configured: z.boolean(),
  message: z.string().default(''),
  counts: z.record(z.string(), z.number()),
  snapshotsToday: z.number(),
  jobs: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      status: z.string(),
      startedAt: z.string(),
      finishedAt: z.string().nullable(),
      processed: z.number(),
      succeeded: z.number(),
      failed: z.number(),
      details: z.array(z.string()),
    }),
  ),
  repositories: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.string(),
      fullName: z.string(),
      category: z.string(),
      featured: z.boolean(),
      status: trackingStatusSchema,
      manual: z.boolean(),
      stars: z.number().nullable(),
      stars7d: z.number().nullable(),
      growth: z.number().nullable(),
      score: z.number().nullable(),
      language: z.string().nullable(),
      lastSync: z.string().nullable(),
      error: z.string().nullable(),
      insufficientHistory: z.boolean(),
    }),
  ),
  total: z.number(),
  page: z.number(),
  config: githubChartConfigSchema,
  editions: z.array(
    z.object({
      id: z.string(),
      week: z.string(),
      chart: z.string(),
      entries: z.number(),
      published: z.boolean(),
      version: z.string(),
    }),
  ),
  edition: z
    .object({
      id: z.string(),
      week: z.string(),
      chart: z.string(),
      published: z.boolean(),
      entries: z.array(
        snapshotEntrySchema.extend({
          name: z.string(),
          description: z.string(),
          category: z.string(),
        }),
      ),
      editorial: chartEditionSchema,
      etag: z.string().nullable(),
    })
    .nullable()
    .default(null),
});
export type ChartsAdminResponse = z.infer<typeof chartsAdminResponseSchema>;
