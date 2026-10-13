'use client';

import Image from 'next/image';
import { useState } from 'react';
import { chartLogoInitials, chartLogoUrl } from '@/domain/chart-logos';
import type { ChartsEntity } from '@/domain/sandbox-charts';
import styles from './chart-logo.module.css';

export function ChartLogo({ entity }: { entity: ChartsEntity }) {
  const source = chartLogoUrl(entity);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <span className={styles['logo']} aria-hidden="true">
      <span>{chartLogoInitials(entity.name)}</span>
      {source && failedSource !== source ? (
        <Image
          src={source}
          width={40}
          height={40}
          sizes="40px"
          alt=""
          loading="lazy"
          onError={() => {
            setFailedSource(source);
          }}
        />
      ) : null}
    </span>
  );
}
