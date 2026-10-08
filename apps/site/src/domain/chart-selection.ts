import { z } from 'zod';
import { weekIdSchema } from './schema.ts';
import { PROJECT_FILTERS, SKILL_FILTERS } from './sandbox-charts.ts';

export const chartSelectionSchema = z.object({
  chart: z.enum(['github', 'skills', 'models', 'rising']).optional().catch(undefined),
  week: weekIdSchema.optional().catch(undefined),
  filter: z
    .enum([...PROJECT_FILTERS, ...SKILL_FILTERS])
    .optional()
    .catch(undefined),
  period: z.enum(['week', 'month', 'quarter', 'all']).catch('week').default('week'),
  view: z
    .enum([
      'quality',
      'coding',
      'reasoning',
      'research',
      'agents',
      'image',
      'video',
      'open',
      'speed',
      'value',
      'maths',
      'multimodal',
      'longContext',
      'price',
      'reach',
    ])
    .optional()
    .catch(undefined),
});

export type ChartSelection = z.infer<typeof chartSelectionSchema>;

/** État partageable des filtres ; les autres paramètres de l'URL sont conservés. */
export function chartSelectionQuery(
  query: string,
  selection: Omit<ChartSelection, 'view'> & { view?: string | undefined },
): string {
  const params = new URLSearchParams(query);
  for (const key of ['chart', 'week', 'filter', 'period', 'view'] as const) {
    const value = selection[key];
    if (
      value === undefined ||
      (key === 'period' && value === 'week') ||
      (key === 'filter' && value === 'All') ||
      (key === 'view' && value === 'quality')
    )
      params.delete(key);
    else params.set(key, value);
  }
  return params.toString();
}

export function hasChartSelectionQuery(
  params: Record<string, string | string[] | undefined>,
): boolean {
  return ['chart', 'week', 'filter', 'period', 'view'].some((key) => params[key] !== undefined);
}
