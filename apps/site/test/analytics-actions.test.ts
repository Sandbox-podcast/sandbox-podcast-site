import { describe, expect, it } from 'vitest';
import {
  analyticsActionSchema,
  analyticsActionFromDataset,
} from '../src/domain/analytics-actions.ts';

describe('actions de mesure utiles', () => {
  it('mesure une découverte ou un clic YouTube sans exiger un épisode inexistant', () => {
    const parsed = analyticsActionFromDataset({
      analyticsEvent: 'youtube_open',
      analyticsPlacement: 'footer',
      analyticsSearch: 'email@exemple.fr',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({ name: 'youtube_open', placement: 'footer' });
      expect(parsed.data).not.toHaveProperty('analyticsSearch');
    }
    expect(
      analyticsActionSchema.safeParse({
        name: 'discovery_open',
        placement: 'home',
        destination: 'charts',
      }).success,
    ).toBe(true);
    expect(
      analyticsActionSchema.safeParse({
        name: 'experience_interaction',
        placement: 'time-machine',
        action: 'share',
      }).success,
    ).toBe(true);
    for (const event of [
      { name: 'discovery_open', placement: 'home' },
      { name: 'youtube_open', placement: 'email@exemple.fr' },
      { name: 'experience_interaction', placement: 'charts', action: 'secret search' },
      { name: 'episode_play_requested' },
    ])
      expect(analyticsActionSchema.safeParse(event).success).toBe(false);
  });
  it('ne conserve que les identifiants nécessaires, sans URL ni texte libre', () => {
    expect(
      analyticsActionSchema.parse({
        name: 'episode_source_open',
        episode_number: 1,
        resource_index: 11,
        url: 'https://example.com/private?email=a@example.com',
        search: 'secret',
      }),
    ).toEqual({ name: 'episode_source_open', episode_number: 1, resource_index: 11 });
    expect(
      analyticsActionSchema.safeParse({ name: 'episode_play_requested', episode_number: 1 })
        .success,
    ).toBe(true);
    expect(
      analyticsActionSchema.safeParse({
        name: 'project_episode_open',
        episode_number: 1,
        project_slug: 'sillage',
      }).success,
    ).toBe(true);
  });
  it('refuse les événements inconnus, les ressources absentes et les identifiants invalides', () => {
    for (const event of [
      { name: 'email_entered', episode_number: 1 },
      { name: 'episode_source_open', episode_number: 1 },
      { name: 'project_episode_open', episode_number: 1 },
      { name: 'episode_play_requested', episode_number: NaN },
      { name: 'episode_project_open', episode_number: 1, project_slug: 'a@example.com' },
    ])
      expect(analyticsActionSchema.safeParse(event).success).toBe(false);
  });
});
