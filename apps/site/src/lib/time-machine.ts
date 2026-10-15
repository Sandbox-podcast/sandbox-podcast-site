import { cache } from 'react';
import source from '../../content/ai-history.json';
import { sortHistory, timeMachineDataSchema } from '../domain/time-machine.ts';

export const timeMachineData = cache(function timeMachineData() {
  const data = timeMachineDataSchema.parse(source);
  return { ...data, events: sortHistory(data.events) };
});
