import { LocalizedElement } from './localization';
import styles from './discovery-home.module.css';

/** Les objets sont peints dans le décor ; seuls leurs liens sont superposés. */
export function StudioEasterEggs() {
  return (
    <div className={styles['studioEasterEggs']}>
      <LocalizedElement
        as="a"
        href="/charts"
        className={`${styles['studioObject']} ${styles['studioTelevision']}`}
        aria-label="Classements"
      />
      <LocalizedElement
        as="a"
        href="/time-machine"
        className={`${styles['studioObject']} ${styles['studioTimeMachine']}`}
        aria-label="Time Machine"
      />
    </div>
  );
}
