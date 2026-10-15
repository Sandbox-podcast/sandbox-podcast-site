import { OG_SIZE, OG_TYPE, timeMachineCard } from '@/lib/og';
import { timeMachineData } from '@/lib/time-machine';

export const alt = `Histoire de l'intelligence artificielle : Sandbox Time Machine, chronologie de ${timeMachineData().fromYear} à ${timeMachineData().toYear}`;
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return timeMachineCard(timeMachineData());
}
