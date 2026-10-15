'use client';

import styles from '@/components/time-machine.module.css';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className={styles['empty']}>
      <h1>Le voyage attend un instant.</h1>
      <p>Les archives n'ont pas pu être chargées.</p>
      <button type="button" className={styles['primaryButton']} onClick={reset}>
        Réessayer
      </button>
    </section>
  );
}
