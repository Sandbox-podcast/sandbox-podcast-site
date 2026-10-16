import { z } from 'zod';

export const analyticsActionSchema = z
  .object({
    name: z.enum([
      'episode_play_requested',
      'episode_source_open',
      'episode_project_open',
      'project_episode_open',
      'discovery_open',
      'youtube_open',
      'experience_interaction',
    ]),
    episode_number: z.number().int().positive().max(100000).optional(),
    placement: z
      .enum(['home', 'charts', 'time-machine', 'podcast', 'episode', 'footer', 'guide'])
      .optional(),
    destination: z.enum(['charts', 'time-machine', 'podcast', 'projects']).optional(),
    action: z.enum(['tab', 'method', 'share', 'export']).optional(),
    resource_index: z.number().int().nonnegative().max(1000).optional(),
    project_slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80)
      .optional(),
  })
  .superRefine((event, ctx) => {
    if (
      [
        'episode_play_requested',
        'episode_source_open',
        'episode_project_open',
        'project_episode_open',
      ].includes(event.name) &&
      !event.episode_number
    )
      ctx.addIssue({ code: 'custom', message: 'Épisode absent.' });
    if (
      ['discovery_open', 'youtube_open', 'experience_interaction'].includes(event.name) &&
      !event.placement
    )
      ctx.addIssue({ code: 'custom', message: 'Emplacement absent.' });
    if (event.name === 'discovery_open' && !event.destination)
      ctx.addIssue({ code: 'custom', message: 'Destination absente.' });
    if (event.name === 'experience_interaction' && !event.action)
      ctx.addIssue({ code: 'custom', message: 'Action absente.' });
    if (event.name === 'episode_source_open' && event.resource_index === undefined)
      ctx.addIssue({ code: 'custom', message: 'Ressource absente.' });
    if (
      (event.name === 'episode_project_open' || event.name === 'project_episode_open') &&
      !event.project_slug
    )
      ctx.addIssue({ code: 'custom', message: 'Projet absent.' });
  });
export type AnalyticsAction = z.infer<typeof analyticsActionSchema>;

/** Liste fermée : ni texte de recherche, ni URL, ni contenu saisi ne passe au collecteur. */
export function analyticsActionFromDataset(dataset: Record<string, string | undefined>) {
  return analyticsActionSchema.safeParse({
    name: dataset['analyticsEvent'],
    episode_number: dataset['analyticsEpisode'] ? Number(dataset['analyticsEpisode']) : undefined,
    resource_index: dataset['analyticsResource'] ? Number(dataset['analyticsResource']) : undefined,
    project_slug: dataset['analyticsProject'],
    placement: dataset['analyticsPlacement'],
    destination: dataset['analyticsDestination'],
    action: dataset['analyticsAction'],
  });
}
