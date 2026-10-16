import { historyEventAnchor, type TimeMachineData } from './time-machine';

/** Une ancre ne peut ouvrir qu'un événement ou une année réellement documentés. */
export function historySelectionFromHash(
  hash: string,
  data: TimeMachineData,
): { kind: 'event'; id: string } | { kind: 'year'; year: number } | undefined {
  const anchor = hash.replace(/^#/, '');
  const event = data.events.find((item) => historyEventAnchor(item.id) === anchor);
  if (event) return { kind: 'event', id: event.id };
  const match = /^wrapped-(\d{4})$/.exec(anchor);
  const year = Number(match?.[1]);
  if (match && data.events.some((item) => Number(item.date.slice(0, 4)) === year))
    return { kind: 'year', year };
  return undefined;
}
