'use client';

import { useRouter } from 'next/navigation';
import { shortWeek } from '@/domain/weeks';

interface Props {
  slug: string;
  selectedWeek: string;
  weeks: string[];
}

export function ChartWeekSelect({ slug, selectedWeek, weeks }: Props) {
  const router = useRouter();
  const latest = weeks[0];
  return (
    <label className="label flex items-center gap-2">
      <span>Voir la semaine</span>
      <select
        className="btn max-w-40 bg-paper text-ink"
        aria-label="Choisir une semaine de ce classement"
        value={selectedWeek}
        onChange={(event) => {
          const week = event.target.value;
          if (!weeks.includes(week)) return;
          router.push(week === latest ? `/charts/${slug}` : `/charts/${slug}/${week}`);
        }}
      >
        {weeks.map((week) => (
          <option value={week} key={week}>
            {shortWeek(week)}
            {week === latest ? ' · Actuel' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
