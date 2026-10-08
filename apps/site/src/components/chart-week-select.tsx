'use client';
import { Text, LocalizedElement, useLocalization } from '@/components/localization';
import { localizedHref } from '@/i18n/routing';
import { useRouter } from 'next/navigation';
import { shortWeek } from '@/domain/weeks';
interface Props {
  slug: string;
  selectedWeek: string;
  weeks: string[];
}
export function ChartWeekSelect({ slug, selectedWeek, weeks }: Props) {
  const router = useRouter();
  const { locale } = useLocalization();
  const latest = weeks[0];
  return (
    <label className="label flex items-center gap-2">
      <span>
        <Text>{'Voir la semaine'}</Text>
      </span>
      <LocalizedElement
        as="select"
        className="btn max-w-40 bg-paper text-ink"
        aria-label="Choisir une semaine de ce classement"
        value={selectedWeek}
        onChange={(event) => {
          const week = event.target.value;
          if (!weeks.includes(week)) return;
          router.push(
            localizedHref(week === latest ? `/charts/${slug}` : `/charts/${slug}/${week}`, locale),
          );
        }}
      >
        <Text>
          {weeks.map((week) => (
            <option value={week} key={week}>
              <Text>{shortWeek(week)}</Text>
              <Text>{week === latest ? ' · Actuel' : ''}</Text>
            </option>
          ))}
        </Text>
      </LocalizedElement>
    </label>
  );
}
