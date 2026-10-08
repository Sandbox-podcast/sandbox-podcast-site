import { z } from 'zod';

export const chartSelectionSchema = z.object({
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
    ])
    .optional()
    .catch(undefined),
});
