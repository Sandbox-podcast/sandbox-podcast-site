'use client';

import { Text, useLocalization } from '@/components/localization';
import type { ChartPublication as Publication } from '@/domain/chart-publication';
import { intlLocale } from '@/i18n/translation';

export function ChartPublication({ publication }: { publication: Publication }) {
  const { locale } = useLocalization();
  const date = new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
  return (
    <div className="sc-publication">
      <dl>
        {(
          [
            ['Dernier relevé inclus', publication.observedAt],
            ['Calcul figé', publication.calculatedAt],
            ['Publication', publication.publishedAt],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt>
              <Text>{label}</Text>
            </dt>
            <dd>
              {value ? (
                <time dateTime={value}>{date.format(new Date(value))} UTC</time>
              ) : (
                <Text>{'Non publiée'}</Text>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p>
        <Text>{'Version du calcul'}</Text>
        {' : '}
        <code>{publication.scoringVersion}</code>
      </p>
    </div>
  );
}
