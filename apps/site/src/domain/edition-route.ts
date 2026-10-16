import { editionIdSchema } from './schema.ts';
import { isCalendarEdition } from './weeks.ts';

/** Next peut conserver l'encodage d'un segment dynamique, notamment les deux-points UTC. */
export function editionFromRoute(raw: string): string | undefined {
  try {
    const parsed = editionIdSchema.safeParse(decodeURIComponent(raw));
    return parsed.success && (parsed.data.includes('-W') || isCalendarEdition(parsed.data))
      ? parsed.data
      : undefined;
  } catch {
    return undefined;
  }
}
