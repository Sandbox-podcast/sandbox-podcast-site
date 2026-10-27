import { z } from 'zod';
import { BADGE_CAMPAIGNS } from '../lib/badge-analytics.ts';

export const chartBadgeSchema = z.object({
  id: z.string(),
  label: z.string(),
  source: z.string().startsWith('/badges/'),
  campaign: z.enum(BADGE_CAMPAIGNS),
  snippets: z.object({
    image: z.url(),
    target: z.url(),
    alt: z.string(),
    markdown: z.string(),
    html: z.string(),
  }),
});
export const chartBadgesSchema = z.object({ badges: z.array(chartBadgeSchema) });
export type ChartBadge = z.infer<typeof chartBadgeSchema>;
