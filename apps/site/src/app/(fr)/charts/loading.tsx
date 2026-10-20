import { Text } from '@/components/localization';
import styles from './loading.module.css';

export default function ChartsLoading() {
  return (
    <section className={`wrap ${styles['loading']}`} role="status" aria-busy="true">
      <p className={styles['brand']}>SANDBOX CHARTS</p>
      <p>
        <Text>Ouverture du classement…</Text>
      </p>
      <div className={styles['rows']} aria-hidden="true">
        <div />
        <div />
        <div />
        <div />
      </div>
    </section>
  );
}
